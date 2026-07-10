/**
 * API client untuk komunikasi dengan ASP.NET backend.
 * - aspnetFetchServer: untuk server components / route handlers
 * - aspnetJson: helper JSON dengan error throw
 */

if (typeof window === 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const BASE_URL = typeof window !== 'undefined'
  ? "/aspnet-proxy"
  : (process.env.NEXT_PUBLIC_ASPNET_API_URL || process.env.ASPNET_API_URL || "https://sistro-dev.pupuk-indonesia.com");

type FetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export async function aspnetFetchServer(
  path: string,
  token: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { headers = {}, ...rest } = options;
  try {
    return await fetch(`${BASE_URL}${path}`, {
      ...rest,
      signal: rest.signal ?? AbortSignal.timeout(45_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...headers,
      },
    });
  } catch (err: any) {
    // Node's fetch (undici) throws a generic "fetch failed" and hides the
    // real reason (ECONNRESET, timeout, DNS) in err.cause — surface it so
    // failures are diagnosable instead of showing up as just "fetch failed".
    const cause = err?.cause?.message || err?.cause?.code;
    throw new Error(cause ? `${err.message}: ${cause}` : err.message, { cause: err });
  }
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
