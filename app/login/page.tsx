"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthBrandPanel from "../../components/AuthBrandPanel";

const DEMO_ACCOUNTS = [
  { email: "admin@ledgerly.demo", role: "Admin" },
  { email: "analyst@ledgerly.demo", role: "Analyst" },
  { email: "viewer@ledgerly.demo", role: "Viewer" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoOpen, setDemoOpen] = useState(true);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("ledgerly");
    setError("");
  }

  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel />

      {/* Right: sign-in form */}
      <div className="flex w-full flex-col justify-center bg-stone-50 px-6 py-12 sm:px-12 md:w-[520px] md:shrink-0 lg:w-[560px]">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-sm font-semibold text-white">
              L
            </span>
            <span className="text-xl font-semibold tracking-tight text-zinc-900">Ledgerly</span>
          </div>

          <h2 className="text-4xl font-semibold tracking-tight text-zinc-900">Welcome back</h2>
          <p className="mt-2 text-sm text-zinc-500">Sign in to your Ledgerly workspace.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900">Email</label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M3.5 5.5l6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                  className="w-full rounded-full border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-900">Password</label>
                <span className="cursor-default text-xs font-medium text-teal-700">Forgot password?</span>
              </div>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M6.5 9V6.5a3.5 3.5 0 017 0V9" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-full border border-zinc-300 bg-white py-2.5 pl-10 pr-10 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-3 flex items-center text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" stroke="currentColor" strokeWidth="1.4" />
                      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" stroke="currentColor" strokeWidth="1.4" />
                      <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M3 17L17 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-teal-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-teal-700 hover:text-teal-900">
              Create one
            </Link>
          </p>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white">
            <button
              type="button"
              onClick={() => setDemoOpen((v) => !v)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-zinc-900">Demo accounts</span>
                <span className="block text-xs text-zinc-500">Use these demo accounts to explore Ledgerly.</span>
              </span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                className={`shrink-0 text-zinc-400 transition-transform ${demoOpen ? "rotate-180" : ""}`}
              >
                <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {demoOpen && (
              <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 px-4 py-3.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc.email)}
                    className="rounded-lg px-2 py-1.5 text-left hover:bg-zinc-50"
                  >
                    <span className="block text-xs font-semibold text-zinc-900">{acc.role}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{acc.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Password for all demo accounts: <span className="font-medium text-zinc-500">ledgerly</span>
          </p>
        </div>
      </div>
    </div>
  );
}
