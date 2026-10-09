import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GUPSHUP_API_URL = "https://api.gupshup.io/wa/api/v1/msg";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phone = String(
      body?.phone || body?.phone_number || ""
    ).trim();

    const message = String(body?.message || "").trim();

    const mediaUrl =
      String(body?.mediaUrl || "").trim() || null;

    const mediaType =
      String(body?.mediaType || "").trim() || null;

    const mediaName =
      String(body?.mediaName || "").trim() || null;

    const mediaMimeType =
      String(body?.mediaMimeType || "").trim() || null;

    const mediaSizeBytes =
      Number(body?.mediaSizeBytes) || null;

    const caption =
      String(body?.caption || message || "").trim() || null;

    if (!phone) {
      return NextResponse.json(
        {
          ok: false,
          message: "Missing phone number.",
        },
        { status: 400 }
      );
    }

    if (!message && !mediaUrl) {
      return NextResponse.json(
        {
          ok: false,
          message: "Message or media is required.",
        },
        { status: 400 }
      );
    }

    const gupshupApiKey = process.env.GUPSHUP_API_KEY;

    if (!gupshupApiKey) {
      console.error("GUPSHUP_API_KEY is missing.");

      return NextResponse.json(
        {
          ok: false,
          message: "Gupshup API configuration is missing.",
        },
        { status: 500 }
      );
    }

    const source =
      process.env.GUPSHUP_SOURCE || "254722779555";

    const appName =
      process.env.GUPSHUP_APP_NAME || "HyssopEvents";

    /*
     * Free-form text message
     */
    if (!mediaUrl) {
      const formData = new URLSearchParams();

      formData.append("channel", "whatsapp");
      formData.append("source", source);
      formData.append("destination", phone);
      formData.append("message", message);
      formData.append("src.name", appName);

      const gupshupResponse = await fetch(
        GUPSHUP_API_URL,
        {
          method: "POST",
          headers: {
            apikey: gupshupApiKey,
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        }
      );

      const responseText =
        await gupshupResponse.text();

      let gupshupResult: unknown = null;

      try {
        gupshupResult = JSON.parse(responseText);
      } catch {
        gupshupResult = responseText;
      }

      if (!gupshupResponse.ok) {
        console.error(
          "Gupshup send failed:",
          gupshupResult
        );

        return NextResponse.json(
          {
            ok: false,
            message: "Gupshup failed to send message.",
            error: gupshupResult,
          },
          { status: 502 }
        );
      }

      const resultObject =
        typeof gupshupResult === "object" &&
        gupshupResult !== null
          ? (gupshupResult as Record<string, unknown>)
          : {};

      const messageId =
        String(
          resultObject?.messageId ||
            resultObject?.message_id ||
            ""
        ).trim() || null;

      const { error: insertError } =
        await supabaseAdmin
          .from("messages")
          .insert({
            phone_number: phone,
            message_text: message || null,
            direction: "outgoing",
            status: "submitted",
            message_id: messageId,
            created_at: new Date().toISOString(),
            is_read: true,
            media_url: null,
            media_type: null,
            media_name: null,
            media_mime_type: null,
            media_size_bytes: null,
            caption: null,
          });

      if (insertError) {
        console.error(
          "Failed to save outgoing message:",
          insertError
        );

        return NextResponse.json(
          {
            ok: false,
            message:
              "Message was sent but could not be saved.",
            gupshup: gupshupResult,
          },
          { status: 500 }
        );
      }

      await supabaseAdmin
        .from("contacts")
        .upsert(
          {
            phone_number: phone,
            last_message_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict: "phone_number",
          }
        );

      return NextResponse.json({
        ok: true,
        message_id: messageId,
        phone,
        gupshup: gupshupResult,
      });
    }

    /*
     * Media message
     *
     * This keeps the current inbox attachment flow
     * compatible with the existing Gupshup setup.
     */
    const mediaPayload =
  mediaType === "image"
    ? {
        type: "image",
        originalUrl: mediaUrl,
        previewUrl: mediaUrl,
        ...(caption ? { caption } : {}),
      }
    : {
        type: "file",
        url: mediaUrl,
        filename: mediaName || "attachment",
        ...(caption ? { caption } : {}),
      };

    const formData = new URLSearchParams();

    formData.append("channel", "whatsapp");
    formData.append("source", source);
    formData.append("destination", phone);
    formData.append(
      "message",
      JSON.stringify(mediaPayload)
    );
    formData.append("src.name", appName);

    const gupshupResponse = await fetch(
      GUPSHUP_API_URL,
      {
        method: "POST",
        headers: {
          apikey: gupshupApiKey,
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    const responseText =
      await gupshupResponse.text();

    let gupshupResult: unknown = null;

    try {
      gupshupResult = JSON.parse(responseText);
    } catch {
      gupshupResult = responseText;
    }

    if (!gupshupResponse.ok) {
      console.error(
        "Gupshup media send failed:",
        gupshupResult
      );

      return NextResponse.json(
        {
          ok: false,
          message: "Gupshup failed to send media.",
          error: gupshupResult,
        },
        { status: 502 }
      );
    }

    const resultObject =
      typeof gupshupResult === "object" &&
      gupshupResult !== null
        ? (gupshupResult as Record<string, unknown>)
        : {};

    const messageId =
      String(
        resultObject?.messageId ||
          resultObject?.message_id ||
          ""
      ).trim() || null;

    const { error: insertError } =
      await supabaseAdmin
        .from("messages")
        .insert({
          phone_number: phone,
          message_text: message || null,
          direction: "outgoing",
          status: "submitted",
          message_id: messageId,
          created_at: new Date().toISOString(),
          is_read: true,
          media_url: mediaUrl,
          media_type: mediaType,
          media_name: mediaName,
          media_mime_type: mediaMimeType,
          media_size_bytes: mediaSizeBytes,
          caption,
        });

    if (insertError) {
      console.error(
        "Failed to save outgoing media message:",
        insertError
      );

      return NextResponse.json(
        {
          ok: false,
          message:
            "Media was sent but could not be saved.",
          gupshup: gupshupResult,
        },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("contacts")
      .upsert(
        {
          phone_number: phone,
          last_message_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "phone_number",
        }
      );

    return NextResponse.json({
      ok: true,
      message_id: messageId,
      phone,
      gupshup: gupshupResult,
    });
  } catch (error) {
    console.error(
      "Outbound message route error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to send WhatsApp message.",
      },
      { status: 500 }
    );
  }
}