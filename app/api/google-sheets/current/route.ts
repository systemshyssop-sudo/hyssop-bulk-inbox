import { NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = "14IyETL132G93N1_wz_dsTUbNjLMt0x9neBHKuXVly3M";
const VALID_PHONE = /^254\d{9}$/;

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: "google-service-account.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "current!A:B",
    });

    const rows = response.data.values ?? [];
    const dataRows = rows.slice(1);

    let total = 0;
    let valid = 0;
    let ignored = 0;

    const preview: { name: string; phone_number: string }[] = [];

    for (const row of dataRows) {
      const name = String(row[0] ?? "").trim();
      const phone = String(row[1] ?? "").trim();

      if (!phone) continue;

      total++;

      if (!VALID_PHONE.test(phone)) {
        ignored++;
        continue;
      }

      valid++;

      if (preview.length < 50) {
        preview.push({
          name,
          phone_number: phone,
        });
      }
    }

    return NextResponse.json({
      success: true,
      sheet: "current",
      total,
      valid,
      ignored,
      preview,
    });
  } catch (error) {
    console.error("Google Sheets error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to read the current Google Sheet.",
      },
      { status: 500 }
    );
  }
}