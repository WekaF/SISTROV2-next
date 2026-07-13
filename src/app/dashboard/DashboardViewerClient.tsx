"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useApi } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Truck, Package, Clock, AlertCircle, FileText } from "lucide-react";
import ViewerDashboard from "@/components/dashboard/ViewerDashboard";
import StaffAreaDashboard from "@/components/dashboard/StaffAreaDashboard";
import { normalizeRole } from "@/lib/role-utils";

const COMPANY_LABELS: Record<string, string> = {
  PKG: "Petrokimia Gresik",
  PKC: "Pupuk Kujang",
  PIM: "Pupuk Iskandar Muda",
  LOG4MENENG: "UPP Meneng Banyuwangi",
  D243: "DC Makasar DSP",
  F207: "UPP Semarang",
  ROMO: "GD Romokalisari Surabaya",
  MEDAN: "DC Medan",
  CILACAP: "DC Cilacap",
  B205: "DC Lampung",
  F249: "UPP Celukan Bawang",
  LOMBOK: "UPP Lembar",
  MAKASAR2: "UPP Makasar",
  BANJARMASIN2: "UPP Banjarmasin",
};

interface Stats {
  totalTiket: number;
  totalAntrian: number;
}

export default function DashboardViewerClient() {
  const searchParams = useSearchParams();
  const company = searchParams.get("company") ?? "";
  const { data: session, status: sessionStatus } = useSession();
  const { apiTable } = useApi();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const username = (session?.user as any)?.username as string | undefined;
  const allRoles: string[] = ((session?.user as any)?.roles as string[] | undefined) ?? [(session?.user as any)?.role ?? ""];
  const normalizedRoles = allRoles.map(r => normalizeRole(r));
  const isStaffArea = normalizedRoles.includes("staffarea");

  const isPiAdmin = username?.toLowerCase() === "pi_admin";
  const isAuthorizedForTransit = isPiAdmin || normalizedRoles.includes("superadmin") || normalizedRoles.includes("pkd") || normalizedRoles.includes("viewer");

  useEffect(() => {
    if (!company) return;
    setLoading(true);

    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      apiTable("/api/Antrian/DataTable", {
        SD: today, ED: today, companyCode: company, start: 0, length: 1,
      }),
      apiTable("/api/Tiket/DataTableFilterLegacy", {
        draw: 1, SD: today, ED: today, companyCode: company, start: 0, length: 1,
      }),
    ])
      .then(([antrian, tiket]) => {
        setStats({
          totalAntrian: antrian?.recordsTotal ?? antrian?.pagination?.total ?? 0,
          totalTiket: tiket?.recordsTotal ?? tiket?.pagination?.total ?? 0,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [company, apiTable]);

  if (sessionStatus === "loading") {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (isStaffArea) {
    return <StaffAreaDashboard />;
  }

  if (!company) {
    return (
      <>
        {isPiAdmin && (
          <div className="p-6 pb-0">
            <a
              href="/reports/tiket-pi"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950 text-sm font-medium transition-colors"
            >
              <FileText className="h-4 w-4" />
              Laporan Tiket
            </a>
          </div>
        )}
        <ViewerDashboard />
      </>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {COMPANY_LABELS[company] ?? company}
        </h1>
        <p className="text-muted-foreground">Monitoring hari ini</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">Memuat data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tiket</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalTiket ?? "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">Tiket dibuat hari ini</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Antrian</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalAntrian ?? "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">Unit dalam antrian</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-muted-foreground">—</div>
              <p className="text-xs text-muted-foreground mt-1">
                {isAuthorizedForTransit ? (
                  <a href="/resume-transit" className="underline">Lihat Resume Transit</a>
                ) : (
                  <span>—</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status Transit</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-muted-foreground">—</div>
              <p className="text-xs text-muted-foreground mt-1">
                {isAuthorizedForTransit ? (
                  <a href="/resume-transit" className="underline">Lihat Resume Transit</a>
                ) : (
                  <span>—</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-4 text-xs text-muted-foreground">
        Kode: <code className="font-mono">{company}</code>
      </div>
    </div>
  );
}
