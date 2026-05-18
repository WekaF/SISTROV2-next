"use client";
import { useEffect, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import Badge from "@/components/ui/badge/Badge";

interface TiketRow {
  bookingno: string;
  tiketno?: string;
  posto?: string;
  nopol?: string;
  driver?: string;
  tujuan?: string;
  asal?: string;
  produkString?: string;
  transportString?: string;
  position?: string;
  positionString?: string;
  tanggal?: string;
  tanggalString?: string;
  updatedonString?: string;
  statuspemuatan?: string;
}

const POSITION_BADGE: Record<string, "info" | "warning" | "success" | "error" | "default"> = {
  "1": "info",
  "2": "warning",
  "3": "warning",
  "4": "info",
  "5": "success",
  "7": "error",
};

export default function TiketDashboardPage() {
  const { apiTable } = useApi();
  const today = format(new Date(), "yyyy-MM-dd");
  const [SD, setSD] = useState(today);
  const [ED, setED] = useState(today);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<TiketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await apiTable("/api/Tiket/DataTableFilterLegacy", {
        draw: 1,
        start: 0,
        length: 100,
        SD,
        ED,
        search: { value: search },
        order: [{ column: 0, dir: "desc" }],
        columns: [
          { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
          { data: "posto", name: "posto", searchable: true, orderable: true },
          { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
          { data: "nopol", name: "nopol", searchable: true, orderable: true },
          { data: "driver", name: "driver", searchable: true, orderable: true },
          { data: "produkString", name: "idproduk", searchable: true, orderable: true },
          { data: "transportString", name: "idtransport", searchable: true, orderable: true },
          { data: "tujuan", name: "tujuan", searchable: true, orderable: true },
          { data: "positionString", name: "position", searchable: true, orderable: true },
        ],
      });
      setRows(res?.data ?? []);
      setTotal(res?.recordsTotal ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Tiket</h1>
        <p className="text-muted-foreground">Monitor tiket secara read-only</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Dari</label>
          <Input
            type="date"
            value={SD}
            onChange={(e) => setSD(e.target.value)}
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Sampai</label>
          <Input
            type="date"
            value={ED}
            onChange={(e) => setED(e.target.value)}
            className="w-36"
          />
        </div>
        <Input
          placeholder="Cari booking no / nopol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
          onKeyDown={(e) => e.key === "Enter" && fetchData()}
        />
        <Button onClick={fetchData} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Cari
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Menampilkan {rows.length} dari {total} tiket
      </p>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Booking No</TableHead>
              <TableHead>POSTO</TableHead>
              <TableHead>Nopol</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Tujuan</TableHead>
              <TableHead>Transportir</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                  Tidak ada data tiket
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t, i) => (
                <TableRow key={t.bookingno ?? i}>
                  <TableCell className="font-mono text-xs font-bold">{t.bookingno}</TableCell>
                  <TableCell className="text-xs">{t.posto ?? "-"}</TableCell>
                  <TableCell className="font-medium">{t.nopol ?? "-"}</TableCell>
                  <TableCell>{t.driver ?? "-"}</TableCell>
                  <TableCell>{t.produkString ?? "-"}</TableCell>
                  <TableCell>{t.tujuan ?? "-"}</TableCell>
                  <TableCell>{t.transportString ?? "-"}</TableCell>
                  <TableCell>
                    {t.positionString ? (
                      <Badge
                        color={POSITION_BADGE[t.position ?? ""] ?? "default"}
                        size="sm"
                        variant="light"
                      >
                        {t.positionString}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{t.tanggalString ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
