"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  FileText,
  RefreshCw,
  Inbox,
  Users,
  Megaphone,
  Settings,
  Loader2,
  Image as ImageIcon,
  Video,
  Minus,
} from "lucide-react";
import Link from "next/link";

type Template = {
  id: string;
  name: string;
  gupshup_template_id: string | null;
  language: string | null;
  content: string | null;
  header: string | null;
  footer: string | null;
  category: string | null;
  template_type: string | null;
  quality: string | null;
  gupshup_status: string | null;
  active: boolean;
  created_at: string;
  parameter_definitions: unknown;
  media_type: string | null;
  media_url: string | null;
};

const navigation = [
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Contacts", href: "/inbox/contacts", icon: Users },
  { label: "Campaigns", href: "/inbox/campaigns", icon: Megaphone },
  { label: "Templates", href: "/inbox/templates", icon: FileText },
  { label: "Settings", href: "/inbox/settings", icon: Settings },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const response = await fetch("/api/templates/all");
        const data = await response.json();

        if (cancelled) return;

        if (data.success) {
          setTemplates(
  (data.templates ?? []).sort(
    (a: Template, b: Template) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
);
        } else {
          setError(data.message ?? "Failed to load templates.");
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load templates.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  async function syncFromGupshup() {
    setSyncing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/templates/all", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message ?? "Failed to sync templates.");
      }

      const refreshedResponse = await fetch("/api/templates/all");
      const refreshedData = await refreshedResponse.json();

      if (!refreshedResponse.ok || !refreshedData.success) {
        throw new Error("Templates synced, but failed to reload them.");
      }

      setTemplates(
  (refreshedData.templates ?? []).sort(
    (a: Template, b: Template) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
);

      const syncedCount = data.synced ?? 0;

      setMessage(
        `Synced ${syncedCount} approved template${
          syncedCount === 1 ? "" : "s"
        } from Gupshup.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sync templates."
      );
    } finally {
      setSyncing(false);
    }
  }

  function getParameters(template: Template): string[] {
    if (Array.isArray(template.parameter_definitions)) {
      return template.parameter_definitions.map((item) => String(item));
    }

    if (
      template.parameter_definitions &&
      typeof template.parameter_definitions === "object"
    ) {
      return Object.values(
        template.parameter_definitions as Record<string, unknown>
      ).map((item) => String(item));
    }

    const content = template.content ?? "";
    const matches = content.match(/\{\{\d+\}\}/g);

    return matches ? Array.from(new Set(matches)) : [];
  }

  function getMediaType(template: Template) {
    const type = (template.media_type ?? "").toLowerCase();

    if (type.includes("video")) {
      return {
        label: "Video",
        icon: Video,
      };
    }

    if (type.includes("image") || type.includes("img")) {
      return {
        label: "Image",
        icon: ImageIcon,
      };
    }

    return {
      label: "None",
      icon: Minus,
    };
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-56 border-r border-slate-200 bg-white md:block">
        <div className="border-b border-slate-200 px-5 py-5">
          <div className="text-lg font-semibold tracking-tight">Hyssop</div>
          <div className="text-sm text-slate-500">Bulk Inbox</div>
        </div>

        <nav className="space-y-1 p-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/inbox/templates";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={17} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="min-h-screen md:ml-56">
        <div className="mx-auto max-w-7xl px-5 py-8 pb-24 md:px-8 lg:px-10">
          {/* Header */}
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                Templates
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Approved WhatsApp templates ready for campaigns.
              </p>
            </div>

            <button
              type="button"
              onClick={syncFromGupshup}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}

              {syncing ? "Syncing..." : "Sync from Gupshup"}
            </button>
          </div>

          {/* Messages */}
          {message && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 size={16} />
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Templates container */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40">
            {/* Section header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Approved templates
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {templates.length} template
                  {templates.length === 1 ? "" : "s"} available
                </p>
              </div>

              <div className="text-xs text-slate-400">
                Gupshup source
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex min-h-56 items-center justify-center bg-white">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                  Loading templates...
                </div>
              </div>
            ) : templates.length === 0 ? (
              /* Empty */
              <div className="flex min-h-56 flex-col items-center justify-center bg-white px-6 text-center">
                <div className="mb-3 rounded-full bg-slate-100 p-3">
                  <FileText size={21} className="text-slate-400" />
                </div>

                <p className="text-sm font-medium text-slate-700">
                  No approved templates yet
                </p>

                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                  Create and approve your WhatsApp templates in Gupshup, then
                  sync them here.
                </p>
              </div>
            ) : (
              /* Cards */
              <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
                {templates.map((template) => {
                  const parameters = getParameters(template);
                  const media = getMediaType(template);
                  const MediaIcon = media.icon;

                  return (
                    <div
                      key={template.id}
                      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-slate-900">
                            {template.name}
                          </h3>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {template.language && (
                              <span className="uppercase">
                                {template.language}
                              </span>
                            )}

                            {template.category && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span>{template.category}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
                          <CheckCircle2 size={11} />
                          Approved
                        </span>
                      </div>

                      {/* Header */}
                      {template.header && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Header
                          </p>

                          <p className="mt-0.5 truncate text-xs font-medium text-slate-700">
                            {template.header}
                          </p>
                        </div>
                      )}

                      {/* Message preview */}
                      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-3">
                        <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-slate-600">
                          {template.content ||
                            "No content preview available."}
                        </p>

                        {template.footer && (
                          <p className="mt-2 truncate border-t border-slate-200 pt-2 text-[10px] text-slate-400">
                            {template.footer}
                          </p>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500">
                          <MediaIcon size={12} />
                          Media: {media.label}
                        </span>

                        {parameters.length > 0 && (
                          <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                            {parameters.length}{" "}
                            {parameters.length === 1
                              ? "parameter"
                              : "parameters"}
                          </span>
                        )}

                        {template.quality && (
                          <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-500">
                            Quality: {template.quality}
                          </span>
                        )}
                      </div>

                      {/* Parameter badges */}
                      {parameters.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {parameters.map((parameter, index) => (
                            <span
                              key={`${parameter}-${index}`}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"
                            >
                              {parameter}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white md:hidden">
        <nav className="flex justify-around px-2 py-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/inbox/templates";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[10px] ${
                  active
                    ? "bg-slate-100 font-medium text-slate-900"
                    : "text-slate-500"
                }`}
              >
                <Icon size={17} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

