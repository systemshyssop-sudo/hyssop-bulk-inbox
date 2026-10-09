"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import { MessageCircle, ShieldCheck, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/inbox");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/50">
      <div className="flex min-h-screen">
        {/* Left brand panel */}
        <div className="hidden w-1/2 flex-col justify-between bg-emerald-950 p-12 text-white lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-950">
                <MessageCircle size={22} strokeWidth={2.2} />
              </div>

              <div>
                <div className="text-lg font-semibold">
                  Hyssop
                </div>

                <div className="text-xs text-emerald-200">
                  Bulk WhatsApp
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-lg">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/60 px-3 py-1.5 text-xs text-emerald-100">
              <ShieldCheck size={14} />
              Secure workspace
            </div>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              Welcome to the
              <br />
              Hyssop WhatsApp
              <br />
              workspace.
            </h1>

            <p className="mt-5 max-w-md text-sm leading-6 text-emerald-100/80">
              Manage conversations, approved WhatsApp templates and
              campaigns from one simple workspace.
            </p>
          </div>

          <div className="text-xs text-emerald-300/70">
            Hyssop Properties
          </div>
        </div>

        {/* Login panel */}
        <div className="flex w-full items-center justify-center px-5 py-10 lg:w-1/2">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <div className="mb-10 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950 text-white">
                  <MessageCircle size={21} />
                </div>

                <div>
                  <div className="text-lg font-semibold text-gray-950">
                    Hyssop
                  </div>

                  <div className="text-xs text-gray-500">
                    Bulk WhatsApp
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-xl shadow-gray-200/50 sm:p-9">
              <div className="mb-7">
                <h2 className="text-2xl font-semibold tracking-tight text-gray-950">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm leading-5 text-gray-500">
                  Sign in to access the Hyssop Bulk WhatsApp workspace.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-800">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-800">
                      Password
                    </label>
                  </div>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    "Signing in..."
                  ) : (
                    <>
                      Sign in
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-gray-100 pt-5 text-center">
                <p className="text-xs text-gray-400">
                  Private workspace for authorized users only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
