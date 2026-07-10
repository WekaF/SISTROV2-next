"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/context/ThemeContext";
import {
  Sun,
  Moon,
  Monitor,
  LogOut,
  Shield,
  History,
  Settings,
  User,
  Building2,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────
type AuditLog = {
  id: number;
  eventType: "LOGIN" | "LOGIN_FAILED" | "LOGOUT";
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  metadata: any;
};

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function parseUserAgent(ua: string | null): string {
  if (!ua) return "Tidak diketahui";
  if (/mobile/i.test(ua)) return "Perangkat Mobile";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  if (/edge/i.test(ua)) return "Edge";
  return "Browser Lain";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function normalizeRoleLabel(role: string | undefined): string {
  if (!role) return "-";
  const map: Record<string, string> = {
    superadmin: "Super Admin",
    admin: "Admin",
    candal: "Candal",
    staffarea: "Staff Area",
    transport: "Transportir",
    rekanan: "Rekanan",
    viewer: "Viewer",
    gudang: "Gudang",
    security: "Security",
    jembatan_timbang: "Jembatan Timbang",
    pod: "POD / Armada",
    pkd: "Pelabuhan / Terminal",
  };
  return map[role.toLowerCase()] ?? role;
}

// ──────────────────────────────────────────────────────────
// Event badge
// ──────────────────────────────────────────────────────────
function EventBadge({ type }: { type: AuditLog["eventType"] }) {
  const cfg = {
    LOGIN: {
      label: "Login",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      Icon: CheckCircle2,
    },
    LOGIN_FAILED: {
      label: "Gagal Login",
      cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      Icon: XCircle,
    },
    LOGOUT: {
      label: "Logout",
      cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      Icon: LogOut,
    },
  }[type];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}
    >
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<"tampilan" | "sesi" | "riwayat">("tampilan");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const user = session?.user as any;

  // Fetch login history when tab is opened
  useEffect(() => {
    if (activeTab === "riwayat" && logs.length === 0) {
      fetchLogs();
    }
  }, [activeTab]);

  async function fetchLogs() {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await fetch("/api/settings/login-history");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat data");
      setLogs(json.logs ?? []);
    } catch (e: any) {
      setLogsError(e.message);
    } finally {
      setLogsLoading(false);
    }
  }

  const tabs = [
    { id: "tampilan" as const, label: "Tampilan", icon: Monitor },
    { id: "sesi" as const, label: "Sesi Aktif", icon: Shield },
    { id: "riwayat" as const, label: "Riwayat Login", icon: History },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950/20 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Pengaturan
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Kelola preferensi dan keamanan akun Anda
            </p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 p-1 bg-white/70 dark:bg-gray-900/70 backdrop-blur border border-gray-200 dark:border-gray-800 rounded-xl mb-6 shadow-sm">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === id
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab: Tampilan ── */}
        {activeTab === "tampilan" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-200/40 dark:shadow-black/30 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400" />
            <div className="p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Tema Tampilan
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Pilih tampilan yang nyaman untuk Anda
              </p>

              <div className="grid grid-cols-2 gap-4">
                {/* Light mode */}
                <button
                  onClick={() => theme === "dark" && toggleTheme()}
                  className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 ${
                    theme === "light"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md shadow-blue-500/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
                  }`}
                >
                  {theme === "light" && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center shadow-lg shadow-amber-400/30">
                    <Sun className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Terang
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Cocok untuk penggunaan siang hari
                  </span>
                </button>

                {/* Dark mode */}
                <button
                  onClick={() => theme === "light" && toggleTheme()}
                  className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-200 ${
                    theme === "dark"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-md shadow-blue-500/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
                  }`}
                >
                  {theme === "dark" && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Moon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Gelap
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Nyaman di lingkungan redup
                  </span>
                </button>
              </div>

              <p className="mt-4 text-xs text-center text-gray-400 dark:text-gray-600">
                Preferensi tersimpan otomatis di perangkat ini
              </p>
            </div>
          </div>
        )}

        {/* ── Tab: Sesi Aktif ── */}
        {activeTab === "sesi" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-200/40 dark:shadow-black/30 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
            <div className="p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Sesi Aktif
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Detail sesi login Anda saat ini
              </p>

              {/* Session card */}
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/10 p-5 mb-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    Sesi Aktif — Perangkat Ini
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Pengguna</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {user?.name || user?.username || "-"}
                        {user?.username && user?.name && (
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            (@{user.username})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {normalizeRoleLabel(user?.role)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Perusahaan</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {user?.companyCode || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Smartphone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Perangkat</p>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {typeof window !== "undefined"
                          ? parseUserAgent(navigator.userAgent)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info note */}
              <div className="flex gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 mb-5">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  SISTRO menggunakan token sesi. Jika akun Anda digunakan di perangkat lain,
                  Anda akan otomatis diminta login ulang.
                </p>
              </div>

              {/* Logout button */}
              <button
                onClick={async () => {
                  setLogoutLoading(true);
                  await signOut({ callbackUrl: "/login" });
                }}
                disabled={logoutLoading}
                className="flex items-center justify-between w-full px-5 py-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200 group disabled:opacity-60"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <LogOut className="w-4 h-4" />
                  {logoutLoading ? "Keluar..." : "Keluar dari Sesi Ini"}
                </span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Riwayat Login ── */}
        {activeTab === "riwayat" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-200/40 dark:shadow-black/30 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-violet-400 via-purple-500 to-pink-500" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Riwayat Login
                </h2>
                <button
                  onClick={fetchLogs}
                  disabled={logsLoading}
                  className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin" : ""}`} />
                  Perbarui
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                20 aktivitas login terbaru pada akun Anda
              </p>

              {/* Loading */}
              {logsLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Memuat riwayat...</p>
                </div>
              )}

              {/* Error */}
              {logsError && !logsLoading && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">{logsError}</p>
                </div>
              )}

              {/* Empty */}
              {!logsLoading && !logsError && logs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                  <History className="w-10 h-10 opacity-40" />
                  <p className="text-sm">Belum ada riwayat login</p>
                </div>
              )}

              {/* Log list */}
              {!logsLoading && logs.length > 0 && (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
                    >
                      {/* Event icon */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          log.eventType === "LOGIN"
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : log.eventType === "LOGIN_FAILED"
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        {log.eventType === "LOGIN" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                        {log.eventType === "LOGIN_FAILED" && (
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                        {log.eventType === "LOGOUT" && (
                          <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <EventBadge type={log.eventType} />
                          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {log.ipAddress && (
                            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Globe className="w-3 h-3" />
                              {log.ipAddress}
                            </span>
                          )}
                          {log.userAgent && (
                            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Smartphone className="w-3 h-3" />
                              {parseUserAgent(log.userAgent)}
                            </span>
                          )}
                          {log.eventType === "LOGIN_FAILED" && log.metadata?.reason && (
                            <span className="text-xs text-red-500 dark:text-red-400 truncate max-w-[200px]">
                              {String(log.metadata.reason)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
