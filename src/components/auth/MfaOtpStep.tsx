// SISTROV2-next/src/components/auth/MfaOtpStep.tsx
"use client";
import React, { useState } from "react";
import { API_BASE } from "@/lib/api-client";

interface Props {
  username: string;
  companycode: string;
  onVerified: (mfaToken: string) => void;
  onBack: () => void;
}

export default function MfaOtpStep({ username, companycode, onVerified, onBack }: Props) {
  const [method, setMethod]       = useState<"email" | "sms" | null>(null);
  const [otpCode, setOtpCode]     = useState("");
  const [error, setError]         = useState("");
  const [sending, setSending]     = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent]           = useState(false);

  async function sendOtp(selectedMethod: "email" | "sms") {
    setSending(true);
    setError("");
    setMethod(selectedMethod);
    try {
      const res = await fetch(`${API_BASE}/api/mfa/sendotpmethod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Username: username, MethodId: selectedMethod }),
      });
      const data = await res.json();
      if (!data.Success) {
        setError(data.Message || "Gagal mengirim OTP.");
        setMethod(null);
      } else {
        setSent(true);
      }
    } catch {
      setError("Tidak dapat mengirim OTP.");
      setMethod(null);
    } finally {
      setSending(false);
    }
  }

  async function verifyOtp() {
    if (!otpCode.trim()) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/mfa-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, companycode, code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Kode OTP tidak valid.");
      } else {
        onVerified(data.mfaToken);
      }
    } catch {
      setError("Tidak dapat memverifikasi OTP.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-md mx-auto text-gray-900 dark:text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Verifikasi Dua Langkah</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Pilih metode untuk menerima kode OTP.</p>
      </div>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-500/30 rounded-md">
          {error}
        </div>
      )}

      {!sent ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => sendOtp("email")}
            disabled={sending}
            className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold text-sm rounded-xl disabled:opacity-70"
          >
            {sending && method === "email" ? "Mengirim..." : "Kirim ke Email"}
          </button>
          <button
            type="button"
            onClick={() => sendOtp("sms")}
            disabled={sending}
            className="flex-1 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold text-sm rounded-xl disabled:opacity-70"
          >
            {sending && method === "sms" ? "Mengirim..." : "Kirim ke SMS"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-green-600 dark:text-green-400">
            Kode OTP telah dikirim via {method === "email" ? "Email" : "SMS"}.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Kode OTP</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Masukkan kode OTP"
              maxLength={6}
              className="w-full px-4 py-3 bg-gray-50/50 dark:bg-[#0f172a]/50 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <button
            type="button"
            onClick={verifyOtp}
            disabled={verifying || otpCode.length < 4}
            className="w-full py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold text-sm rounded-xl disabled:opacity-70"
          >
            {verifying ? "Memverifikasi..." : "Verifikasi & Masuk"}
          </button>
          <button
            type="button"
            onClick={() => { setSent(false); setMethod(null); setOtpCode(""); }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Ganti metode
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="w-full mt-6 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        Kembali ke halaman login
      </button>
    </div>
  );
}
