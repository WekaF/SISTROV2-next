"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ChevronDown, Search, X } from "lucide-react";

interface CompanyOption {
  company: string;
  company_code: string;
}

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [companycode, setCompanycode]   = useState("");
  const [error, setError]               = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const [isChecked, setIsChecked]       = useState(false);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams?.get("callbackUrl") || "/";

  // Searchable Company Dropdown States
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch("/aspnet-proxy/api/Company/getCompanyListFitur");
        if (!res.ok) throw new Error("Gagal mengambil data perusahaan");
        const data = await res.json();
        if (Array.isArray(data)) {
          setCompanies(data);
        }
      } catch (err) {
        console.error("Error fetching companies:", err);
      } finally {
        setIsLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCompanies = companies.filter(c =>
    (c.company || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company_code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCompanyObj = companies.find(c => c.company_code === companycode);
  const dropdownLabel = selectedCompanyObj
    ? `${selectedCompanyObj.company} (${selectedCompanyObj.company_code})`
    : "Pilih Perusahaan...";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        username,
        password,
        companycode,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error);
      } else if (res?.ok) {
        router.push(callbackUrl);
      }
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto text-gray-900 dark:text-white">
      <div className="flex flex-col justify-center flex-1 w-full">
        {/* Logos at top */}
        <div className="flex justify-center items-center gap-6 mb-8">
          <div>
            <img 
              src="/images/logo/logopihd.png" 
              alt="Pupuk Indonesia" 
              className="h-10 object-contain grayscale dark:brightness-0 dark:invert"
            />
          </div>
          <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
          {/* Light mode logo */}
          <img 
            src="/images/logo/Danantara_Indonesia_Logo_vector (Color).png" 
            alt="Danantara" 
            className="h-9 object-contain dark:hidden"
          />
          {/* Dark mode logo */}
          <img 
            src="/images/logo/Danantara_Indonesia_Logo_vector (White).png" 
            alt="Danantara" 
            className="h-9 object-contain hidden dark:block"
          />
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sistem Scheduling Truck Online
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Masuk ke akun Anda untuk melanjutkan
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-500/30 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Username / NIK</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-[#1e2a44] border border-gray-300 dark:border-transparent rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              required
            />
          </div>

          <div className="space-y-1.5" ref={dropdownRef}>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Company Code <span className="font-normal text-gray-400 dark:text-gray-500">(opsional)</span></label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                  setSearchTerm("");
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[#1e2a44] border border-gray-300 dark:border-transparent rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-left"
              >
                <span className="truncate">{dropdownLabel}</span>
                <div className="flex items-center gap-1.5">
                  {companycode && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setCompanycode("");
                      }}
                      className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "transform rotate-180" : ""}`} />
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1e2a44] border border-gray-300 dark:border-gray-700 rounded-md shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#152033]/50">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cari perusahaan..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-[#152033] border border-gray-300 dark:border-gray-700 rounded outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400"
                        autoFocus
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-gray-150 dark:divide-gray-800/20">
                    <button
                      type="button"
                      onClick={() => {
                        setCompanycode("");
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 flex items-center justify-between ${
                        companycode === "" 
                          ? "text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-900/10 font-bold" 
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span>-- Tanpa Perusahaan --</span>
                    </button>

                    {isLoadingCompanies ? (
                      <div className="px-4 py-3 text-xs text-gray-400 text-center">
                        Memuat data...
                      </div>
                    ) : filteredCompanies.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-400 italic text-center">
                        Tidak ada hasil ditemukan
                      </div>
                    ) : (
                      filteredCompanies.map((c) => (
                        <button
                          key={c.company_code}
                          type="button"
                          onClick={() => {
                            setCompanycode(c.company_code);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30 flex items-center justify-between ${
                            companycode === c.company_code 
                              ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/20 dark:bg-blue-900/10" 
                              : "text-gray-700 dark:text-gray-300 font-medium"
                          }`}
                        >
                          <span className="truncate">{c.company}</span>
                          <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded ml-2">
                            {c.company_code}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kata Sandi</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-[#1e2a44] border border-gray-300 dark:border-transparent rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="w-4 h-4 text-blue-600 dark:text-blue-500 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="remember" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                Tetap masuk
              </label>
            </div>
            <Link
              href="/register"
              className="text-xs text-blue-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Lupa Password?
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-2.5 mt-2 bg-blue-600 text-white font-semibold text-sm rounded-md hover:bg-blue-700 shadow-sm transition-colors dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            {isLoading ? "Masuk..." : "Masuk"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Bagian dari Pupuk Indonesia Group</p>
          <img 
            src="/images/logo/logo-anper.png" 
            alt="Anak Perusahaan" 
            className="h-10 object-contain mx-auto dark:brightness-0 dark:invert dark:opacity-80"
          />
        </div>
      </div>
    </div>
  );
}
