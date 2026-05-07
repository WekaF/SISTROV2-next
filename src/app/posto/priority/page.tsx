"use client";
import { useState, useEffect, useCallback } from "react";
import {
  SortAsc, Search, RefreshCw, CheckCircle2, Loader2,
  Package, Truck, TriangleAlert, ChevronDown, ChevronUp, Warehouse,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge/Badge";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { useCompany } from "@/context/CompanyContext";

type Gudang = {
  idgudang: string;
  namagudang: string;
};

type PostoItem = {
  id: number;
  noposto: string;
  tujuan: string;
  transportString: string;
  produkString: string;
  qty: number;
  qtyrealisasi: number;
  qtysisaRealisasi: number;
  status: string;
  enabled: boolean;
};

export default function PostoPriorityPage() {
  const { apiJson, apiFetch } = useApi();
  const { addToast } = useToast();
  const { activeCompanyCode } = useCompany();

  const [gudangList, setGudangList] = useState<Gudang[]>([]);
  const [selectedGudang, setSelectedGudang] = useState<Set<string>>(new Set());
  const [postoItems, setPostoItems] = useState<PostoItem[]>([]);
  const [loadingGudang, setLoadingGudang] = useState(true);
  const [loadingPosto, setLoadingPosto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showGudangPanel, setShowGudangPanel] = useState(true);

  // Load warehouse list on mount
  useEffect(() => {
    async function fetchGudang() {
      setLoadingGudang(true);
      try {
        const data = await apiJson<Gudang[]>("/api/Gudang/Data");
        setGudangList(Array.isArray(data) ? data : []);
      } catch {
        addToast({ title: "Error", description: "Gagal memuat daftar gudang", variant: "destructive" });
      } finally {
        setLoadingGudang(false);
      }
    }
    fetchGudang();
  }, []);

  const fetchPrioritas = useCallback(async () => {
    if (selectedGudang.size === 0) {
      setPostoItems([]);
      return;
    }
    setLoadingPosto(true);
    try {
      const params = new URLSearchParams();
      params.append("draw", "1");
      params.append("start", "0");
      params.append("length", "-1");
      params.append("search[value]", "");
      params.append("search[regex]", "false");
      params.append("order[0][column]", "0");
      params.append("order[0][dir]", "asc");
      params.append("columns[0][data]", "tujuan");
      params.append("columns[0][name]", "tujuan");
      params.append("columns[0][searchable]", "true");
      params.append("columns[0][orderable]", "true");
      if (activeCompanyCode) params.append("companyCode", activeCompanyCode);
      selectedGudang.forEach((id) => params.append("gudang[]", id));

      const res = await apiFetch("/api/POSTO/DatatablePrioritas", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const result = await res.json().catch(() => ({ data: [] }));
      const items: PostoItem[] = (result.data ?? []).map((x: any) => ({
        id: x.id,
        noposto: x.noposto,
        tujuan: x.tujuan,
        transportString: x.transportString,
        produkString: x.produkString,
        qty: x.qty ?? 0,
        qtyrealisasi: x.qtyrealisasi ?? 0,
        qtysisaRealisasi: x.qtysisaRealisasi ?? 0,
        status: x.status ?? "0",
        enabled: x.status === "1" || (typeof x.status === "string" && x.status.includes("checked")),
      }));
      setPostoItems(items);
      setShowGudangPanel(false);
    } catch (err: any) {
      addToast({ title: "Error", description: "Gagal memuat data prioritas: " + (err.message ?? ""), variant: "destructive" });
    } finally {
      setLoadingPosto(false);
    }
  }, [selectedGudang, activeCompanyCode]);

  const toggleGudang = (id: string) => {
    setSelectedGudang((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedGudang.size === gudangList.length) {
      setSelectedGudang(new Set());
    } else {
      setSelectedGudang(new Set(gudangList.map((g) => g.idgudang)));
    }
  };

  const toggleItemStatus = (noposto: string) => {
    setPostoItems((prev) =>
      prev.map((item) =>
        item.noposto === noposto ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const toggleAllItems = (value: boolean) => {
    setPostoItems((prev) => prev.map((item) => ({ ...item, enabled: value })));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const params = new URLSearchParams();
      postoItems.forEach((item, i) => {
        params.append(`noposto[${i}]`, item.noposto);
        params.append(`status[${i}]`, item.enabled ? "1" : "0");
      });

      const res = await apiFetch("/POSTO/UpdatePOSTO", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (res.ok) {
        addToast({ title: "Berhasil", description: "Status prioritas POSTO berhasil diperbarui.", variant: "success" });
        await fetchPrioritas();
      } else {
        addToast({ title: "Peringatan", description: "Perubahan diterapkan secara lokal. Pastikan sesi aktif di aplikasi utama.", variant: "default" });
      }
    } catch {
      addToast({ title: "Info", description: "Perubahan diterapkan secara lokal.", variant: "default" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = postoItems.filter(
    (item) =>
      !search ||
      item.noposto.toLowerCase().includes(search.toLowerCase()) ||
      item.transportString?.toLowerCase().includes(search.toLowerCase()) ||
      item.produkString?.toLowerCase().includes(search.toLowerCase()) ||
      item.tujuan?.toLowerCase().includes(search.toLowerCase())
  );

  const enabledCount = postoItems.filter((i) => i.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <SortAsc className="h-6 w-6 text-brand-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prioritas Tujuan Muat</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Atur status aktif/nonaktif dokumen POSTO per tujuan gudang untuk mengontrol antrian pemuatan.
          </p>
        </div>
        {postoItems.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchPrioritas} disabled={loadingPosto}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingPosto ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 text-white shadow shadow-brand-500/20"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Simpan Prioritas
            </Button>
          </div>
        )}
      </div>

      {/* Gudang selector */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setShowGudangPanel((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-gray-400" />
              <div>
                <CardTitle className="text-base">
                  Pilih Gudang Tujuan
                  {selectedGudang.size > 0 && (
                    <Badge color="info" size="sm" className="ml-2">{selectedGudang.size} dipilih</Badge>
                  )}
                </CardTitle>
                <CardDescription>Pilih satu atau lebih gudang untuk melihat daftar POSTO-nya</CardDescription>
              </div>
            </div>
            {showGudangPanel ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </CardHeader>

        {showGudangPanel && (
          <CardContent>
            {loadingGudang ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat daftar gudang...
              </div>
            ) : gudangList.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">Tidak ada gudang tersedia.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={toggleAll}
                    className="text-xs font-medium text-brand-500 hover:text-brand-600 underline underline-offset-2"
                  >
                    {selectedGudang.size === gudangList.length ? "Batal Semua" : "Pilih Semua"}
                  </button>
                  <span className="text-gray-300 dark:text-gray-700">|</span>
                  <span className="text-xs text-gray-400">{gudangList.length} gudang tersedia</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {gudangList.map((g) => {
                    const active = selectedGudang.has(g.idgudang);
                    return (
                      <button
                        key={g.idgudang}
                        onClick={() => toggleGudang(g.idgudang)}
                        className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          active
                            ? "bg-brand-50 border-brand-400 text-brand-700 dark:bg-brand-900/30 dark:border-brand-600 dark:text-brand-300"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
                        }`}
                      >
                        <div className="font-bold text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
                          {g.idgudang}
                        </div>
                        {g.namagudang}
                        {active && <CheckCircle2 className="h-3 w-3 text-brand-500 float-right mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <Button
                    disabled={selectedGudang.size === 0 || loadingPosto}
                    onClick={fetchPrioritas}
                    className="w-full sm:w-auto"
                  >
                    {loadingPosto ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <SortAsc className="h-4 w-4 mr-2" />}
                    Tampilkan POSTO ({selectedGudang.size} gudang)
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        )}
      </Card>

      {/* POSTO priority list */}
      {(loadingPosto || postoItems.length > 0) && (
        <Card>
          <CardHeader className="border-b dark:border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <CardTitle className="text-base">
                  Daftar POSTO
                  {postoItems.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      ({enabledCount} aktif / {postoItems.length} total)
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Aktifkan toggle untuk memprioritaskan dokumen POSTO dalam antrian pemuatan.
                </CardDescription>
              </div>
              {postoItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      className="pl-9 h-8 w-52 text-xs"
                      placeholder="Cari POSTO, transportir..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => toggleAllItems(true)}>
                    Aktifkan Semua
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20" onClick={() => toggleAllItems(false)}>
                    Nonaktif Semua
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingPosto ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Memuat data prioritas...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <SortAsc className="h-10 w-10" />
                <p className="text-sm font-medium">Tidak ada data POSTO</p>
                <p className="text-xs">Coba ubah filter pencarian atau pilih gudang lain.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {/* Group by destination */}
                {Array.from(new Set(filtered.map((i) => i.tujuan))).map((tujuan) => {
                  const group = filtered.filter((i) => i.tujuan === tujuan);
                  return (
                    <div key={tujuan}>
                      <div className="px-4 py-2 bg-gray-50 dark:bg-white/[0.02] border-b dark:border-gray-800 flex items-center gap-2">
                        <Warehouse className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Tujuan: {tujuan}
                        </span>
                        <span className="text-[10px] text-gray-400">({group.length} POSTO)</span>
                      </div>
                      {group.map((item) => (
                        <div
                          key={item.noposto}
                          className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors ${
                            item.enabled ? "" : "opacity-60"
                          }`}
                        >
                          {/* Toggle */}
                          <button
                            onClick={() => toggleItemStatus(item.noposto)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              item.enabled
                                ? "bg-brand-500 dark:bg-brand-600"
                                : "bg-gray-200 dark:bg-gray-700"
                            }`}
                            role="switch"
                            aria-checked={item.enabled}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                item.enabled ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>

                          {/* POSTO info */}
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">No POSTO</p>
                              <p className="font-mono font-bold text-sm text-gray-900 dark:text-white truncate">
                                {item.noposto}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5 flex items-center gap-1">
                                <Truck className="h-3 w-3" /> Transportir
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.transportString || "-"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5 flex items-center gap-1">
                                <Package className="h-3 w-3" /> Produk
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.produkString || "-"}</p>
                            </div>
                            <div className="text-right md:text-left">
                              <p className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Qty / Sisa</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {(item.qty || 0).toLocaleString()}
                                <span className="text-gray-400 font-normal text-xs ml-1">T</span>
                              </p>
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                Realisasi: {(item.qtyrealisasi || 0).toLocaleString()} T
                              </p>
                            </div>
                          </div>

                          {/* Status badge */}
                          <div className="shrink-0">
                            <Badge color={item.enabled ? "success" : "light"} size="sm">
                              {item.enabled ? "Aktif" : "Non Aktif"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info banner */}
      {postoItems.length === 0 && !loadingPosto && selectedGudang.size === 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
          <TriangleAlert className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-400">
            <p className="font-bold mb-1">Cara Penggunaan:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Pilih satu atau lebih gudang tujuan dari panel di atas.</li>
              <li>Klik <strong>Tampilkan POSTO</strong> untuk melihat daftar dokumen aktif.</li>
              <li>Aktifkan/nonaktifkan toggle pada setiap dokumen POSTO.</li>
              <li>Klik <strong>Simpan Prioritas</strong> untuk menyimpan perubahan.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
