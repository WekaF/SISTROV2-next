"use client";
import { SessionProvider } from "next-auth/react";

if (typeof window !== "undefined" && !(window as any).__fetchIntercepted) {
  (window as any).__fetchIntercepted = true;
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input?.url || "";

    // Check if it's NextAuth session or csrf endpoint
    if (url.includes("/api/auth/session") || url.includes("/api/auth/csrf")) {
      try {
        const response = await originalFetch(input, init);
        const contentType = response.headers.get("content-type");

        if (contentType && contentType.includes("text/html")) {
          console.warn("[NextAuth Interceptor] HTML response detected for session fetch:", url);
          
          const isAuthPage =
            window.location.pathname === "/login" ||
            window.location.pathname === "/register" ||
            window.location.pathname === "/forgot-password" ||
            window.location.pathname === "/auth/role-select" ||
            window.location.pathname === "/security/print";

          if (!isAuthPage) {
            const cookies = document.cookie;
            const hasToken =
              cookies.includes("next-auth.session-token") ||
              cookies.includes("__Secure-next-auth.session-token");

            if (hasToken) {
              console.warn("[NextAuth Interceptor] Token exists. Refreshing page...");
              const lastRefresh = sessionStorage.getItem("last_auth_refresh");
              const now = Date.now();
              
              // Limit to once every 10 seconds to prevent infinite reload loops
              if (!lastRefresh || now - parseInt(lastRefresh) > 10000) {
                sessionStorage.setItem("last_auth_refresh", now.toString());
                window.location.reload();
              } else {
                console.error("[NextAuth Interceptor] Avoided infinite reload loop. Redirecting to login...");
                window.location.href = "/login";
              }
            } else {
              console.warn("[NextAuth Interceptor] No session token found. Redirecting to login...");
              window.location.href = "/login";
            }
          }

          // Return empty JSON mock response to prevent CLIENT_FETCH_ERROR JSON parsing crash
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return response;
      } catch (err) {
        console.error("[NextAuth Interceptor] Fetch failed:", err);
        throw err;
      }
    }

    return originalFetch(input, init);
  };
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
