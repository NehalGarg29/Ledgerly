"use client";

import { useEffect, useState } from "react";

const ROLES = ["admin", "analyst", "viewer"] as const;
type Role = (typeof ROLES)[number];

export default function RoleSwitcher() {
  const [role, setRole] = useState<Role>("viewer");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )role=([^;]+)/);
    const value = match ? decodeURIComponent(match[1]) : null;
    if (value && (ROLES as readonly string[]).includes(value)) {
      setRole(value as Role);
    }
  }, []);

  function handleChange(newRole: Role) {
    document.cookie = `role=${newRole}; path=/; max-age=31536000`;
    setRole(newRole);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Role
      </label>
      <select
        value={role}
        onChange={(e) => handleChange(e.target.value as Role)}
        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-sm font-medium text-emerald-700 focus:outline-none"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
