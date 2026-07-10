"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { normalizeRole } from "@/lib/role-utils";
import {
  MessageCircle,
  ExternalLink,
  Users,
  Headphones,
  ChevronRight,
  Info,
  AlertCircle,
} from "lucide-react";

const REKANAN_ROLES = ["transport", "rekanan"];

export default function SupportPage() {
  const { data: session } = useSession();

  const normalizedRole = useMemo(() => {
    const rawRole = (session?.user as any)?.role as string | undefined;
    return normalizeRole(rawRole);
  }, [session]);

  const isRekananOrTransport = REKANAN_ROLES.includes(normalizedRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 mb-5">
            <Headphones className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
            Pusat Bantuan
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
            Kami siap membantu Anda menyelesaikan kendala yang dihadapi dalam
            penggunaan sistem SISTRO.
          </p>
        </div>

        {/* Main Card */}
        {isRekananOrTransport ? (
          /* Rekanan / Transportir Card */
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-black/40 border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Card header strip */}
            <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />

            <div className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Hubungi Grup WhatsApp
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Sebagai mitra / transportir, silakan laporkan kendala Anda
                    melalui grup WhatsApp yang telah disediakan oleh tim
                    operasional.
                  </p>
                </div>
              </div>

              {/* Info box */}
              <div className="flex gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 mb-6">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-semibold mb-1">Cara melaporkan kendala:</p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-700 dark:text-amber-400">
                    <li>Buka grup WhatsApp operasional yang sudah Anda ikuti.</li>
                    <li>Kirimkan pesan dengan menyebutkan nama, nomor kendaraan, dan deskripsi kendala.</li>
                    <li>Sertakan screenshot jika diperlukan agar tim dapat membantu lebih cepat.</li>
                  </ol>
                </div>
              </div>

              {/* Role badge */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Anda terdeteksi sebagai{" "}
                  <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                    {normalizedRole === "transport" ? "Transportir" : "Rekanan"}
                  </span>
                  . Saluran bantuan untuk peran ini melalui grup WhatsApp.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Internal User Card */
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/60 dark:shadow-black/40 border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Card header strip */}
            <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-500" />

            <div className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    Sistem Tiket Dukungan
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Laporkan kendala teknis atau permintaan melalui portal tiket
                    resmi Pupuk Indonesia.
                  </p>
                </div>
              </div>

              {/* Info box */}
              <div className="flex gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 mb-6">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-semibold mb-1">Cara membuat tiket:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400">
                    <li>Klik tombol di bawah untuk membuka portal dukungan.</li>
                    <li>Isi formulir dengan deskripsi kendala secara lengkap.</li>
                    <li>Tim IT akan merespons tiket Anda secepatnya.</li>
                  </ol>
                </div>
              </div>

              {/* CTA Button */}
              <a
                href="https://pushme.pupuk-indonesia.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between w-full px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span className="flex items-center gap-3">
                  <ExternalLink className="w-5 h-5 opacity-80" />
                  Buka Portal Dukungan
                </span>
                <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </a>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                pushme.pupuk-indonesia.com
              </p>
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
          SISTRO &mdash; Sistem Informasi Transport &amp; Operasi &bull; Pupuk Indonesia Group
        </p>
      </div>
    </div>
  );
}
