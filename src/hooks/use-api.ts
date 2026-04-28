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
      
      const isFormData = rest.body instanceof FormData;
      
      const fullUrl = `${API_BASE}${path}`;
      console.log(`[useApi] Fetching: ${fullUrl}`, options);

      return fetch(fullUrl, {
        ...rest,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
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

  /**
   * Helper khusus untuk pemanggilan DataTables (DataTableFilter/DataTable).
   * Otomatis mengubah payload menjadi Form Data (x-www-form-urlencoded).
   */
  const apiTable = useCallback(
    async <T = any>(path: string, payload: any): Promise<T> => {
      const params = new URLSearchParams();
      
      // Flatten simple properties
      Object.keys(payload).forEach(key => {
        if (typeof payload[key] === 'object' && payload[key] !== null) {
          // Flatten nested objects like search[value]
          Object.keys(payload[key]).forEach(subKey => {
            params.append(`${key}[${subKey}]`, String(payload[key][subKey]));
          });
        } else {
          params.append(key, String(payload[key]));
        }
      });

      const res = await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => res.statusText);
        throw new Error(`[${res.status}] ${msg}`);
      }
      return res.json() as Promise<T>;
    },
    [apiFetch]
  );

  return { apiFetch, apiJson, apiTable, token };
}
