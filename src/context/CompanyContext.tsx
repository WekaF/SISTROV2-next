"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

// ──────────────────────────── types ────────────────────────────────────────

export interface Company {
  company_code: string;
  company: string;
}

interface CompanyContextValue {
  companies: Company[];
  activeCompanyCode: string | null;
  isLoading: boolean;
  switchCompany: (code: string) => Promise<void>;
}

// ──────────────────────────── context ──────────────────────────────────────

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}

// ──────────────────────────── provider ─────────────────────────────────────

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update: updateSession } = useSession();
  const queryClient = useQueryClient();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyCode, setActiveCompanyCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback: companyCode from JWT session
  const sessionCompanyCode = (session?.user as any)?.companyCode as string | null | undefined;

  // ── fetch companies from /api/user/active-company (which calls ASP.NET) ─
  const fetchCompanies = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/user/active-company");
      const json = await res.json();
      if (json.success && json.data) {
        const fetchedCompanies: Company[] = json.data.companies ?? [];
        setCompanies(fetchedCompanies);
        if (fetchedCompanies.length > 0) {
          setActiveCompanyCode(json.data.activeCompany ?? fetchedCompanies[0].company_code);
        }
      }
    } catch (err) {
      console.error("[CompanyContext] fetchCompanies error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") fetchCompanies();
    if (status === "unauthenticated") {
      setCompanies([]);
      setActiveCompanyCode(null);
      setIsLoading(false);
    }
  }, [status, fetchCompanies]);

  // ── switchCompany: re-auth ASP.NET → update session token → bust queries ─
  const switchCompany = useCallback(
    async (code: string) => {
      if (code === activeCompanyCode) return;
      try {
        const res = await fetch("/api/user/switch-company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyCode: code }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Gagal berganti plant");
        }

        // Update NextAuth session with new ASP.NET token (only if available)
        if (json.aspnetToken) {
          await updateSession({
            aspnetToken: json.aspnetToken,
            companyCode: json.companyCode,
          });
        }

        // Update local state & bust all query caches
        setActiveCompanyCode(code);
        await queryClient.invalidateQueries({ queryKey: [] });
      } catch (err) {
        console.error("[CompanyContext] switchCompany error:", err);
        throw err;
      }
    },
    [activeCompanyCode, queryClient, updateSession]
  );

  // Effective code: context state → session fallback
  const effectiveCompanyCode = activeCompanyCode ?? sessionCompanyCode ?? null;

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompanyCode: effectiveCompanyCode,
        isLoading,
        switchCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}


