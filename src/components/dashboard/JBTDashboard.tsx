"use client";
import React, { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import { useStaffAreaStream } from "@/hooks/use-staffarea-stream";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  Scale, ClipboardCheck, Printer, AlertCircle,
  Clock, CheckCircle2, FileText, ArrowRightLeft 
} from "lucide-react";
import Badge from "@/components/ui/badge/Badge";

interface MockWeighing {
  id: string;
  nopol: string;
  driver: string;
  produk: string;
  bruto: number;
  tara: number;
  netto: number;
  status: "kosong" | "isi" | "selesai";
  time: string;
}

export default function JBTDashboard() {
  const { activeCompanyCode } = useCompany();
  const { data: streamData, status: streamStatus } = useStaffAreaStream(activeCompanyCode);
  const [mounted, setMounted] = useState(false);
  const [weighings, setWeighings] = useState<MockWeighing[]>([]);

  useEffect(() => {
    setMounted(true);
    const initialWeighings: MockWeighing[] = [
      { id: "TKT-550982", nopol: "BG 8192 UA", driver: "Ahmad Fauzi", produk: "Urea Bagged", bruto: 18450, tara: 8450, netto: 10000, status: "selesai", time: "5 min ago" },
      { id: "TKT-550711", nopol: "BG 8042 UR", driver: "Budi Santoso", produk: "NPK Phonska", bruto: 23200, tara: 8200, netto: 15000, status: "selesai", time: "12 min ago" },
      { id: "TKT-550804", nopol: "L 9104 CR", driver: "Hendra Wijaya", produk: "Urea Bulk", bruto: 0, tara: 8500, netto: 0, status: "kosong", time: "20 min ago" },
      { id: "TKT-550119", nopol: "B 9382 TQ", driver: "Supriyanto", produk: "Organik", bruto: 20120, tara: 8120, netto: 12000, status: "selesai", time: "28 min ago" },
    ];
    setWeighings(initialWeighings);

    // Periodically simulate weighing transitions
    const interval = setInterval(() => {
      setWeighings(prev => {
        // Find the one that is 'kosong' and make it loaded ('selesai')
        const updated = prev.map(w => {
          if (w.status === "kosong") {
            return {
              ...w,
              bruto: w.tara + 12000,
              netto: 12000,
              status: "selesai" as const,
              time: "Just now"
            };
          }
          return w;
        });

        // Add a brand new truck waiting to weigh empty (tara)
        const prefixes = ["BG", "L", "B", "DK"];
        const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randNum = Math.floor(1000 + Math.random() * 9000);
        const randSuf = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
        const drivers = ["Danang Prasetyo", "Arif Budiman", "Joko Susilo", "Harianto"];
        const products = ["Urea Bagged", "Urea Bulk", "NPK Phonska"];
        const randomId = "TKT-" + Math.floor(550000 + Math.random() * 999);
        const taraWeight = Math.floor(7800 + Math.random() * 900);

        const newWeigh: MockWeighing = {
          id: randomId,
          nopol: `${randPrefix} ${randNum} ${randSuf}`,
          driver: drivers[Math.floor(Math.random() * drivers.length)],
          produk: products[Math.floor(Math.random() * products.length)],
          tara: taraWeight,
          bruto: 0,
          netto: 0,
          status: "kosong",
          time: "Just now"
        };

        return [newWeigh, ...updated.slice(0, 3)].map((w, idx) => ({
          ...w,
          time: idx === 0 ? "Just now" : idx === 1 ? "4 min ago" : `${idx * 7} min ago`
        }));
      });
    }, 25000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const antriAktif = streamData?.antriAktif ?? 0;
  const proses = streamData?.proses ?? 0;
  const selesai = streamData?.selesai ?? 0;
  const totalTonase = streamData?.totalTonase ?? 0;

  return (
    <div className="space-y-6">
      {/* Real-time Status Banner */}
      <div className="flex items-center justify-between p-4 bg-teal-50 border border-teal-100 rounded-2xl dark:bg-teal-900/10 dark:border-teal-900/20">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-teal-900 dark:text-teal-300">Weighbridge (JBT) Station Monitor</h3>
            <p className="text-xs text-teal-700 dark:text-teal-400">
              Measuring Bruto, Tara, Netto weights per vehicle. Stream:{" "}
              <span className={`font-semibold capitalize ${streamStatus === "live" ? "text-emerald-600" : "text-amber-500"}`}>
                {streamStatus}
              </span>
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Sensor State: <span className="text-emerald-600 font-bold">ONLINE (CALIBRATED)</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Antri Timbang Kosong</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{antriAktif}</h2>
              <p className="text-[10px] text-gray-400">Truk menunggu tara check</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl dark:bg-amber-900/20">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Antri Timbang Isi</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{proses}</h2>
              <p className="text-[10px] text-gray-400">Truk menunggu bruto check</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-900/20">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selesai Ditimbang</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">{selesai}</h2>
              <p className="text-[10px] text-gray-400">Armada ditimbang hari ini</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl dark:bg-emerald-900/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Netto Muatan</span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-mono">
                {totalTonase.toLocaleString("id-ID")} <span className="text-sm font-bold text-gray-500">T</span>
              </h2>
              <p className="text-[10px] text-gray-400">Total berat bersih keluar</p>
            </div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl dark:bg-teal-900/20">
              <Scale className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weighing Activity */}
        <Card className="lg:col-span-2 border-gray-200 dark:border-gray-800">
          <CardHeader className="py-4 px-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-gray-900 dark:text-white">Recent Penimbangan Logs</CardTitle>
              <CardDescription className="text-xs text-gray-400">Catatan penimbangan bruto, tara, dan netto teraktual</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    <th className="py-3 px-5">Time</th>
                    <th className="py-3 px-5">Plat Nomor</th>
                    <th className="py-3 px-5">Driver</th>
                    <th className="py-3 px-5">Product</th>
                    <th className="py-3 px-5">Tara (Kg)</th>
                    <th className="py-3 px-5">Bruto (Kg)</th>
                    <th className="py-3 px-5">Netto (Kg)</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {weighings.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/40 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-5 font-mono text-gray-400">{item.time}</td>
                      <td className="py-3 px-5 font-bold font-mono text-gray-900 dark:text-white">{item.nopol}</td>
                      <td className="py-3 px-5 text-gray-600 dark:text-gray-400">{item.driver}</td>
                      <td className="py-3 px-5 text-gray-500">{item.produk}</td>
                      <td className="py-3 px-5 font-mono">{item.tara.toLocaleString("id-ID")}</td>
                      <td className="py-3 px-5 font-mono">{item.bruto > 0 ? item.bruto.toLocaleString("id-ID") : "-"}</td>
                      <td className="py-3 px-5 font-bold font-mono text-brand-600 dark:text-brand-400">
                        {item.netto > 0 ? item.netto.toLocaleString("id-ID") : "-"}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex justify-end gap-1.5 items-center">
                          {item.status === "selesai" ? (
                            <>
                              <Badge color="success" size="sm">Selesai</Badge>
                              <button 
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 transition-colors"
                                title="Print Weigh Slip"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : item.status === "kosong" ? (
                            <Badge color="warning" size="sm">Timbang Tara</Badge>
                          ) : (
                            <Badge color="info" size="sm">Timbang Bruto</Badge>
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

        {/* Weighing station calibration / alert warnings */}
        <div className="space-y-6">
          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader className="py-4 px-5 border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-brand-500" /> Weighing Alerts & Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 text-amber-800 rounded-xl dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 flex gap-3 text-xs">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <span className="font-bold">Zero ODOL Compliance</span>
                  <p className="mt-0.5 text-amber-600/80 dark:text-amber-400/80">
                    Netto weight exceeding the maximum allowed capacity for truck class will block ticket sign-off and exit gate checkout.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 flex gap-3 text-xs">
                <ClipboardCheck className="h-5 w-5 shrink-0 text-blue-600" />
                <div>
                  <span className="font-bold">Daily Calibration Check</span>
                  <p className="mt-0.5 text-blue-600/80 dark:text-blue-400/80">
                    Scale calibration verified at 06:00 UTC. Next verification at 22:00 UTC. Zero point balance is stable.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
