"use client";

import { useSession } from "next-auth/react";
import { useCallback } from "react";
import { API_BASE } from "@/lib/api-client";

/**
 * Hook fetch ke ASP.NET backend dari client components.
 * Otomatis inject Bearer token dari session next-auth.
 *
 * Contoh:
 *   const { apiJson } = useApi();
 *   const data = await apiJson("/api/Armada/GetList");
 */
export function useApi() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.aspnetToken as string | undefined;

  const apiFetch = useCallback(
    (path: string, options: RequestInit = {}): Promise<Response> => {
      const { headers = {}, ...rest } = options;
      return fetch(`${API_BASE}${path}`, {
        ...rest,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(headers as Record<string, string>),
        },
      });
    },
    [token]
  );

  const apiJson = useCallback(
    async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
      const res = await apiFetch(path, options);
      if (!res.ok) {
        const msg = await res.text().catch(() => res.statusText);
        throw new Error(`[${res.status}] ${msg}`);
      }
      return res.json() as Promise<T>;
    },
    [apiFetch]
  );

  return { apiFetch, apiJson, token };
}
