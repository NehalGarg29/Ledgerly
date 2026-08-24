"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/exceptions", label: "Exceptions" },
  { href: "/upload", label: "Upload" },
];

export default function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  function NavLinks() {
    return (
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`rounded-md px-3 py-2.5 text-[15px] font-medium transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <>
      <aside className="hidden h-screen w-60 shrink-0 flex-col bg-zinc-800 md:flex">
        <div className="flex items-center gap-2.5 px-6 py-6">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white">
            L
          </span>
          <span className="text-xl font-semibold tracking-tight text-white">
            Ledgerly
          </span>
        </div>
        <NavLinks />
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute left-0 top-0 flex h-screen w-60 flex-col bg-zinc-800">
            <div className="flex items-center justify-between gap-2 px-6 py-6">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white">
                  L
                </span>
                <span className="text-xl font-semibold tracking-tight text-white">
                  Ledgerly
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="text-zinc-400 hover:text-white"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M3 3l12 12M15 3L3 15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <NavLinks />
          </aside>
        </div>
      )}
    </>
  );
}
