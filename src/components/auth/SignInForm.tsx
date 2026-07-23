"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Eye, EyeOff, AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { API_BASE } from "@/lib/api-client";
import MfaOtpStep from "@/components/auth/MfaOtpStep";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFullPageLoading, setShowFullPageLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [phase, setPhase] = useState<"login" | "mfa">("login");
  const [companycode, setCompanycode] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/";
  const [hideModal, setHideModal] = useState(false);
  const sessionExpired = searchParams?.get("session_expired") === "true" && !hideModal;
  const [reloginLoading, setReloginLoading] = useState(false);
  const { update } = useSession();

  const handleAutoRelogin = async () => {
    setReloginLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/relogin", { method: "POST" });
      const json = await res.json();
      if (json.success && json.aspnetToken) {
        // Update the NextAuth session client-side with the new token
        await update({ aspnetToken: json.aspnetToken });
        // Redirect back
        router.push(callbackUrl);
      } else {
        setError(json.error || "Gagal login otomatis, silakan login manual.");
      }
    } catch (err) {
      setError("Terjadi kesalahan sistem, silakan login manual.");
    } finally {
      setReloginLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE}/api/Company/GetUserCompanies?username=${encodeURIComponent(username.trim().toLowerCase())}`
      );
      const companies: { company_code: string }[] = res.ok ? await res.json() : [];
      const resolvedCompanycode = companies.length > 0 ? companies[0].company_code : "";
      setCompanycode(resolvedCompanycode);

      await doSignIn(resolvedCompanycode);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  async function doSignIn(cc: string, mfaToken?: string) {
    const result = await signIn("credentials", {
      redirect: false,
      username: username.trim().toLowerCase(),
      password,
      companycode: cc,
      callbackUrl,
      ...(mfaToken ? { mfaToken } : {}),
    });

    if (result?.error) {
      if (result.error === "MFA_REQUIRED") {
        if (mfaToken) {
          setError("Kode OTP tidak valid atau kedaluwarsa, silakan coba lagi.");
        }
        setPhase("mfa");
        setIsLoading(false);
        return;
      }
      const lowerError = result.error.toLowerCase();
      const isSystemError =
        lowerError.includes("network") ||
        lowerError.includes("timeout") ||
        lowerError.includes("fetch failed") ||
        lowerError.includes("econnrefused") ||
        lowerError.includes("kesalahan sistem");
      setError(isSystemError ? "Terjadi kesalahan sistem, silakan coba lagi." : (result.error || "Akun tidak terdaftar"));
      setIsLoading(false);
    } else if (result?.ok) {
      setPhase("login");
      setShowFullPageLoading(true);
      router.push(callbackUrl);
    } else {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
    }
  }

  async function handleMfaVerified(mfaToken: string) {
    setIsLoading(true);
    setError("");
    try {
      await doSignIn(companycode, mfaToken);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
    }
  }

  if (phase === "mfa") {
    return (
      <MfaOtpStep
        username={username.trim().toLowerCase()}
        companycode={companycode}
        onVerified={handleMfaVerified}
        onBack={() => { setError(""); setPhase("login"); }}
        externalError={error}
        retrying={isLoading}
      />
    );
  }

  return (
    <>
      {/* Full Page Loading Overlay (SISTRO Style) */}
      {mounted && createPortal(
        <div
          className={`fixed inset-0 z-[9999] bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm transition-opacity duration-300 flex flex-col items-center justify-center ${showFullPageLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <div className="flex flex-col items-center transform transition-transform duration-500 scale-100">
            <img
              src="/images/logo/logo-text1.png"
              alt="SISTRO"
              className="h-12 md:h-14 object-contain mb-8 animate-fade-in dark:hidden"
            />
            <img
              src="/images/logo/logo-text.png"
              alt="SISTRO"
              className="h-12 md:h-14 object-contain mb-8 animate-fade-in hidden dark:block"
            />
            <Loader2 className="w-10 h-10 text-brand-600 dark:text-brand-400 animate-spin mb-6" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Autentikasi Berhasil</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Mempersiapkan dashboard untuk Anda...</p>

            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-2 h-2 bg-brand-600 dark:bg-brand-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-brand-600 dark:bg-brand-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-brand-600 dark:bg-brand-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="flex flex-col flex-1 w-full max-w-md mx-auto text-gray-900 dark:text-white relative animate-slide-up-fade">
        <div className="flex flex-col justify-center flex-1 w-full">
          {/* Logos */}
          <div className="flex justify-center items-center gap-6 mb-8">
            <div>
              <img
                src="/images/logo/logopihd.png"
                alt="Pupuk Indonesia"
                className="h-10 object-contain dark:brightness-0 dark:invert"
                style={{ width: "auto" }}
              />
            </div>
            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
            <img
              src="/images/logo/Danantara_Indonesia_Logo_vector (Color).png"
              alt="Danantara"
              className="h-9 object-contain dark:hidden"
              style={{ width: "auto" }}
            />
            <img
              src="/images/logo/Danantara_Indonesia_Logo_vector (White).png"
              alt="Danantara"
              className="h-9 object-contain hidden dark:block"
              style={{ width: "auto" }}
            />
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 mb-2 tracking-tight">
              SISTRO
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Selamat datang kembali, silahkan gunakan akun yang sudah terdaftar di SISTRO.
            </p>
          </div>

          <AlertDialog open={sessionExpired}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <AlertDialogTitle>Sesi Berakhir</AlertDialogTitle>
                    <AlertDialogDescription>
                      Akun anda digunakan oleh user lain, apakah ingin login lagi?
                    </AlertDialogDescription>
                  </div>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <button
                  type="button"
                  onClick={() => {
                    setHideModal(true);
                    router.replace("/login");
                  }}
                  disabled={reloginLoading}
                  className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-transparent border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAutoRelogin}
                  disabled={reloginLoading}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors disabled:opacity-50"
                >
                  {reloginLoading ? "Memproses..." : "Ya, Login Lagi"}
                </button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-500/30 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Username / NIK
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50/50 dark:bg-[#0f172a]/50 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-300 hover:bg-white dark:hover:bg-[#0f172a]/80 shadow-sm"
                placeholder="Masukkan NIK atau Username"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kata Sandi</label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50/50 dark:bg-[#0f172a]/50 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all duration-300 hover:bg-white dark:hover:bg-[#0f172a]/80 shadow-sm pr-10"
                  placeholder="Masukkan kata sandi Anda"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300 transition-colors"
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
                  className="w-4 h-4 text-brand-600 dark:text-brand-500 bg-gray-100 dark:bg-[#0f172a] border-gray-300 dark:border-gray-600 rounded focus:ring-brand-500 focus:ring-2 transition-colors cursor-pointer"
                />
                <label htmlFor="remember" className="ml-2 text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
                  Tetap masuk
                </label>
              </div>
              <Link
                href="/register"
                className="text-xs font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
              >
                Lupa Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading || showFullPageLoading}
              className="w-full py-3 mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                "Masuk"
              )}
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
    </>
  );
}
