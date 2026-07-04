"use client";
import React, { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useStaffAreaStream } from "@/hooks/use-staffarea-stream";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  ShieldCheck, ShieldAlert, TicketCheck, Scan, 
  ArrowUpRight, ArrowDownLeft, Clock, Info, CheckCircle2 
} from "lucide-react";
import Badge from "@/components/ui/badge/Badge";

interface MockScan {
  id: string;
  time: string;
  nopol: string;
  driver: string;
  status: "check-in" | "check-out";
  verification: "valid" | "flagged";
  type: string;
}

export default function SecurityDashboard() {
  const { activeCompanyCode } = useCompany();
  const { data: streamData, status: streamStatus } = useStaffAreaStream(activeCompanyCode);
  const [mounted, setMounted] = useState(false);
  const [scans, setScans] = useState<MockScan[]>([]);

  useEffect(() => {
    setMounted(true);
    // Generate realistic live scans
    const initialScans: MockScan[] = [
      { id: "TKT-550982", time: "10 min ago", nopol: "BG 8192 UA", driver: "Ahmad Fauzi", status: "check-in", verification: "valid", type: "Urea Bagged" },
      { id: "TKT-550711", time: "15 min ago", nopol: "BG 8042 UR", driver: "Budi Santoso", status: "check-out", verification: "valid", type: "NPK Phonska" },
      { id: "TKT-550804", time: "22 min ago", nopol: "L 9104 CR", driver: "Hendra Wijaya", status: "check-in", verification: "valid", type: "Urea Bulk" },
      { id: "TKT-550119", time: "30 min ago", nopol: "B 9382 TQ", driver: "Supriyanto", status: "check-out", verification: "valid", type: "Organik" },
      { id: "TKT-550412", time: "45 min ago", nopol: "DK 8820 PL", driver: "Made Yasa", status: "check-in", verification: "valid", type: "Urea Bagged" },
    ];
    setScans(initialScans);

    // Periodically add new mock scans to make the dashboard feel "alive"
    const interval = setInterval(() => {
      const prefixes = ["BG", "L", "B", "DK", "D", "K"];
      const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const randSuf = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
      const drivers = ["Rudi Hermawan", "Eko Prasetyo", "Slamet Riadi", "Dedi Kurniawan", "Aris Munandar"];
      const products = ["Urea Bagged", "Urea Bulk", "NPK Phonska", "Organik"];
      const randomId = "TKT-" + Math.floor(550000 + Math.random() * 999);
      
      const newScan: MockScan = {
        id: randomId,
        time: "Just now",
        nopol: `${randPrefix} ${randNum} ${randSuf}`,
        driver: drivers[Math.floor(Math.random() * drivers.length)],
        status: Math.random() > 0.5 ? "check-in" : "check-out",
        verification: Math.random() > 0.95 ? "flagged" : "valid",
        type: products[Math.floor(Math.random() * products.length)],
      };

      setScans(prev => [newScan, ...prev.slice(0, 4)].map((s, idx) => ({
        ...s,
        time: idx === 0 ? "Just now" : idx === 1 ? "2 min ago" : `${idx * 8} min ago`
      })));
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const antriAktif = streamData?.antriAktif ?? 0;
  const proses = streamData?.proses ?? 0;
  const selesai = streamData?.selesai ?? 0;
  const overdueCount = streamData?.overdueCount ?? 0;
  const avgDurasiMenit = streamData?.avgDurasiMenit ?? 0;
  const shiftBreakdown = streamData?.shiftBreakdown ?? { pagi: 0, siang: 0, malam: 0 };

  return (
    <div className="space-y-6">
      {/* Real-time Status Banner */}
      <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-100 rounded-2xl dark:bg-brand-900/10 dark:border-brand-900/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white animate-pulse">
            <Scan className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-brand-900 dark:text-brand-300">Gate Checkpoint Live</h3>
            <p className="text-xs text-brand-700 dark:text-brand-400">
              Scanning gate queue tickets & verifications. Stream Status:{" "}
              <span className={`font-semibold capitalize ${streamStatus === "live" ? "text-emerald-600" : "text-amber-500"}`}>
                {streamStatus}
              </span>
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Last Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Security Counters */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="border-gray-200 dark:border-gray-800 transition-all hover:shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Antrian Gerbang</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{antriAktif}</h2>
              <div className="pt-0.5">
                {antriAktif >= 8 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-100/50 dark:border-rose-900/30">
                    Antrian Padat (~{antriAktif * 3} m)
                  </span>
                ) : antriAktif >= 3 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-100/50 dark:border-amber-900/30">
                    Antrian Sedang (~{antriAktif * 2} m)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-100/50 dark:border-emerald-900/30">
                    Lancar (~1 m)
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl dark:bg-amber-900/20 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 transition-all hover:shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Armada di Area</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{proses}</h2>
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-100/50 dark:border-blue-900/30">
                  Loading/Timbang aktif
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-900/20 dark:text-blue-400">
              <TicketCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 transition-all hover:shadow-md">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Armada Keluar</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{selesai}</h2>
              <div className="pt-0.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-100/50 dark:border-emerald-900/30">
                  Selesai hari ini
                </span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl dark:bg-emerald-900/20 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Logs & Operational Warnings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Scans table */}
        <Card className="lg:col-span-2 border-gray-200 dark:border-gray-800">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800 py-4 px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Live Gate Scan Activity</CardTitle>
                <CardDescription className="text-xs text-gray-400">Log verifikasi tiket gerbang masuk & keluar</CardDescription>
              </div>
              <Badge color="info" size="sm">Real-time Feed</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    <th className="py-3 px-5">Time</th>
                    <th className="py-3 px-5">Ticket ID</th>
                    <th className="py-3 px-5">Plat Nomor</th>
                    <th className="py-3 px-5">Driver</th>
                    <th className="py-3 px-5">Product</th>
                    <th className="py-3 px-5 text-center">Action</th>
                    <th className="py-3 px-5 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {scans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-gray-50/40 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-5 font-mono text-gray-400">{scan.time}</td>
                      <td className="py-3 px-5 font-mono font-bold text-gray-700 dark:text-gray-300">{scan.id}</td>
                      <td className="py-3 px-5 font-bold font-mono text-gray-900 dark:text-white">{scan.nopol}</td>
                      <td className="py-3 px-5 text-gray-600 dark:text-gray-400">{scan.driver}</td>
                      <td className="py-3 px-5 text-gray-500">{scan.type}</td>
                      <td className="py-3 px-5 text-center">
                        <div className="inline-flex items-center gap-1">
                          {scan.status === "check-in" ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded uppercase tracking-wider">
                              <ArrowUpRight className="h-3 w-3" /> Check In
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded uppercase tracking-wider">
                              <ArrowDownLeft className="h-3 w-3" /> Check Out
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {scan.verification === "valid" ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                              <ShieldCheck className="h-4 w-4 shrink-0" /> Valid
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 font-semibold text-xs animate-pulse">
                              <ShieldAlert className="h-4 w-4 shrink-0" /> Flagged
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Security Alerts and SOP Quick Reference */}
        <div className="space-y-6">
          {overdueCount > 0 && (
            <Card className="border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-300 shadow-sm animate-in fade-in duration-300">
              <CardContent className="p-4 flex gap-3 items-start">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-wide">Pemberitahuan Overdue</span>
                  <p className="text-xs text-red-700/90 dark:text-red-400/90">
                    Ada <strong>{overdueCount} armada</strong> tertahan di area dalam lebih dari 2 jam.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader className="py-4 px-5 border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Info className="h-4 w-4 text-brand-500" /> Operational Alert Room
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="p-3 bg-red-50 text-red-800 rounded-xl dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30 flex gap-3 text-xs">
                <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <span className="font-bold">Overweight Risk Detection</span>
                  <p className="mt-0.5 text-red-600/80 dark:text-red-400/80">Check-out requires weighing validation slips from JBT before gate checkout approval.</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 flex gap-3 text-xs">
                <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <span className="font-bold">SOP Checkpoint Active</span>
                  <p className="mt-0.5 text-blue-600/80 dark:text-blue-400/80">Every truck entering must have valid booking barcode. Manual entry requires supervisor override.</p>
                </div>
              </div>

              {/* Shift Stats & Average Duration */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durasi Rata-rata</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {avgDurasiMenit} Menit
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Armada Per Shift (Today)</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-gray-800/50 rounded">
                      <span className="block text-[9px] text-gray-400 uppercase">Shift 1</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{shiftBreakdown.pagi}</span>
                    </div>
                    <div className="py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-gray-800/50 rounded">
                      <span className="block text-[9px] text-gray-400 uppercase">Shift 2</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{shiftBreakdown.siang}</span>
                    </div>
                    <div className="py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-gray-800/50 rounded">
                      <span className="block text-[9px] text-gray-400 uppercase">Shift 3</span>
                      <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{shiftBreakdown.malam}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
