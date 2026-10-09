"use client";

import Link from "next/link";
import {
  Inbox,
  Users,
  Megaphone,
  FileText,
  Settings,
  Construction,
} from "lucide-react";

const navigation = [
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Contacts", href: "/inbox/contacts", icon: Users },
  { label: "Campaigns", href: "/inbox/campaigns", icon: Megaphone },
  { label: "Templates", href: "/inbox/templates", icon: FileText },
  { label: "Settings", href: "/inbox/settings", icon: Settings },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
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
                const active = item.href === "/inbox/settings";

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

      <main className="min-h-screen px-4 py-6 pb-24 md:ml-56 md:px-8 md:py-8 md:pb-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
              Settings
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Configure the WhatsApp inbox and campaign system.
            </p>
          </div>

          <section className="flex min-h-[420px] items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="max-w-md px-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                <Construction size={21} />
              </div>

              <div className="mt-5">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                  Coming soon
                </span>
              </div>

              <h2 className="mt-4 text-lg font-semibold text-gray-950">
                System configuration
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Configuration options for WhatsApp, Google Sheets,
                campaigns, and account settings will be managed here.
              </p>
            </div>
          </section>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">
        <div className="grid grid-cols-5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/inbox/settings";

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

