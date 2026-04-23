"use client";

import { useState } from "react";

export default function BulkSendPage() {
  const [sheetId, setSheetId] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [language, setLanguage] = useState("en");
  const [param1, setParam1] = useState("");
  const [param2, setParam2] = useState("");
  const [param3, setParam3] = useState("");

  return (
    <main className="min-h-screen bg-[#020b2d] text-white px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Bulk Messaging</h1>
          <p className="mt-2 text-sm text-blue-100/70">
            Send approved WhatsApp templates to contacts from Google Sheets.
          </p>
        </div>

        <div className="space-y-6">
          {/* Source */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
            <h2 className="text-xl font-semibold">1. Message Source</h2>
            <p className="mt-1 text-sm text-blue-100/70">
              Enter the Google Sheet details that contain the contacts.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Google Sheet ID
                </label>
                <input
                  type="text"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="Enter Google Sheet ID"
                  className="w-full rounded-xl border border-white/10 bg-[#08153f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Sheet Tab Name
                </label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="e.g. Sheet1"
                  className="w-full rounded-xl border border-white/10 bg-[#08153f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>
            </div>
          </section>

          {/* Template */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
            <h2 className="text-xl font-semibold">2. Template</h2>
            <p className="mt-1 text-sm text-blue-100/70">
              Choose the approved WhatsApp template details.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Template Name / ID
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. event_invite_2"
                  className="w-full rounded-xl border border-white/10 bg-[#08153f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Language
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="en"
                  className="w-full rounded-xl border border-white/10 bg-[#08153f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>
            </div>
          </section>

          {/* Params */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
            <h2 className="text-xl font-semibold">3. Parameter Mapping</h2>
            <p className="mt-1 text-sm text-blue-100/70">
              Enter the Google Sheets column names to use for template
              variables.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Param 1 Column
                </label>
                <input
                  type="text"
                  value={param1}
                  onChange={(e) => setParam1(e.target.value)}
                  placeholder="e.g. name"
                  className="w-full rounded-xl border border-white/10 bg-[#08153f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Param 2 Column
                </label>
                <input
                  type="text"
                  value={param2}
                  onChange={(e) => setParam2(e.target.value)}
                  placeholder="e.g. project_interest"
                  className="w-full rounded-xl border border-white/10 bg-[#08153f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Param 3 Column
                </label>
                <input
                  type="text"
                  value={param3}
                  onChange={(e) => setParam3(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-white/10 bg-[#08153f] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
            <h2 className="text-xl font-semibold">4. Actions</h2>
            <p className="mt-1 text-sm text-blue-100/70">
              Preview and send will be wired in the next steps.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/15"
              >
                Preview Contacts
              </button>

              <button
                type="button"
                className="rounded-xl bg-[#00c27a] px-5 py-3 text-sm font-semibold text-[#021224] transition hover:opacity-90"
              >
                Send Bulk Messages
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}