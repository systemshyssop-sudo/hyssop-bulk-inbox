"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Inbox,
  Megaphone,
  RefreshCw,
  Send,
  Settings,
  Users,
  X,
  Image as ImageIcon,
  Video,
  Minus,
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
  content: string | null;
  header: string | null;
  footer: string | null;
  category: string | null;
  quality: string | null;
};

function getParameterDefinitions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
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
    })
    .filter(Boolean);
}

const navigation = [
  {
    label: "Inbox",
    href: "/inbox",
    icon: Inbox,
  },
  {
    label: "Contacts",
    href: "/inbox/contacts",
    icon: Users,
  },
  {
    label: "Campaigns",
    href: "/inbox/campaigns",
    icon: Megaphone,
  },
  {
    label: "Templates",
    href: "/inbox/templates",
    icon: FileText,
  },
  {
    label: "Settings",
    href: "/inbox/settings",
    icon: Settings,
  },
];

export default function CampaignsPage() {
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [parameterValues, setParameterValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      setTemplatesLoading(true);
      setError("");

      const [sheetResponse, templateResponse] = await Promise.all([
        fetch("/api/google-sheets/current", {
          cache: "no-store",
        }),
        fetch("/api/templates/all", {
          cache: "no-store",
        }),
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
          fetch("/api/google-sheets/current", {
            cache: "no-store",
          }),
          fetch("/api/templates/all", {
            cache: "no-store",
          }),
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

  function handleTemplateChange(templateId: string) {
    const template = templates.find(
      (item) => item.id === templateId
    );

    setSelectedTemplateId(templateId);

    setParameterValues(
      getParameterDefinitions(
        template?.parameter_definitions
      ).map(() => "")
    );

    setShowPreview(true);
  }

  function getMediaInfo(template: Template | null) {
    const type = (template?.media_type ?? "").toLowerCase();

    if (type.includes("image")) {
      return {
        label: "Image",
        icon: ImageIcon,
      };
    }

    if (type.includes("video")) {
      return {
        label: "Video",
        icon: Video,
      };
    }

    return {
      label: "None",
      icon: Minus,
    };
  }

  const mediaInfo = getMediaInfo(selectedTemplate);
  const MediaIcon = mediaInfo.icon;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-gray-200 bg-white md:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 px-5 py-5">
            <div className="text-base font-semibold text-gray-900">
              Hyssop
            </div>

            <div className="text-xs text-gray-500">
              Bulk Inbox
            </div>
          </div>

          <nav className="flex-1 p-3">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/inbox/campaigns";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition ${
                      active
                        ? "bg-gray-100 font-medium text-gray-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>

      {/* Main */}
      <main className="min-h-screen px-4 py-6 pb-24 md:ml-56 md:px-8 md:py-8 md:pb-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
                Campaigns
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Create and send WhatsApp campaigns.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
              Loading campaign data...
            </div>
          ) : (
            <>
              {/* Recipients */}
              {sheet && (
                <section className="mb-8">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-gray-950">
                      Recipients
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Using contacts from the{" "}
                      <strong className="font-medium text-gray-700">
                        current
                      </strong>{" "}
                      Google Sheet tab.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <Users size={15} />
                        In current
                      </div>

                      <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
                        {sheet.total.toLocaleString()}
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                        <CheckCircle2 size={15} />
                        Valid
                      </div>

                      <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
                        {sheet.valid.toLocaleString()}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                        <AlertCircle size={15} />
                        Ignored
                      </div>

                      <div className="mt-2 text-2xl font-semibold tracking-tight text-gray-950">
                        {sheet.ignored.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Create Campaign */}
              <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 px-5 py-5 md:px-6">
                  <h2 className="text-base font-semibold text-gray-950">
                    Create campaign
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Choose a template, personalize it, and send it to
                    your current recipients.
                  </p>
                </div>

                <div className="space-y-6 p-5 md:p-6">
                  {/* Campaign Name */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-800">
                      Campaign name
                    </label>

                    <input
                      type="text"
                      value={campaignName}
                      onChange={(event) =>
                        setCampaignName(event.target.value)
                      }
                      placeholder="e.g. October Property Campaign"
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                    />
                  </div>

                  {/* Template */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-800">
                      Approved template
                    </label>

                    <div className="relative">
                      <select
                        value={selectedTemplateId}
                        onChange={(event) =>
                          handleTemplateChange(
                            event.target.value
                          )
                        }
                        disabled={
                          templatesLoading ||
                          templates.length === 0
                        }
                        className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option
                          value=""
                          className="bg-white text-gray-900"
                        >
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
                            className="bg-white text-gray-900"
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

                  {/* Template Preview */}
                  {selectedTemplate && showPreview && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50/60">
                      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText
                            size={15}
                            className="text-gray-500"
                          />

                          <span className="text-sm font-medium text-gray-800">
                            Template preview
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowPreview(false)}
                          className="rounded-md p-1.5 text-gray-400 transition hover:bg-white hover:text-gray-700"
                          aria-label="Close template preview"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {selectedTemplate.name}
                          </span>

                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                            Approved
                          </span>

                          <span className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-500">
                            {selectedTemplate.language.toUpperCase()}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-500">
                            <MediaIcon size={11} />
                            Media: {mediaInfo.label}
                          </span>
                        </div>

                        <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-4">
                          {selectedTemplate.header && (
                            <div className="mb-2 text-sm font-semibold text-gray-900">
                              {selectedTemplate.header}
                            </div>
                          )}

                          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                            {selectedTemplate.content ||
                              "No template content available."}
                          </p>

                          {selectedTemplate.footer && (
                            <div className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-400">
                              {selectedTemplate.footer}
                            </div>
                          )}
                        </div>

                        {selectedTemplate.quality && (
                          <div className="mt-3 text-[11px] text-gray-400">
                            Quality: {selectedTemplate.quality}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Reopen Preview */}
                  {selectedTemplate && !showPreview && (
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      <FileText size={14} />
                      Show template preview
                    </button>
                  )}

                  {/* Parameters */}
                  {selectedTemplate &&
                    parameterDefinitions.length > 0 && (
                      <div className="rounded-xl border border-gray-200 p-4 md:p-5">
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-gray-900">
                            Template parameters
                          </h3>

                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            These values will be used for every recipient
                            in this campaign.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {parameterDefinitions.map(
                            (definition, index) => (
                              <div key={`${definition}-${index}`}>
                                <label className="mb-2 block text-xs font-medium text-gray-700">
                                  {definition ||
                                    `Parameter ${index + 1}`}
                                </label>

                                <input
                                  type="text"
                                  value={
                                    parameterValues[index] || ""
                                  }
                                  onChange={(event) =>
                                    updateParameter(
                                      index,
                                      event.target.value
                                    )
                                  }
                                  placeholder={
                                    definition ||
                                    `Enter parameter ${index + 1}`
                                  }
                                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                                />
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Campaign Recipients */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-white p-2 shadow-sm">
                        <Send
                          size={16}
                          className="text-gray-600"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          Campaign recipients
                        </div>

                        <div className="mt-1 text-sm text-gray-600">
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

                  {/* Send */}
                  <div className="border-t border-gray-100 pt-5">
                    <button
                      type="button"
                      disabled={
                        !campaignName.trim() ||
                        !selectedTemplate ||
                        !sheet ||
                        sheet.valid === 0 ||
                        parameterDefinitions.some(
                          (_, index) =>
                            !parameterValues[index]?.trim()
                        )
                      }
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send size={16} />
                      Send campaign
                    </button>

                    <p className="mt-2 text-center text-[11px] text-gray-400">
                      {sheet
                        ? `${sheet.valid.toLocaleString()} valid recipients`
                        : "Recipients loading..."}
                    </p>
                  </div>
                </div>
              </section>

              {/* Recipient Preview */}
              {sheet && (
                <section className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <details>
                    <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Recipient preview
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          Showing the first{" "}
                          {Math.min(50, sheet.preview.length)} valid contacts
                          from the current sheet.
                        </div>
                      </div>

                      <ChevronDown
                        size={17}
                        className="text-gray-400"
                      />
                    </summary>

                    <div className="border-t border-gray-200">
                      <div className="max-h-[320px] overflow-y-auto">
                        {sheet.preview.length === 0 ? (
                          <div className="px-5 py-8 text-center text-sm text-gray-500">
                            No valid contacts available for preview.
                          </div>
                        ) : (
                          sheet.preview.map((contact, index) => (
                            <div
                              key={`${contact.phone_number}-${index}`}
                              className="flex items-center gap-4 border-b border-gray-100 px-5 py-3 last:border-b-0"
                            >
                              <div className="w-7 shrink-0 text-xs text-gray-400">
                                {index + 1}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-gray-900">
                                  {contact.name || "No name"}
                                </div>

                                <div className="mt-0.5 text-xs text-gray-500">
                                  {contact.phone_number}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </details>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">
        <div className="grid grid-cols-5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/inbox/campaigns";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                  active
                    ? "font-medium text-gray-900"
                    : "text-gray-500"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
