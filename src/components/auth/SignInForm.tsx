"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked]       = useState(false);
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [companycode, setCompanycode]   = useState("");
  const [error, setError]               = useState("");
  const [isLoading, setIsLoading]       = useState(false);
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
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto">
      <div className="mb-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Kembali
        </Link>
      </div>

      <div className="flex flex-col justify-center flex-1 w-full">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white sm:text-3xl">
            Masuk
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Masukkan kredensial Anda untuk mengakses SISTRO.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg dark:bg-red-500/10 dark:border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <Label>Username / NIK</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
            />
          </div>

          <div>
            <Label>
              Company Code{" "}
              <span className="text-gray-400 font-normal text-xs">(opsional untuk rekanan)</span>
            </Label>
            <Input
              type="text"
              value={companycode}
              onChange={(e) => setCompanycode(e.target.value.toUpperCase())}
              placeholder="mis. B3B7"
            />
          </div>

          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Checkbox
              label="Tetap masuk"
              checked={isChecked}
              onChange={setIsChecked}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Masuk..." : "Masuk"}
          </Button>
        </form>

        <div className="mt-8 text-center sm:text-left">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Hubungi Admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
