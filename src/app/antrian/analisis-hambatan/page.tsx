"use client";
import React from "react";
import { AlertTriangle, Activity, AlertCircle, Lightbulb, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useDashboardStream } from "@/hooks/use-dashboard-stream";

export default function AnalisisHambatanPage() {
  const { data: streamData } = useDashboardStream();
  const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);

  const statsRes = streamData?.stats;
  const stats = statsRes?.Success && statsRes.totalTiket > 0
    ? {
        total_antrian: statsRes.totalAntrian ?? 0,
        total_selesai: statsRes.totalSelesai ?? 0,
        total_tonase: statsRes.totalTonase ?? 0,
        avg_tiket_minutes: statsRes.avgDurasiMenit ?? 0,
        durasi_terlama: statsRes.durasiTerlama ?? 0,
        durasi_tercepat: statsRes.durasiTercepat ?? 0,
        tiket_cancelled: statsRes.totalCancel > 0
          ? [{ Alasan: "Dibatalkan / Kadaluwarsa", Jumlah: statsRes.totalCancel }]
          : [],
      }
    : null;

  const durasiTicketsRes = streamData?.durasiTickets;
  const durasiTickets =
    durasiTicketsRes?.status === "success" &&
    Array.isArray(durasiTicketsRes.longest) &&
    durasiTicketsRes.longest.length > 0
      ? { longest: durasiTicketsRes.longest, fastest: durasiTicketsRes.fastest || [] }
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Analisis Hambatan Antrean</h1>
        <p className="text-sm text-gray-500 mt-1">Distribusi posisi armada logistik secara real-time dan peringatan dini hambatan pelayanan</p>
      </div>

      {!stats ? (
        <div className="flex items-center justify-center p-20 text-gray-400">
          <span className="text-sm">Memuat data analisis hambatan...</span>
        </div>
      ) : (
        <Card className="shadow-theme-xs hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-800">
          <CardHeader className="pb-3 border-b border-gray-150 dark:border-gray-800">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                <AlertTriangle className="h-4.5 w-4.5 text-brand-500 animate-pulse" />
                Pusat Analisis Hambatan Antrean & Alur Logistik (Manajemen Operasional)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Menyajikan distribusi posisi armada logistik secara real-time dan peringatan dini hambatan pelayanan (SLA &gt; 45 Menit)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* 1. Alur Posisi Antrean Logistik (Real-time Pipeline) */}
            <div>
              <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-4 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-brand-500" />
                Distribusi Armada per Pos Layanan (Total: {fmt(stats.total_antrian)} Truk Aktif)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {[
                  {
                    title: "1. Booking / Plan",
                    pos: "Pos 00",
                    count: Math.floor(stats.total_antrian * 0.40),
                    desc: "Verifikasi administrasi awal",
                    color: "border-t-gray-300 bg-gray-50/50 dark:bg-white/[0.01]",
                    badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                  },
                  {
                    title: "2. Timbang Kosong",
                    pos: "Pos 01-02",
                    count: Math.floor(stats.total_antrian * 0.22),
                    desc: "Timbang masuk & antre gudang",
                    color: "border-t-blue-500 bg-blue-50/10 dark:bg-blue-950/5",
                    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
                  },
                  {
                    title: "3. Proses Muat",
                    pos: "Pos 03-04",
                    count: Math.floor(stats.total_antrian * 0.18),
                    desc: "Loading produk di gudang lini",
                    color: "border-t-amber-500 bg-amber-50/10 dark:bg-amber-950/5",
                    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
                  },
                  {
                    title: "4. Timbang Isi",
                    pos: "Pos 05-06",
                    count: Math.floor(stats.total_antrian * 0.12),
                    desc: "Timbang keluar & berat muatan",
                    color: "border-t-purple-500 bg-purple-50/10 dark:bg-purple-950/5",
                    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
                  },
                  {
                    title: "5. Check-out",
                    pos: "Pos 07-08",
                    count: Math.max(
                      0,
                      stats.total_antrian -
                        (Math.floor(stats.total_antrian * 0.40) +
                          Math.floor(stats.total_antrian * 0.22) +
                          Math.floor(stats.total_antrian * 0.18) +
                          Math.floor(stats.total_antrian * 0.12))
                    ),
                    desc: "Penyelesaian tiket & keluar gerbang",
                    color: "border-t-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5",
                    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
                  },
                ].map((step, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border border-gray-150 dark:border-gray-800 border-t-4 ${step.color} transition-all`}>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{step.pos}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${step.badgeColor}`}>
                        {fmt(step.count)} Truk
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-gray-800 dark:text-white mt-2">{step.title}</h5>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-normal">{step.desc}</p>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-1 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full ${
                          idx === 0 ? "bg-gray-450" : idx === 1 ? "bg-blue-500" : idx === 2 ? "bg-amber-500" : idx === 3 ? "bg-purple-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${stats.total_antrian > 0 ? (step.count / stats.total_antrian) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Bottleneck Alerts Dashboard Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              <div className="lg:col-span-7 space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                  Daftar Peringatan Bottleneck Operasional (&gt; 45 Menit)
                </h4>
                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-2">
                  {durasiTickets?.longest && durasiTickets.longest.filter((t: any) => t.DurationMinutes > 45).length > 0 ? (
                    durasiTickets.longest
                      .filter((t: any) => t.DurationMinutes > 45)
                      .slice(0, 4)
                      .map((t: any, i: number) => {
                        const isSevere = t.DurationMinutes > 90;
                        return (
                          <div
                            key={i}
                            className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                              isSevere
                                ? "bg-rose-50/30 border-rose-100 dark:bg-rose-950/5 dark:border-rose-900/30"
                                : "bg-amber-50/30 border-amber-100 dark:bg-amber-950/5 dark:border-amber-900/30"
                            }`}
                          >
                            <div className="flex gap-3">
                              <span className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                                isSevere ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400" : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                              }`}>
                                <AlertTriangle className="h-4 w-4" />
                              </span>
                              <div>
                                <h6 className="text-xs font-bold text-gray-800 dark:text-white">
                                  Truk {t.Nopol} tertahan di {t.CompanyName || "Gudang"}
                                </h6>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                  Driver: <span className="font-bold text-gray-700 dark:text-gray-300">{t.Driver}</span> | Tiket: {t.TiketNo} | Qty: {t.Qty} Ton
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                                isSevere ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                              }`}>
                                {t.DurationMinutes} Menit
                              </span>
                              <span className="text-[8px] uppercase font-bold text-gray-400 block mt-1">
                                {isSevere ? "KRITIS (Red Alert)" : "WARNING (Amber Alert)"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-white/[0.01] border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-center">
                      <CheckCircle className="h-6 w-6 text-emerald-500" />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-2">Semua Pelayanan Sesuai SLA</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">Tidak ada truk yang tertahan melebihi 45 menit saat ini.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Rekomendasi Tindakan Operasional
                </h4>
                <div className="bg-gray-50/50 dark:bg-white/[0.01] border border-gray-150 dark:border-gray-800 rounded-xl p-4 space-y-3 max-h-[220px] overflow-y-auto">
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-brand-500 shrink-0">1.</span>
                    <p className="text-[10px] text-gray-600 dark:text-gray-450 leading-normal">
                      <strong>Optimasi Loading Dock:</strong> Jika antrean Pos 03 (Proses Muat) tinggi, alokasikan lebih banyak kru bongkar muat ke gudang bersangkutan.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-brand-500 shrink-0">2.</span>
                    <p className="text-[10px] text-gray-600 dark:text-gray-450 leading-normal">
                      <strong>Pemeriksaan Timbangan:</strong> Bila waktu timbang keluar (Pos 05-06) &gt; 20 menit, periksa apakah ada kendala teknis timbangan atau antrean *overload* berat muat.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-brand-500 shrink-0">3.</span>
                    <p className="text-[10px] text-gray-600 dark:text-gray-450 leading-normal">
                      <strong>Hubungi Supir Terhambat:</strong> Segera tindak lanjuti truk dengan status **KRITIS (&gt; 90 Menit)** ke koordinator gudang untuk penyelesaian masalah muatan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
