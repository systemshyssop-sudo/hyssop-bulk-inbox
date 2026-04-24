import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await fetch(
      "https://hyssop.app.n8n.cloud/webhook/bulk-send-preview",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Bulk preview proxy error:", error);
    return NextResponse.json(
      { ok: false, message: "Preview proxy request failed." },
      { status: 500 }
    );
  }
}