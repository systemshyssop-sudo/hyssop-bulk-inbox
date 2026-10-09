"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  Users,
  Megaphone,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/inbox/contacts", label: "Contacts", icon: Users },
  { href: "/inbox/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/inbox/templates", label: "Templates", icon: FileText },
  { href: "/inbox/settings", label: "Settings", icon: Settings },
];

export default function InboxNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-gray-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="text-lg font-bold tracking-tight text-emerald-950">
            Hyssop
          </div>
          <div className="text-xs font-medium text-gray-500">
            Bulk WhatsApp
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/inbox" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <LogOut size={18} />
            {loggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white lg:hidden">
        <nav className="grid grid-cols-5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/inbox" &&
                pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-3 text-[10px] font-medium ${
                  active ? "text-emerald-700" : "text-gray-500"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
