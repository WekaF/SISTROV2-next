"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Ticket, Loader2, Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { API_BASE } from "@/lib/api-client";
import { useTheme } from "@/context/ThemeContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TiketRow {
  number: number;
  bookingno: string;
  tiketno: string;
  tanggalString: string;
  nopol: string;
  driver: string;
  produkString: string;
  tujuan: string;
  qty: number | null;
  positionString: string;
  position: string;
  transportString: string;
}

interface KuotaRow {
  number: number;
  tanggalString: string;
  shift: number;
  namaproduk: string;
  kuota: number;
  kuota_terpesan: number;
  kuota_in: number | null;
  kuota_out: number | null;
  status: string;
  wilayahString: string;
  bagianString: string;
}

interface DtResponse<T> {
  data: T[];
  draw: string;
  recordsTotal: number;
  recordsFiltered: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function positionColor(pos: string) {
  const map: Record<string, string> = {
    "01": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "02": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    "03": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    "04": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    "05": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    "06": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    "07": "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };
  return map[pos] ?? "bg-muted text-muted-foreground dark:bg-gray-850 dark:text-gray-450";
}

function Pagination({
  page, pageSize, total, onPage, onPageSize,
}: {
  page: number; pageSize: number; total: number;
  onPage: (p: number) => void; onPageSize: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mt-3 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground dark:text-gray-400">
        <span>Tampil</span>
        <select
          className="border border-gray-300 dark:border-gray-650 rounded px-2 py-1 text-sm bg-background text-foreground"
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
        >
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span>dari {total.toLocaleString()} data</span>
        {total > 0 && <span>({from}–{to})</span>}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="p-1.5 rounded border border-gray-300 dark:border-gray-650 hover:bg-muted dark:hover:bg-gray-700 disabled:opacity-30 transition-colors bg-white dark:bg-gray-800 text-foreground cursor-pointer"
        ><ChevronLeft className="w-4 h-4" /></button>
        <span className="px-3 py-1 border border-gray-300 dark:border-gray-650 rounded bg-muted dark:bg-gray-700 text-xs font-medium text-foreground">{page} / {totalPages}</span>
        <button
          onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          className="p-1.5 rounded border border-gray-300 dark:border-gray-650 hover:bg-muted dark:hover:bg-gray-700 disabled:opacity-30 transition-colors bg-white dark:bg-gray-800 text-foreground cursor-pointer"
        ><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

// ─── Tiket Datatable ──────────────────────────────────────────────────────────

function TiketTable({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [rows, setRows] = useState<TiketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const drawRef = useRef(0);

  const fetch_ = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    drawRef.current += 1;
    const draw = drawRef.current;
    const body = new URLSearchParams({
      draw: String(draw),
      start: String((page - 1) * pageSize),
      length: String(pageSize),
      "search[value]": search,
      "order[0][column]": "0",
      "order[0][dir]": "desc",
      "columns[0][name]": "tanggal",
    });
    try {
      const res = await fetch(`${API_BASE}/api/Tiket/DataTableFilterLegacy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error();
      const json: DtResponse<TiketRow> = await res.json();
      if (Number(json.draw) >= draw) {
        setRows(json.data);
        setTotal(json.recordsFiltered);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [token, page, pageSize, search]);

  useEffect(() => { fetch_(); }, [fetch_]);

  function handleSearch() { setSearch(searchInput); setPage(1); }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground dark:text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Cari booking, nopol, produk..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <button onClick={handleSearch} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-muted dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-foreground transition-colors cursor-pointer">
          Cari
        </button>
        <button onClick={fetch_} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-muted dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-foreground transition-colors cursor-pointer" title="Refresh">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground dark:text-gray-400" />}
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800/40">
        <table className="w-full text-sm text-gray-700 dark:text-gray-300">
          <thead className="bg-muted/60 dark:bg-gray-850 text-xs text-muted-foreground dark:text-gray-400 border-b border-gray-250 dark:border-gray-700">
            <tr>
              {["#", "Booking", "Tiket", "Tanggal", "Nopol", "Driver", "Produk", "Gudang Tujuan", "Qty (ton)", "Status"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr><td colSpan={10} className="text-center py-10 text-muted-foreground dark:text-gray-400 bg-white dark:bg-gray-850/40">Tidak ada data</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.bookingno + r.tiketno} className="border-t border-gray-200 dark:border-gray-700 hover:bg-muted/30 dark:hover:bg-gray-800/60 transition-colors bg-white dark:bg-gray-800/20">
                <td className="px-3 py-2 text-muted-foreground dark:text-gray-400">{r.number}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-900 dark:text-white">{r.bookingno}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-900 dark:text-white">{r.tiketno}</td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-white">{r.tanggalString}</td>
                <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{r.nopol}</td>
                <td className="px-3 py-2 text-gray-900 dark:text-white">{r.driver}</td>
                <td className="px-3 py-2 text-gray-900 dark:text-white">{r.produkString}</td>
                <td className="px-3 py-2 text-gray-900 dark:text-white">{r.tujuan}</td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{r.qty != null ? r.qty.toFixed(2) : "—"}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${positionColor(r.position)}`}>
                    {r.positionString}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={setPageSize} />
    </div>
  );
}

// ─── Kuota Datatable ──────────────────────────────────────────────────────────

const SHIFT_LABEL: Record<number, string> = { 1: "Pagi (06–14)", 2: "Siang (14–22)", 3: "Malam (22–06)" };

function KuotaTable({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [rows, setRows] = useState<KuotaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const drawRef = useRef(0);

  const fetch_ = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    drawRef.current += 1;
    const draw = drawRef.current;
    const body = new URLSearchParams({
      draw: String(draw),
      start: String((page - 1) * pageSize),
      length: String(pageSize),
      "search[value]": search,
      "order[0][column]": "0",
      "order[0][dir]": "desc",
      "columns[0][name]": "tanggal",
    });
    try {
      const res = await fetch(`${API_BASE}/api/KuotaLevel4/DataTable`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error();
      const json: DtResponse<KuotaRow> = await res.json();
      if (Number(json.draw) >= draw) {
        setRows(json.data);
        setTotal(json.recordsFiltered);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [token, page, pageSize, search]);

  useEffect(() => { fetch_(); }, [fetch_]);

  function handleSearch() { setSearch(searchInput); setPage(1); }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground dark:text-gray-400" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Cari produk, wilayah, bagian..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <button onClick={handleSearch} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-muted dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-foreground transition-colors cursor-pointer">
          Cari
        </button>
        <button onClick={fetch_} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-muted dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-foreground transition-colors cursor-pointer" title="Refresh">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground dark:text-gray-400" />}
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800/40">
        <table className="w-full text-sm text-gray-700 dark:text-gray-300">
          <thead className="bg-muted/60 dark:bg-gray-850 text-xs text-muted-foreground dark:text-gray-400 border-b border-gray-250 dark:border-gray-700">
            <tr>
              {["#", "Tanggal", "Shift", "Produk", "Bagian", "Kuota", "Terpesan", "Masuk", "Keluar", "Status"].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr><td colSpan={10} className="text-center py-10 text-muted-foreground dark:text-gray-400 bg-white dark:bg-gray-850/40">Tidak ada data</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-gray-200 dark:border-gray-700 hover:bg-muted/30 dark:hover:bg-gray-800/60 transition-colors bg-white dark:bg-gray-800/20">
                <td className="px-3 py-2 text-muted-foreground dark:text-gray-400">{r.number}</td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-white">{r.tanggalString}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">{SHIFT_LABEL[r.shift] ?? `Shift ${r.shift}`}</td>
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{r.namaproduk}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground dark:text-gray-400">{r.bagianString}</td>
                <td className="px-3 py-2 text-right font-semibold text-indigo-600 dark:text-indigo-400">{r.kuota}</td>
                <td className="px-3 py-2 text-right font-medium text-yellow-600 dark:text-yellow-400">{r.kuota_terpesan}</td>
                <td className="px-3 py-2 text-right font-medium text-green-700 dark:text-green-400">{r.kuota_in ?? "—"}</td>
                <td className="px-3 py-2 text-right font-medium text-red-700 dark:text-red-400">{r.kuota_out ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted dark:bg-gray-750 text-muted-foreground dark:text-gray-300">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={setPageSize} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagerTiketPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.aspnetToken as string;
  const { theme } = useTheme();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Ticket className="w-6 h-6 text-primary dark:text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Data Tiket & Kuota</h1>
          <p className="text-sm text-muted-foreground dark:text-gray-400">Rekap tiket dan kuota shift perusahaan</p>
        </div>
      </div>

      <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-900 dark:text-white">Data Tiket</CardTitle>
        </CardHeader>
        <CardContent>
          {token ? <TiketTable token={token} /> : (
            <div className="flex items-center gap-2 text-muted-foreground dark:text-gray-400 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat sesi...
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 border-gray-150 dark:border-gray-700 shadow-sm transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-900 dark:text-white">Datatable Kuota per Shift</CardTitle>
        </CardHeader>
        <CardContent>
          {token ? <KuotaTable token={token} /> : (
            <div className="flex items-center gap-2 text-muted-foreground dark:text-gray-400 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat sesi...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


