"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthBrandPanel from "../../components/AuthBrandPanel";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <AuthBrandPanel />

      {/* Right: registration form */}
      <div className="flex w-full flex-col justify-center bg-stone-50 px-6 py-12 sm:px-12 md:w-[520px] md:shrink-0 lg:w-[560px]">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-800 text-sm font-semibold text-white">
              L
            </span>
            <span className="text-xl font-semibold tracking-tight text-zinc-900">Ledgerly</span>
          </div>

          <h2 className="text-4xl font-semibold tracking-tight text-zinc-900">Create account</h2>
          <p className="mt-2 text-sm text-zinc-500">
            New accounts start with viewer access. An admin can promote you later.
          </p>

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
              <label className="block text-sm font-medium text-zinc-900">Password</label>
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
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
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

            <div>
              <label className="block text-sm font-medium text-zinc-900">Confirm password</label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M6.5 9V6.5a3.5 3.5 0 017 0V9" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                  className="w-full rounded-full border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-teal-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-teal-700 hover:text-teal-900">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
