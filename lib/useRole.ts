"use client";

import { useEffect, useState } from "react";

export type Role = "admin" | "analyst" | "viewer";
const ROLES: Role[] = ["admin", "analyst", "viewer"];

export function useRole(): Role {
  const [role, setRole] = useState<Role>("viewer");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )role=([^;]+)/);
    const value = match ? decodeURIComponent(match[1]) : null;
    if (value && ROLES.includes(value as Role)) {
      setRole(value as Role);
    }
  }, []);

  return role;
}