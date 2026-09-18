"use client";

import { useEffect, useState } from "react";

export type Role = "admin" | "analyst" | "viewer";

export function useRole(): Role {
  return useSession().role;
}

export function useSession(): {
  email: string | null;
  role: Role;
  companyId: string | null;
  loading: boolean;
} {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("viewer");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.user) {
          setEmail(d.user.email);
          setRole(d.user.role);
          setCompanyId(d.user.companyId);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { email, role, companyId, loading };
}
