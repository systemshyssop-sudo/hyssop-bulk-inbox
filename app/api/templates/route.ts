import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("templates")
      .select(
        "id, name, gupshup_template_id, language, parameter_definitions, media_type, media_url, active"
      )
      .eq("active", true)
      .order("name", { ascending: true });

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