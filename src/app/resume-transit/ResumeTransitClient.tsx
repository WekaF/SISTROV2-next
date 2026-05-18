"use client";
import { useEffect, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, AlertTriangle, CheckCircle, Info, ArrowRight } from "lucide-react";

interface KabupatenItem {
  kab_kode: string;
  kab_nama: string;
  status: "merah" | "kuning" | "hijau" | "biru";
  tiket_count: number;
}

interface ResumeSummary {
  merah: number;
  kuning: number;
  hijau: number;
  biru: number;
  total_tiket: number;
  data: KabupatenItem[];
}

interface TiketRow {
  bookingno: string;
  nopol: string;
  driver: string;
  kode_kabupaten: string;
}

interface TiketGroup {
  tujuan: string;
  count: number;
  tikets: TiketRow[];
}

interface DetailData {
  status: string;
  kabupaten: KabupatenItem[];
  tikets: TiketGroup[];
}

const STATUS_CONFIG = {
  merah: {
    label: "Merah",
    cardClass: "bg-red-50 border-red-200",
    textClass: "text-red-700",
    icon: AlertCircle,
    badge: "destructive" as const,
  },
  kuning: {
    label: "Kuning",
    cardClass: "bg-yellow-50 border-yellow-200",
    textClass: "text-yellow-700",
    icon: AlertTriangle,
    badge: "outline" as const,
  },
  hijau: {
    label: "Hijau",
    cardClass: "bg-green-50 border-green-200",
    textClass: "text-green-700",
    icon: CheckCircle,
    badge: "outline" as const,
  },
  biru: {
    label: "Biru",
    cardClass: "bg-blue-50 border-blue-200",
    textClass: "text-blue-700",
    icon: Info,
    badge: "outline" as const,
  },
} as const;

export default function ResumeTransitClient() {
  const { apiJson } = useApi();
  const [summary, setSummary] = useState<ResumeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    apiJson<ResumeSummary>("/api/ResumeApi/Summary")
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [apiJson]);

  async function handleStatusClick(status: string) {
    if (selectedStatus === status) {
      setSelectedStatus(null);
      setDetail(null);
      return;
    }
    setSelectedStatus(status);
    setDetailLoading(true);
    try {
      const data = await apiJson<DetailData>(`/api/ResumeApi/DetailStatus?status=${status}`);
      setDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Resume In Transit</h1>
        <p className="text-muted-foreground">
          Status distribusi kabupaten hari ini —{" "}
          <span className="font-medium">{summary?.total_tiket ?? 0} tiket</span>
        </p>
      </div>

      {/* 4 Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(["merah", "kuning", "hijau", "biru"] as const).map((status) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          const count = summary?.[status] ?? 0;
          const isSelected = selectedStatus === status;

          return (
            <Card
              key={status}
              className={`cursor-pointer border-2 transition-all hover:shadow-md ${cfg.cardClass} ${
                isSelected ? "ring-2 ring-offset-2 ring-gray-400" : ""
              }`}
              onClick={() => handleStatusClick(status)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${cfg.textClass}`}>
                  {cfg.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${cfg.textClass}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${cfg.textClass}`}>{count}</div>
                <p className="text-xs text-muted-foreground mt-1">Kabupaten</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kabupaten Grid */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Semua Kabupaten ({summary?.data.length ?? 0})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {summary?.data.map((kab) => {
            const cfg = STATUS_CONFIG[kab.status as keyof typeof STATUS_CONFIG];
            return (
              <div
                key={kab.kab_kode}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${cfg?.cardClass ?? ""}`}
                onClick={() => handleStatusClick(kab.status)}
              >
                <div>
                  <p className="text-sm font-medium">{kab.kab_nama || kab.kab_kode}</p>
                  <p className="text-xs text-muted-foreground">{kab.tiket_count} tiket</p>
                </div>
                <Badge variant={cfg?.badge ?? "outline"} className="text-xs">
                  {kab.status}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedStatus && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              Detail: {STATUS_CONFIG[selectedStatus as keyof typeof STATUS_CONFIG]?.label}
            </h2>
            {detailLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          {!detailLoading && detail && (
            <div className="space-y-3">
              {detail.tikets.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada tiket untuk status ini.</p>
              ) : (
                detail.tikets.map((group) => (
                  <Card key={group.tujuan}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ArrowRight className="h-3 w-3" />
                        {group.tujuan}
                        <span className="text-muted-foreground font-normal">
                          ({group.count} tiket)
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="space-y-1">
                        {group.tikets.map((t) => (
                          <div key={t.bookingno} className="flex gap-3 text-xs text-muted-foreground">
                            <span className="font-mono font-medium text-foreground">
                              {t.bookingno}
                            </span>
                            <span>{t.nopol}</span>
                            <span>{t.driver}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
