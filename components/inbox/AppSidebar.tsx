"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Users,
  Megaphone,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

type Props = {
  onSignOut: () => void;
};

const navigation = [
  {
    href: "/inbox",
    label: "Inbox",
    icon: Inbox,
  },
  {
    href: "/inbox/contacts",
    label: "Contacts",
    icon: Users,
  },
  {
    href: "/inbox/campaigns",
    label: "Campaigns",
    icon: Megaphone,
  },
  {
    href: "/inbox/templates",
    label: "Templates",
    icon: FileText,
  },
  {
    href: "/inbox/settings",
    label: "Settings",
    icon: Settings,
  },
];

export default function AppSidebar({ onSignOut }: Props) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="text-lg font-bold tracking-tight text-slate-900">
          Hyssop
        </div>

        <div className="mt-0.5 text-xs text-slate-500">
          WhatsApp Inbox
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href === "/inbox" &&
                pathname === "/inbox/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}