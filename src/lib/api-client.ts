/**
 * API client untuk komunikasi dengan ASP.NET backend.
 * - aspnetFetchServer: untuk server components / route handlers
 * - aspnetJson: helper JSON dengan error throw
 */

const BASE_URL = process.env.ASPNET_API_URL || "http://localhost:5000";

type FetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export async function aspnetFetchServer(
  path: string,
  token: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { headers = {}, ...rest } = options;
  return fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  });
}

export async function aspnetJson<T = any>(
  path: string,
  token: string,
  options: FetchOptions = {}
): Promise<T> {
  const res = await aspnetFetchServer(path, token, options);
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`[${res.status}] ${msg}`);
  }
  return res.json() as Promise<T>;
}

export const API_BASE = BASE_URL;
