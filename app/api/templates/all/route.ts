
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GUPSHUP_API_URL = "https://api.gupshup.io/wa/app";

function extractParameters(content: string | null): string[] {
  if (!content) return [];

  const matches = content.match(/\{\{\d+\}\}/g) ?? [];

  return [...new Set(matches)].sort((a, b) => {
    const aNumber = Number(a.replace(/\D/g, ""));
    const bNumber = Number(b.replace(/\D/g, ""));
    return aNumber - bNumber;
  });
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("templates")
      .select(
        "id, name, gupshup_template_id, language, parameter_definitions, media_type, media_url, active, content, header, footer, category, template_type, quality, gupshup_status, raw_data, created_at"
      )
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Templates fetch error:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Failed to load templates.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templates: data ?? [],
    });
  } catch (error) {
    console.error("Templates API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load templates.",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const apiKey = process.env.GUPSHUP_API_KEY;
    const appId = process.env.GUPSHUP_APP_ID;

    if (!apiKey || !appId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gupshup API configuration is missing. Add GUPSHUP_API_KEY and GUPSHUP_APP_ID to the server environment.",
        },
        { status: 500 }
      );
    }

    const allTemplates: Record<string, unknown>[] = [];
    let pageNo = 0;

    while (true) {
      const url = new URL(
        `${GUPSHUP_API_URL}/${encodeURIComponent(appId)}/template`
      );

      url.searchParams.set("pageNo", String(pageNo));
      url.searchParams.set("pageSize", "100");
      url.searchParams.set("templateStatus", "APPROVED");

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          apikey: apiKey,
        },
        cache: "no-store",
      });

      const text = await response.text();

      let result: {
        templates?: Record<string, unknown>[];
        message?: string;
        error?: string;
      };

      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          `Gupshup returned an invalid response (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.error ||
            `Gupshup template request failed (${response.status}).`
        );
      }

      const templates = Array.isArray(result.templates)
        ? result.templates
        : [];

      allTemplates.push(...templates);

      if (templates.length < 100) {
        break;
      }

      pageNo += 1;
    }

    const supabase = await createClient();

    /*
     * Gupshup is the source of truth.
     * Keep the IDs returned by Gupshup so we can remove
     * templates that no longer exist there.
     */
    const syncedTemplateIds = allTemplates
      .map((template) => String(template.id ?? ""))
      .filter(Boolean);

    let synced = 0;

    for (const template of allTemplates) {
      const templateId = String(template.id ?? "");

      if (!templateId) continue;

      const content =
        typeof template.content === "string"
          ? template.content
          : typeof template.data === "string"
            ? template.data
            : null;

      const parameters = extractParameters(content);

      const templateType = String(
        template.templateType ??
          template.template_type ??
          "TEXT"
      );

      const mediaType =
        templateType.toUpperCase() !== "TEXT"
          ? templateType.toLowerCase()
          : null;

      const { error } = await supabase
        .from("templates")
        .upsert(
          {
            name:
              template.elementName ??
              template.name ??
              `Template ${templateId}`,

            gupshup_template_id: templateId,

            language:
              template.languageCode ??
              template.language ??
              "en",

            parameter_definitions: parameters,

            media_type: mediaType,

            media_url:
              template.mediaUrl ??
              template.media_url ??
              null,

            active: true,

            content,

            header:
              template.header ??
              null,

            footer:
              template.footer ??
              null,

            category:
              template.category ??
              null,

            template_type: templateType,

            quality:
              template.quality ??
              null,

            gupshup_status:
              template.status ??
              "APPROVED",

            raw_data: template,
          },
          {
            onConflict: "gupshup_template_id",
          }
        );

      if (error) {
        console.error(
          "Template sync error:",
          templateId,
          error
        );
        continue;
      }

      synced += 1;
    }

    /*
     * Remove templates from Supabase that are no longer
     * returned by Gupshup as APPROVED.
     */
    const { data: existingTemplates, error: existingError } =
      await supabase
        .from("templates")
        .select("id, gupshup_template_id");

    if (existingError) {
      console.error(
        "Existing templates lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Templates were synced, but existing templates could not be checked for removal.",
        },
        { status: 500 }
      );
    }

    const staleTemplateIds = (existingTemplates ?? [])
  .filter(
    (template) =>
      !template.gupshup_template_id ||
      !syncedTemplateIds.includes(
        template.gupshup_template_id
      )
  )
  .map((template) => template.id);

    let removed = 0;

    if (staleTemplateIds.length > 0) {
  const { error: deactivateError } = await supabase
    .from("templates")
    .update({
      active: false,
      gupshup_status: "REMOVED",
    })
    .in("id", staleTemplateIds);

  if (deactivateError) {
    console.error(
      "Stale templates deactivation error:",
      deactivateError
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Templates were synced, but old templates could not be deactivated.",
        synced,
      },
      { status: 500 }
    );
  }

  removed = staleTemplateIds.length;
}

    return NextResponse.json({
      success: true,
      total: allTemplates.length,
      synced,
      removed,
      message: `${synced} approved templates synced from Gupshup${
        removed > 0
          ? ` and ${removed} old template${removed === 1 ? "" : "s"} removed.`
          : "."
      }`,
    });
  } catch (error) {
    console.error("Gupshup template sync error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to sync templates from Gupshup.",
      },
      { status: 500 }
    );
  }
}
