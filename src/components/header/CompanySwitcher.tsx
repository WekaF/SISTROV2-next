"use client";
import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { ChevronDown, Building2, Factory, Loader2, CheckCircle2 } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { useSession } from "next-auth/react";

export default function CompanySwitcher() {
  const { companies, activeCompanyCode, isLoading, switchCompany } = useCompany();
  const { data: session } = useSession();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const role = (session?.user as any)?.role as string | undefined;
  const isTransport = role?.toLowerCase().startsWith("transport") || role?.toLowerCase() === "rekanan";

  const canSwitch = companies.length > 1 && !isTransport;

  // Don't show the switcher at all for transport/rekanan users
  if (isTransport) return null;

  const handleSwitch = async (code: string) => {
    if (code === activeCompanyCode || isSwitching) return;
    setIsSwitching(true);
    setIsOpen(false);
    try {
      await switchCompany(code);
      const company = companies.find((c) => c.company_code === code);
      addToast({
        title: "Plant Diganti",
        description: `Aktif: ${company?.company ?? code}`,
        variant: "success",
      });
    } catch (err: any) {
      addToast({
        title: "Gagal Mengganti Plant",
        description: err?.message || "Terjadi kesalahan. Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSwitching(false);
    }
  };

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (canSwitch) setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 animate-pulse">
        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded hidden sm:block" />
      </div>
    );
  }

  // Determine display label:
  // - companies loaded: find matching, or first
  // - fallback to session JWT companyCode
  const sessionCompanyCode = (session?.user as any)?.companyCode as string | undefined;
  const activeCompanyData = companies.find((c) => c.company_code === activeCompanyCode) ?? companies[0];
  const displayCode = activeCompanyData?.company_code ?? activeCompanyCode ?? sessionCompanyCode;
  const displayName = activeCompanyData?.company ?? activeCompanyCode ?? sessionCompanyCode ?? "—";

  // Don't render at all if no company info anywhere
  if (!displayCode && !sessionCompanyCode) return null;

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        disabled={isSwitching || !canSwitch}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white transition-colors dark:border-gray-800 dark:bg-gray-900 text-gray-700 dark:text-gray-300 dropdown-toggle disabled:opacity-60 ${
          canSwitch ? "hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" : "cursor-default"
        }`}
      >
        {isSwitching ? (
          <Loader2 className="h-4 w-4 text-brand-500 animate-spin" />
        ) : (
          <Factory className="h-4 w-4 text-brand-500" />
        )}
        <div className="text-left hidden sm:block">
          <p className="text-[10px] font-medium text-gray-400 uppercase leading-none mb-1">
            Active Plant
          </p>
          <p className="text-xs font-bold leading-none truncate max-w-[110px]">
            {displayName}
          </p>
        </div>
        {canSwitch && (
          <ChevronDown
            className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {canSwitch && (
        <Dropdown
          isOpen={isOpen}
          onClose={closeDropdown}
          className="absolute left-0 lg:left-auto lg:right-0 mt-2 flex w-[280px] flex-col rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="px-3 py-2 mb-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Switch Plant
            </span>
          </div>
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
            {companies.map((company) => {
              const isActive = activeCompanyCode === company.company_code;
              return (
                <button
                  key={company.company_code}
                  onClick={() => handleSwitch(company.company_code)}
                  disabled={isActive || isSwitching}
                  className={`flex w-full items-start gap-3 px-3 py-2.5 rounded-lg transition-colors disabled:cursor-default ${
                    isActive
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="mt-0.5">
                    <Building2
                      className={`h-4 w-4 ${isActive ? "text-brand-500" : "text-gray-400"}`}
                    />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-none mb-1 truncate">
                      {company.company}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">{company.company_code}</p>
                  </div>
                  {isActive && (
                    <CheckCircle2 className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  )}
                </button>
              );
            })}
          </div>
        </Dropdown>
      )}
    </div>
  );
}
