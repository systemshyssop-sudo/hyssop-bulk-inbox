"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

export default function LogoutControl() {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  const isInbox = pathname === "/inbox";

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      aria-label="Log out"
      className={`fixed right-4 top-4 z-[100] inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 ${
        isInbox ? "lg:hidden" : ""
      }`}
    >
      <LogOut size={16} />
      <span>{loading ? "Signing out..." : "Logout"}</span>
    </button>
  );
}
