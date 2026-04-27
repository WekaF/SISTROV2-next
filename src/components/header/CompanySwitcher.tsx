"use client";
import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { ChevronDown, Building2, Factory, Loader2 } from "lucide-react";

export default function CompanySwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [activeCompany, setActiveCompany] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch("/api/user/active-company");
      const result = await res.json();
      if (result.success) {
        setCompanies(result.data.companies);
        setActiveCompany(result.data.activeCompany);
      }
    } catch (err) {
      console.error("Fetch companies error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitch = async (code: string) => {
    try {
      const res = await fetch("/api/user/active-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyCode: code }),
      });
      if (res.ok) {
        window.location.reload(); // Hard reload to clear all cached context
      }
    } catch (err) {
      console.error("Switch company error:", err);
    }
  };

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 animate-pulse">
        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (companies.length === 0) return null; 

  const activeCompanyData = companies.find(c => c.company_code === activeCompany) || companies[0];

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 dropdown-toggle"
      >
        <Factory className="h-4 w-4 text-brand-500" />
        <div className="text-left hidden sm:block">
          <p className="text-[10px] font-medium text-gray-400 uppercase leading-none mb-1">Active Plant</p>
          <p className="text-xs font-bold leading-none truncate max-w-[100px]">
            {activeCompanyData?.company || activeCompany}
          </p>
        </div>
        <ChevronDown
          className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute left-0 lg:left-auto lg:right-0 mt-2 flex w-[240px] flex-col rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="px-3 py-2 mb-1 border-b border-gray-100 dark:border-gray-800">
          <span className="text-[11px] font-bold text-gray-400 uppercase">Switch Environment</span>
        </div>
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          {companies.map((company) => (
            <button
              key={company.company_code}
              onClick={() => handleSwitch(company.company_code)}
              className={`flex w-full items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                activeCompany === company.company_code
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
              }`}
            >
              <div className="mt-0.5">
                <Building2 className={`h-4 w-4 ${activeCompany === company.company_code ? "text-brand-500" : "text-gray-400"}`} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold leading-none mb-1">{company.company}</p>
                <p className="text-[10px] text-gray-400 font-mono">{company.company_code}</p>
              </div>
              {activeCompany === company.company_code && (
                <div className="ml-auto mt-1 h-1.5 w-1.5 rounded-full bg-brand-500 shadow-sm shadow-brand-500/50"></div>
              )}
            </button>
          ))}
        </div>
      </Dropdown>
    </div>
  );
}
