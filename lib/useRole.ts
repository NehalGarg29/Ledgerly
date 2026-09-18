"use client";

import { useEffect, useState } from "react";

export type Role = "admin" | "analyst" | "viewer";

export function useRole(): Role {
  return useSession().role;
}

export function useSession(): { email: string | null; role: Role; loading: boolean } {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("viewer");
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

  return { email, role, loading };
}
