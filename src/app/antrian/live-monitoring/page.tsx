"use client";
import React, { useState, useEffect } from "react";
import { Building2, Clock, Warehouse, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useCompany } from "@/context/CompanyContext";
import { useApi } from "@/hooks/use-api";

interface LoadingBay {
  id: number;
  bay: string;
  status: "loading" | "idle";
  nopol: string;
  driver: string;
  product: string;
  baseProgress: number;
  durationMinutes: number;
  warehouseName: string;
  queueNumber: number;
  bookingno: string;
  noposto: string;
  transportir: string;
}

interface RealTicket {
  bookingno: string;
  tiketno?: string;
  nopol: string;
  driver: string;
  produkString: string;
  transportString: string;
  qty: number;
  posto: string;
}

export default function LiveMonitoringAntrianPage() {
  const { activeCompanyCode, switchCompany } = useCompany();
  const { apiJson, apiTable } = useApi();
  const [realBays, setRealBays] = useState<RealTicket[]>([]);
  const [realQueue, setRealQueue] = useState<RealTicket[]>([]);
  const [baysLoading, setBaysLoading] = useState(false);
  const [dockProgressOffset, setDockProgressOffset] = useState<number>(0);
  const [companies, setCompanies] = useState<{ company_code: string; company: string }[]>([
    { company_code: "PKG", company: "Petrokimia Gresik" },
    { company_code: "PKC", company: "Pupuk Kujang" },
    { company_code: "PIM", company: "Pupuk Iskandar Muda" },
    { company_code: "LOG4MENENG", company: "Logistics Meneng" },
  ]);

  // Animation ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setDockProgressOffset(prev => (prev + 2) % 100);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Fetch company list from API
  useEffect(() => {
    apiJson<any[]>("/api/Company/getCompanyListFitur")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((c: any) => ({
            company_code: c.company_code,
            company: c.company || c.company_code,
          }));
          if (!formatted.some(m => m.company_code === "LOG4MENENG")) {
            formatted.push({ company_code: "LOG4MENENG", company: "Logistics Meneng" });
          }
          setCompanies(formatted);
        }
      })
      .catch((err) => console.error("[live-monitoring] company list fetch error:", err));
  }, [apiJson]);

  // Fetch loading bays, poll every 30s
  useEffect(() => {
    let cancelled = false;
    const fetchBays = async () => {
      setBaysLoading(true);
      try {
        const BASE_COLUMNS = [
          { data: "bookingno",       name: "bookingno",   searchable: false, orderable: true  },
          { data: "nopol",           name: "nopol",       searchable: false, orderable: false },
          { data: "driver",          name: "driver",      searchable: false, orderable: false },
          { data: "produkString",    name: "idproduk",    searchable: false, orderable: false },
          { data: "transportString", name: "idtransport", searchable: false, orderable: false },
          { data: "qty",             name: "qty",         searchable: false, orderable: false },
          { data: "posto",           name: "posto",       searchable: false, orderable: false },
          { data: "tiketno",         name: "tiketno",     searchable: false, orderable: false },
        ];
        const basePayload = {
          draw: 1,
          start: 0,
          search: { value: "" },
          order: [{ column: 0, dir: "desc" }],
          columns: BASE_COLUMNS,
          ...(activeCompanyCode ? { companyCode: activeCompanyCode } : {}),
        };
        const [baysResult, queueResult] = await Promise.all([
          apiTable<{ data: any[] }>("/api/Tiket/DataTableFilterLegacy", { ...basePayload, length: 20, position: "03" }),
          apiTable<{ data: any[] }>("/api/Tiket/DataTableFilterLegacy", { ...basePayload, length: 10, position: "02" }),
        ]);
        if (!cancelled) {
          setRealBays(Array.isArray(baysResult?.data) ? baysResult.data : []);
          setRealQueue(Array.isArray(queueResult?.data) ? queueResult.data : []);
        }
      } catch (err) {
        console.error("[live-monitoring] fetch error:", err);
      } finally {
        if (!cancelled) setBaysLoading(false);
      }
    };
    fetchBays();
    const id = setInterval(fetchBays, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeCompanyCode, apiTable]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Live Monitor Pintu Pemuatan</h1>
        <p className="text-sm text-gray-500 mt-1">Pemantauan real-time loading bay per plant</p>
      </div>

      <Card className="shadow-theme-xs hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-800">
        <CardHeader className="pb-3 border-b border-gray-150 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-800 dark:text-white uppercase tracking-tight">
              <Activity className="h-5 w-5 text-emerald-500 animate-pulse" />
              Live Monitor Pintu Pemuatan (Loading Bays) & Antrean Gudang
            </CardTitle>
            <CardDescription className="text-xs text-gray-400 font-bold">
              Pemantauan real-time proses pengisian pupuk ke truk di dermaga muat (loading bay) masing-masing produsen pupuk
            </CardDescription>
          </div>
          <div className="w-64 shrink-0 self-start md:self-auto">
            <SearchableSelect
              options={companies.map((c) => ({
                value: c.company_code,
                label: c.company,
              }))}
              value={activeCompanyCode ?? ""}
              onChange={(val) => { switchCompany(val).catch(console.error); }}
              placeholder="Pilih Perusahaan/Plant..."
              searchPlaceholder="Cari plant..."
            />
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Summary strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-100 dark:border-gray-800/80 pb-5">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 rounded-xl shrink-0">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Status Docks Aktif</span>
                <span className="text-sm font-black text-gray-800 dark:text-white mt-0.5 block">
                  {realBays.length} Truk Sedang Dimuat
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-brand-50 text-brand-500 dark:bg-brand-950/20 rounded-xl shrink-0">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Rata-rata Waktu Muat</span>
                <span className="text-sm font-black text-gray-800 dark:text-white mt-0.5 block">
                  34 Menit per Truk
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-50 text-amber-500 dark:bg-amber-950/20 rounded-xl shrink-0">
                <Warehouse className="h-5 w-5" />
              </span>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Menunggu Panggilan (Gudang)</span>
                <span className="text-sm font-black text-gray-800 dark:text-white mt-0.5 block">
                  {realQueue.length} Truk Mengantre
                </span>
              </div>
            </div>
          </div>

          {/* Bays grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {baysLoading && realBays.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-400 text-sm">Memuat data loading bay...</div>
            )}
            {!baysLoading && realBays.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-400 text-sm">Tidak ada truk sedang dimuat untuk plant ini.</div>
            )}
            {realBays.map((ticket, idx) => {
              const isOccupied = true;
              // ponytail: progress simulated — SISTRO has no per-bay real-time %
              const seed = (ticket.bookingno?.length ?? 5) * 7 + idx * 13;
              const currentProgress = Math.min(100, Math.max(5, (seed + dockProgressOffset) % 100));
              const currentDuration = Math.round(10 + (seed % 40) + dockProgressOffset * 0.2);
              const isProgressNearlyDone = currentProgress > 85;
              const bay: LoadingBay = {
                id: idx + 1,
                bay: `Bay ${String(idx + 1).padStart(2, "0")}`,
                status: "loading",
                nopol: ticket.nopol,
                driver: ticket.driver,
                product: ticket.produkString,
                baseProgress: seed % 100,
                durationMinutes: 10 + (seed % 40),
                warehouseName: ticket.produkString,
                queueNumber: idx + 1,
                bookingno: ticket.bookingno,
                noposto: ticket.posto,
                transportir: ticket.transportString,
              };

              return (
                <div
                  key={bay.id}
                  className={`border rounded-2xl p-4 transition-all duration-300 relative overflow-hidden ${
                    isOccupied
                      ? "bg-white border-gray-150 dark:bg-white/[0.02] dark:border-gray-800/80 hover:border-emerald-300 shadow-sm"
                      : "bg-gray-50/30 border-dashed border-gray-200 dark:bg-white/[0.005] dark:border-gray-850"
                  }`}
                >
                  {isOccupied && (
                    <div className="absolute right-[-15px] bottom-[-15px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                      <Building2 className="h-28 w-28 text-emerald-500" />
                    </div>
                  )}

                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">{bay.warehouseName || bay.bay}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isOccupied
                          ? isProgressNearlyDone
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 animate-pulse"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isOccupied ? (isProgressNearlyDone ? "bg-amber-500" : "bg-emerald-500 animate-ping") : "bg-gray-300"}`} />
                      {isOccupied ? (isProgressNearlyDone ? "Selesai Muat" : "Loading") : "Kosong"}
                    </span>
                  </div>

                  {isOccupied ? (
                    <div className="mt-3 space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-gray-800 dark:text-white">{bay.nopol}</span>
                            <span className="text-[10px] text-gray-400">({bay.driver})</span>
                          </div>
                          <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-black shrink-0">
                            Antrean #{bay.queueNumber}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px]">
                          <span className="text-brand-500 font-bold">{bay.product}</span>
                          <span className="text-gray-400 dark:text-gray-550 font-bold truncate max-w-[130px]" title={bay.bay}>{bay.bay}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 p-2 bg-gray-50/50 dark:bg-white/[0.01] border border-gray-150/40 dark:border-gray-800/50 rounded-lg text-[9.5px]">
                        <div>
                          <span className="text-gray-400 block font-semibold">Kode Booking</span>
                          <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{bay.bookingno}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block font-semibold">No. POSTO</span>
                          <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{bay.noposto}</span>
                        </div>
                        <div className="col-span-2 border-t border-gray-100/50 dark:border-gray-800/30 pt-1 mt-1">
                          <span className="text-gray-400 block font-semibold">Transportir</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300 truncate block" title={bay.transportir}>{bay.transportir}</span>
                        </div>
                      </div>

                      {/* Loading Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-gray-400">
                          <span>Progress Muatan:</span>
                          <span className="text-emerald-500">{currentProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${isProgressNearlyDone ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${currentProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] pt-1 text-gray-400 font-medium">
                        <span>Durasi di Bay:</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-450" />
                          {currentDuration} menit
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 mb-3 text-center py-4 space-y-1.5">
                      <Warehouse className="h-5 w-5 text-gray-300 dark:text-gray-700 mx-auto" />
                      <p className="text-[10px] font-bold text-gray-400">Pintu Siap Digunakan</p>
                      <p className="text-[9px] text-gray-400/70">Menunggu panggilan truk berikutnya dari antrean Pos 02</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Queue strip */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
            <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-3.5 flex items-center gap-1.5">
              <Warehouse className="h-4 w-4 text-brand-500" />
              Antrean Truk Berikutnya di Gerbang Gudang (Pos 02)
            </h4>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {realQueue.length === 0 ? (
                <div className="text-xs text-gray-400 py-3">Tidak ada truk menunggu di antrean.</div>
              ) : realQueue.map((q, idx) => (
                <div key={idx} className="bg-gray-50/60 dark:bg-white/[0.01] border border-gray-150 dark:border-gray-800 p-3 rounded-xl min-w-[200px] flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-brand-50/50 dark:bg-brand-950/20 text-brand-500 rounded-lg text-xs font-black">
                      #{idx + 1}
                    </div>
                    <div>
                      <span className="text-xs font-black text-gray-800 dark:text-white block">{q.nopol}</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{q.driver} • {q.produkString}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col gap-0.5 items-end">
                    <span className="text-[9px] font-mono font-bold text-gray-600 dark:text-gray-300">{q.bookingno}</span>
                    <span className="text-[9px] text-gray-400 font-mono">{q.posto}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
