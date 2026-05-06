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
      
      // Ensure basic DataTables structure
      const enhancedPayload = {
        ...payload,
        search: typeof payload.search === 'string' ? { value: payload.search, regex: 'false' } : (payload.search || { value: '', regex: 'false' }),
        order: payload.order || [{ column: '0', dir: 'desc' }],
        columns: payload.columns || [{ data: 'id', name: 'id', searchable: 'true', orderable: 'true', search: { value: '', regex: 'false' } }]
      };

      // Flatten properties for x-www-form-urlencoded
      const flatten = (obj: any, prefix = '') => {
        Object.keys(obj).forEach(key => {
          const k = prefix ? `${prefix}[${key}]` : key;
          if (obj[key] === undefined || obj[key] === null) {
            // Skip appending null/undefined
          } else if (typeof obj[key] === 'object') {
            flatten(obj[key], k);
          } else {
            params.append(k, String(obj[key]));
          }
        });
      };

      flatten(enhancedPayload);

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

import { useState, useEffect } from "react";

/**
 * Hook simplified untuk fetching data dari endpoint DataTable
 * Tanpa perlu manajemen state manual di page.
 */
export function useApiTable({ url, defaultLength = 10 }: { url: string, defaultLength?: number }) {
  const { apiTable } = useApi();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiTable(url, {
        start: 0,
        length: defaultLength,
        draw: 1,
        search: { value: "", regex: false },
        order: [{ column: 0, dir: "asc" }],
      });
      setData(res.data || []);
    } catch (err) {
      console.error("[useApiTable] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [apiTable, url, defaultLength]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, refresh };
}
