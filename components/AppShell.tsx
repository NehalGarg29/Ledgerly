"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex flex-1 flex-col overflow-y-auto">
        <TopBar onMenuClick={() => setMobileNavOpen(true)} />
        {children}
      </div>
    </div>
  );
}
