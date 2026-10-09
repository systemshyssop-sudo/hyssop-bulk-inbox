"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";

type Contact = {
  name: string;
  phone_number: string;
};

type SheetData = {
  success: boolean;
  sheet: string;
  total: number;
  valid: number;
  ignored: number;
  preview: Contact[];
};

type Template = {
  id: string;
  name: string;
  gupshup_template_id: string;
  language: string;
  parameter_definitions: unknown;
  media_type: string | null;
  media_url: string | null;
  active: boolean;
};

function getParameterDefinitions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (typeof item === "string") return item;

    if (
      item &&
      typeof item === "object" &&
      "name" in item &&
      typeof item.name === "string"
    ) {
      return item.name;
    }

    if (
      item &&
      typeof item === "object" &&
      "label" in item &&
      typeof item.label === "string"
    ) {
      return item.label;
    }

    return "";
  });
}

export default function BulkSendPage() {
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [parameterValues, setParameterValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [sheetResponse, templateResponse] = await Promise.all([
        fetch("/api/google-sheets/current", { cache: "no-store" }),
        fetch("/api/templates", { cache: "no-store" }),
      ]);

      const sheetResult = await sheetResponse.json();
      const templateResult = await templateResponse.json();

      if (!sheetResponse.ok || !sheetResult.success) {
        throw new Error(
          sheetResult.message || "Failed to load current recipients."
        );
      }

      if (!templateResponse.ok || !templateResult.success) {
        throw new Error(
          templateResult.message || "Failed to load templates."
        );
      }

      const loadedTemplates = templateResult.templates ?? [];

      setSheet(sheetResult);
      setTemplates(loadedTemplates);

      if (!selectedTemplateId && loadedTemplates.length > 0) {
        setSelectedTemplateId(loadedTemplates[0].id);

        setParameterValues(
          getParameterDefinitions(
            loadedTemplates[0].parameter_definitions
          ).map(() => "")
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load campaign data."
      );
    } finally {
      setLoading(false);
      setTemplatesLoading(false);
    }
  }

  useEffect(() => {
  let cancelled = false;

  async function initialize() {
    try {
      const [sheetResponse, templateResponse] = await Promise.all([
        fetch("/api/google-sheets/current", { cache: "no-store" }),
        fetch("/api/templates", { cache: "no-store" }),
      ]);

      const sheetResult = await sheetResponse.json();
      const templateResult = await templateResponse.json();

      if (!sheetResponse.ok || !sheetResult.success) {
        throw new Error(
          sheetResult.message || "Failed to load current recipients."
        );
      }

      if (!templateResponse.ok || !templateResult.success) {
        throw new Error(
          templateResult.message || "Failed to load templates."
        );
      }

      if (cancelled) return;

      const loadedTemplates = templateResult.templates ?? [];

      setSheet(sheetResult);
      setTemplates(loadedTemplates);

      if (loadedTemplates.length > 0) {
        const firstTemplate = loadedTemplates[0];

        setSelectedTemplateId(firstTemplate.id);

        setParameterValues(
          getParameterDefinitions(
            firstTemplate.parameter_definitions
          ).map(() => "")
        );
      }
    } catch (err) {
      if (cancelled) return;

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load campaign data."
      );
    } finally {
      if (!cancelled) {
        setLoading(false);
        setTemplatesLoading(false);
      }
    }
  }

  initialize();

  return () => {
    cancelled = true;
  };
}, []);

  const selectedTemplate = useMemo(
    () =>
      templates.find(
        (template) => template.id === selectedTemplateId
      ) ?? null,
    [templates, selectedTemplateId]
  );

  const parameterDefinitions = useMemo(
    () =>
      getParameterDefinitions(
        selectedTemplate?.parameter_definitions
      ),
    [selectedTemplate]
  );

  function updateParameter(index: number, value: string) {
    setParameterValues((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Campaigns
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Campaign recipients always come from the{" "}
              <strong>current</strong> Google Sheet tab.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
            Loading current recipients...
          </div>
        ) : (
          <>
            {sheet && (
              <>
                <section className="mb-6">
                  <div className="mb-3">
                    <h2 className="text-base font-semibold text-gray-900">
                      Current recipients
                    </h2>

                    <p className="text-sm text-gray-500">
                      Only the <strong>current</strong> tab is used.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users size={16} />
                        In current
                      </div>

                      <div className="mt-2 text-2xl font-semibold text-gray-900">
                        {sheet.total.toLocaleString()}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle2 size={16} />
                        Valid
                      </div>

                      <div className="mt-2 text-2xl font-semibold text-gray-900">
                        {sheet.valid.toLocaleString()}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <AlertCircle size={16} />
                        Ignored
                      </div>

                      <div className="mt-2 text-2xl font-semibold text-gray-900">
                        {sheet.ignored.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mb-8 overflow-hidden rounded-xl border border-gray-200">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <div className="font-medium text-gray-900">
                      Recipient preview
                    </div>

                    <div className="text-xs text-gray-500">
                      First{" "}
                      {Math.min(50, sheet.preview.length)} valid contacts
                    </div>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {sheet.preview.map((contact, index) => (
                      <div
                        key={`${contact.phone_number}-${index}`}
                        className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
                      >
                        <span className="w-8 shrink-0 text-xs text-gray-400">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {contact.name || "No name"}
                          </div>

                          <div className="truncate text-sm text-gray-500">
                            {contact.phone_number}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <section className="rounded-xl border border-gray-200 p-5 md:p-6">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-gray-900">
                  Create campaign
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Choose an approved WhatsApp template and prepare the
                  campaign.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Campaign name
                  </label>

                  <input
                    value={campaignName}
                    onChange={(event) =>
                      setCampaignName(event.target.value)
                    }
                    placeholder="e.g. October Property Campaign"
                    className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-gray-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Approved template
                  </label>

                  <div className="relative">
                    <select
                      value={selectedTemplateId}
                      onChange={(event) => {
                        const templateId = event.target.value;

                        const template = templates.find(
                          (item) => item.id === templateId
                        );

                        setSelectedTemplateId(templateId);

                        setParameterValues(
                          getParameterDefinitions(
                            template?.parameter_definitions
                          ).map(() => "")
                        );
                      }}
                      disabled={
                        templatesLoading ||
                        templates.length === 0
                      }
                      className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-10 text-sm outline-none focus:border-gray-500"
                    >
                      <option value="">
                        {templatesLoading
                          ? "Loading templates..."
                          : templates.length === 0
                            ? "No active templates"
                            : "Select a template"}
                      </option>

                      {templates.map((template) => (
                        <option
                          key={template.id}
                          value={template.id}
                        >
                          {template.name} ({template.language})
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-3.5 text-gray-400"
                    />
                  </div>
                </div>

                {selectedTemplate &&
                  parameterDefinitions.length > 0 && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">
                          Template parameters
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          These values will be used for every recipient
                          in this campaign.
                        </p>
                      </div>

                      {parameterDefinitions.map(
                        (definition, index) => (
                          <div
                            key={`${definition}-${index}`}
                          >
                            <label className="mb-2 block text-sm text-gray-700">
                              {definition ||
                                `Parameter ${index + 1}`}
                            </label>

                            <input
                              value={
                                parameterValues[index] || ""
                              }
                              onChange={(event) =>
                                updateParameter(
                                  index,
                                  event.target.value
                                )
                              }
                              className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-gray-500"
                            />
                          </div>
                        )
                      )}
                    </div>
                  )}

                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  <div className="flex items-start gap-3">
                    <Send
                      size={17}
                      className="mt-0.5 shrink-0 text-gray-500"
                    />

                    <div>
                      <div className="font-medium text-gray-900">
                        Campaign recipients
                      </div>

                      <div className="mt-1">
                        {sheet
                          ? `${sheet.valid.toLocaleString()} valid numbers from current`
                          : "Loading recipients..."}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        Invalid numbers are automatically excluded.
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    !campaignName.trim() ||
                    !selectedTemplate ||
                    !sheet ||
                    sheet.valid === 0
                  }
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={16} />
                  Review Campaign
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}