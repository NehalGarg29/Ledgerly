"use client";

import { usePathname } from "next/navigation";
import RoleSwitcher from "./RoleSwitcher";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "All Transactions",
  "/exceptions": "Exceptions Review",
  "/upload": "Upload Bank File",
};

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "Ledgerly";

  return (
    <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-5 sm:px-10 sm:py-6">
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
      <RoleSwitcher />
    </div>
  );
}
