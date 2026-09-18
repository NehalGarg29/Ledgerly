"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "../lib/useRole";
import Avatar from "./Avatar";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "All Transactions",
  "/exceptions": "Exceptions Review",
  "/accounts": "Chart of Accounts",
  "/close": "Month-End Close",
  "/positive-pay": "Positive Pay",
  "/forecast": "Cash Forecast",
  "/anomalies": "Anomalies",
  "/upload": "Upload Bank File",
};

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { email, role } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = PAGE_TITLES[pathname] ?? "Ledgerly";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-5 sm:px-10 sm:py-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="text-zinc-500 hover:text-zinc-900 md:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <path
              d="M2.5 5h15M2.5 10h15M2.5 15h15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
      </div>

      {email && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            className="flex items-center rounded-full transition-opacity hover:opacity-80"
          >
            <Avatar email={email} role={role} size="md" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
                <p className="truncate text-sm font-medium text-zinc-900">{email}</p>
                <p className="mt-0.5 text-xs capitalize text-zinc-500">{role}</p>
                <button
                  onClick={handleLogout}
                  className="mt-3 w-full rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
