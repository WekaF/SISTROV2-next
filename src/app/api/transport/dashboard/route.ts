import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ASPNET = process.env.ASPNET_API_URL || "http://192.168.188.170:8090";

async function safeJson<T>(promise: Promise<T>): Promise<T | null> {
  try { return await promise; } catch { return null; }
}

/** Get a "Transport"-role bearer token by re-authing without companycode.
 *  MobileTransport endpoints use [Authorize(Roles = "Transport")], which only
 *  matches when logged in with the plain transport username (no _COMPANYCODE suffix).
 */
async function getMobileToken(session: any): Promise<string> {
  const sessionToken: string = (session.user as any).aspnetToken ?? "";
  try {
    const username: string = (session.user as any).username ?? "";
    const companyCode: string = (session.user as any).companyCode ?? "";
    const _pw: string = (session.user as any)._pw ?? "";
    const password = _pw ? Buffer.from(_pw, "base64").toString() : "";

    const plainUsername =
      companyCode && username.toLowerCase().endsWith(`_${companyCode.toLowerCase()}`)
        ? username.slice(0, -(companyCode.length + 1))
        : username;

    if (!password || !plainUsername) return sessionToken;

    const params = new URLSearchParams({ grant_type: "password", username: plainUsername, password });
    const res = await fetch(`${ASPNET}/Token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) return sessionToken;
    const data = await res.json();
    return data.access_token ?? sessionToken;
  } catch {
    return sessionToken;
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(session.user as any).aspnetToken) {
    return NextResponse.json({ error: "No token" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(Number(searchParams.get("days") || "30"), 90);

  const mobileToken = await getMobileToken(session);
  const headers = {
    Authorization: `Bearer ${mobileToken}`,
    "Content-Type": "application/json",
  };

  const fetcher = (path: string) =>
    fetch(`${ASPNET}${path}`, { headers }).then((r) => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    });

  const [stats, tikets, postos, armada, armadaReview] = await Promise.all([
    safeJson(fetcher(`/api/MobileTransport/StatistikPemuatan?days=${days}`)),
    safeJson(fetcher("/api/MobileTransport/ListTiket?page=1&pageSize=100")),
    safeJson(fetcher("/api/MobileTransport/ListPosto?page=1&pageSize=100")),
    safeJson(fetcher("/api/MobileTransport/ListArmada?page=1&pageSize=200")),
    safeJson(fetcher("/api/MobileTransport/ListArmadaReview")),
  ]);

  // ── Tiket list ───────────────────────────────────────────────────────────────
  type TiketItem = {
    bookingno?: string; position?: string; timesec?: string;
    timeout?: string; qty?: number; nopol?: string; posto?: string;
  };
  const tiketList: TiketItem[] = Array.isArray(tikets)
    ? tikets
    : (tikets as any)?.data ?? [];

  // Fastest / slowest ticket (needs timesec + timeout fields)
  const completed = tiketList.filter((t) => t.position === "07" && t.timesec && t.timeout);
  const withDuration = completed
    .map((t) => ({
      ...t,
      durasiMenit: Math.round((new Date(t.timeout!).getTime() - new Date(t.timesec!).getTime()) / 60000),
    }))
    .sort((a, b) => a.durasiMenit - b.durasiMenit);
  const tiketTercepat = withDuration[0] ?? null;
  const tiketTerlama = withDuration[withDuration.length - 1] ?? null;

  // ── POSTO list & gap analysis ────────────────────────────────────────────────
  type PostoItem = {
    noposto?: string; qty?: number; qtyrealisasi?: number;
  };
  const postoList: PostoItem[] = Array.isArray(postos)
    ? postos
    : (postos as any)?.data ?? [];

  const postoAnalytics = postoList.map((p) => {
    const tiketDone = tiketList
      .filter((t) => t.position === "07" && t.posto === p.noposto)
      .reduce((sum, t) => sum + (t.qty ?? 0), 0);
    const gap = (p.qtyrealisasi ?? 0) - tiketDone;
    const pctTermuat = p.qty ? Math.round(((p.qtyrealisasi ?? 0) / p.qty) * 100) : 0;
    return { ...p, tiketDone, gap, pctTermuat };
  });
  const totalPostoQty = postoList.reduce((s, p) => s + (p.qty ?? 0), 0);
  const totalPostoRealisasi = postoList.reduce((s, p) => s + (p.qtyrealisasi ?? 0), 0);
  const totalTiketRealisasi = postoAnalytics.reduce((s, p) => s + p.tiketDone, 0);
  const totalGap = totalPostoRealisasi - totalTiketRealisasi;
  const pctTermuatOverall = totalPostoQty
    ? Math.round((totalPostoRealisasi / totalPostoQty) * 100)
    : 0;

  // ── Armada fleet health ──────────────────────────────────────────────────────
  // ListArmada now returns masa_berlaku_kir (DateTime) and tahun_pembuatan (int)
  type ArmadaItem = {
    nopol?: string; kir?: string; aprrovestatus?: string;
    masa_berlaku_kir?: string; tahun_pembuatan?: number;
  };
  const armadaList: ArmadaItem[] = Array.isArray(armada)
    ? armada
    : (armada as any)?.data ?? [];

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const kirExpiredList = armadaList.filter((a) => a.masa_berlaku_kir && new Date(a.masa_berlaku_kir) < now);
  const kirNearExpiryList = armadaList.filter((a) => {
    if (!a.masa_berlaku_kir) return false;
    const d = new Date(a.masa_berlaku_kir);
    return d >= now && d <= in30;
  });
  const tooOldList = armadaList.filter(
    (a) => a.tahun_pembuatan && (now.getFullYear() - a.tahun_pembuatan) > 20
  );

  // ── ArmadaReview — pending approvals ────────────────────────────────────────
  // aprrovestatus = "Menunggu Approve" | "Sudah diapprove" | "Ditolak"
  // ArmadaReview.approve is bool?: null = menunggu, true = diapprove, false = ditolak
  type ArmadaReviewItem = {
    nopol?: string;
    approve?: string | null;
    aprrovestatus?: string;
    updatedonString?: string;
    alasan?: string;
    tahun_pembuatan?: number;
    masa_berlaku_kir_string?: string;
  };
  const armadaReviewList: ArmadaReviewItem[] = Array.isArray(armadaReview)
    ? armadaReview
    : (armadaReview as any)?.data ?? [];

  // Filter for dashboard "Fleet Health" pending approvals
  const pendingReview = armadaReviewList.filter((a) => a.aprrovestatus === "Menunggu Approve");
  const rejectedReview = armadaReviewList.filter((a) => a.aprrovestatus === "Ditolak/Revisi");

  // ── KPI from stats.summary ───────────────────────────────────────────────────
  const statsSummary = (stats as any)?.summary ?? {};
  const counts = {
    totalTiket: statsSummary.totalTiket ?? 0,
    totalTiketDone: statsSummary.totalDone ?? 0,
    totalTiketUndone: statsSummary.totalUndone ?? 0,
    totalTonase: statsSummary.totalTonase ?? 0,
    totalPosto: postoList.length,
    totalArmada: armadaList.length,
    totalArmadaReview: pendingReview.length,
    periode: statsSummary.periode ?? "",
  };

  // Unwrap stats.data array for chart component
  const statsDaily = (stats as any)?.data ?? (Array.isArray(stats) ? stats : []);

  return NextResponse.json({
    counts,
    stats: statsDaily,
    tikets: tiketList.slice(0, 20),
    postoAnalytics: postoAnalytics.slice(0, 20),
    postoSummary: { totalPostoQty, totalPostoRealisasi, totalTiketRealisasi, totalGap, pctTermuatOverall },
    tiketTercepat,
    tiketTerlama,
    fleet: {
      totalArmada: armadaList.length,
      kirExpiredCount: kirExpiredList.length,
      kirNearExpiryCount: kirNearExpiryList.length,
      tooOldCount: tooOldList.length,
      pendingCount: pendingReview.length,
      rejectedCount: rejectedReview.length,
      kirExpired: kirExpiredList.slice(0, 5).map((a) => ({ nopol: a.nopol, kir: a.masa_berlaku_kir })),
      kirNearExpiry: kirNearExpiryList.slice(0, 5).map((a) => ({ nopol: a.nopol, kir: a.masa_berlaku_kir })),
      pendingList: pendingReview.slice(0, 5).map((a) => ({
        nopol: a.nopol,
        status: a.aprrovestatus,
        date: a.updatedonString,
      })),
      rejectedList: rejectedReview.slice(0, 5).map((a) => ({
        nopol: a.nopol,
        status: a.aprrovestatus,
        reason: a.alasan,
        date: a.updatedonString,
      })),
    },
    days,
  });
}
