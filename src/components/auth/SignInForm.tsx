"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Company Code <span className="font-normal text-gray-400 dark:text-gray-500">(opsional)</span></label>
            <input
              type="text"
              value={companycode}
              onChange={(e) => setCompanycode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 bg-white dark:bg-[#1e2a44] border border-gray-300 dark:border-transparent rounded-md text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
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
