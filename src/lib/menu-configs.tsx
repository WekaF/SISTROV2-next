import React from "react";
import {
  LayoutGrid,
  FileText,
  Truck,
  Scan,
  Package,
  ClipboardList,
  BarChart3,
  ArrowRightLeft,
  TableProperties,
  Ticket,
  CalendarCheck,
  Users,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";

export type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

export function normalizeRole(raw: string | undefined): string {
  if (!raw) return "eksternal";
  const r = raw.toLowerCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    ti: "superadmin",
    superadmin: "superadmin",
    admin: "admin",
    adminsumbu: "admin",
    candalkuota: "candal",
    candaltruk: "candal",
    candaltruck: "candal",
    candalcontainer: "candal",
    candalgudangposto: "candal",
    candaldept: "candal",
    candalkapal: "candal",
    staffarea: "staffarea",
    staffarealayah1: "staffarea",
    staffarealayah2: "staffarea",
    staffarewilayah1: "staffarea",
    staffarewilayah2: "staffarea",
    staffareajatim: "staffarea",
    dataareabagianpoall: "staffarea",
    dataareabagiansoall: "staffarea",
    dataareabagianpojateng: "staffarea",
    dataareabagianpojatim: "staffarea",
    dataareabagianpopelabuhan: "staffarea",
    dataareabagianposulsel: "staffarea",
    dataareabagianposumbagsel: "staffarea",
    dataareabagianposumbagut: "staffarea",
    dataareababagianjawa: "staffarea",
    dataareabagiansojabar: "staffarea",
    dataareababagiansojabar: "staffarea",
    dataareababagianjateng: "staffarea",
    dataareababagianjatim: "staffarea",
    dataareababagiansoall: "staffarea",
    viewer: "viewer",
    pkg: "manager",
    viewerposto: "viewer",
    viewerarmada: "viewer",
    transport: "transport",
    transportsuraljalan: "transport",
    rekanan: "rekanan",
    security: "security",
    securitylini3: "security",
    gudang: "gudang",
    candalgudang: "gudang",
    gudanglini3: "gudang",
    chekerlini3: "gudang",
    checkerlini3: "gudang",
    admingudang: "gudang",
    admingudangcandalgudang: "gudang",
    timbangan: "jembatan_timbang",
    jembatan_timbang: "jembatan_timbang",
    adminarmada: "pod",
    pod: "pod",
    pelabuhanapp: "pkd",
    pelabuhanuppp: "pkd",
    terminal1: "pkd",
    terminal2: "pkd",
    pkd: "pkd",
  };
  if (r.startsWith("dataareabagian")) return "staffarea";
  return map[r] ?? "eksternal";
}

// Merge nav items from multiple groups — dedup by name (case-insensitive), merge subItems
export function mergeNavItems(itemsList: NavItem[][]): NavItem[] {
  const resultMap = new Map<string, NavItem>();
  for (const items of itemsList) {
    for (const item of items) {
      const key = item.name.toLowerCase();
      if (resultMap.has(key)) {
        const existing = resultMap.get(key)!;
        if (existing.subItems && item.subItems) {
          const existingPaths = new Set(existing.subItems.map((s) => s.path));
          const newSubs = item.subItems.filter((s) => !existingPaths.has(s.path));
          existing.subItems = [...existing.subItems, ...newSubs];
        }
      } else {
        resultMap.set(key, {
          ...item,
          subItems: item.subItems ? [...item.subItems] : undefined,
        });
      }
    }
  }

  const merged = Array.from(resultMap.values());

  // Collect all paths that exist inside subItems of any dropdown menu
  const subItemPaths = new Set<string>();
  for (const item of merged) {
    if (item.subItems) {
      for (const sub of item.subItems) {
        subItemPaths.add(sub.path);
      }
    }
  }

  // Filter out any root-level items (no subItems) whose path is already present in subItems of another dropdown menu
  return merged.filter((item) => {
    if (!item.subItems && item.path) {
      return !subItemPaths.has(item.path);
    }
    return true;
  });
}

export function filterNavByPaths(items: NavItem[], allowedPaths: string[]): NavItem[] {
  const pathSet = new Set(allowedPaths);
  const result: NavItem[] = [];
  for (const item of items) {
    if (item.subItems) {
      const filteredSubs = item.subItems.filter((s) => s.path && pathSet.has(s.path));
      if (filteredSubs.length > 0) {
        result.push({ ...item, subItems: filteredSubs });
      }
    } else if (item.path && pathSet.has(item.path)) {
      result.push(item);
    }
  }
  return result;
}

export const MENU_CONFIGS: Record<string, { nav: NavItem[]; admin: NavItem[] }> = {
  superadmin: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <Package className="h-5 w-5" />,
        name: "Posto",
        subItems: [
          { name: "Data Posto", path: "/posto" },
          { name: "Data So", path: "/so" },
          { name: "Cut Off Posto", path: "/posto/cut-off" },
          { name: "Prioritas Tujuan Muat", path: "/posto/priority" },
          { name: "Upload Posto / So", path: "/posto/upload" },
        ],
      },
      {
        icon: <CalendarCheck className="h-5 w-5" />,
        name: "Kuota",
        subItems: [
          { name: "Penjadwalan Kuota", path: "/kuota/schedule" },
          { name: "Kuota Per-shift", path: "/kuota/shifts" },
        ],
      },
      {
        icon: <TableProperties className="h-5 w-5" />,
        name: "Gudang",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "Antrian Horizontal", path: "/antrian/horizontal" },
          { name: "Antrian Report", path: "/antrian/report" },
          { name: "Live Monitor Pintu Pemuatan", path: "/antrian/live-monitoring" },
          { name: "List Gudang", path: "/gudang" },
          { name: "Antrian Per Unit", path: "/gudang/unit-queue" },
          { name: "Gudang Tujuan Bagian", path: "/gudang/tujuan-bagian" },
          { name: "Monitoring Pemuatan", path: "/gudang/targets" },
          { name: "Traffic Antrian", path: "/gudang/trafik" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Armada",
        subItems: [
          { name: "Datatable Armada", path: "/armada" },
          { name: "Pengajuan Armada", path: "/armada/pengajuan" },
          { name: "Upload Armada", path: "/armada/upload" },
          { name: "Mapping Zero Odol", path: "/armada/mapping-zero-odol" },
          { name: "Sumbu Percepatan", path: "/armada/percepatan" },
        ],
      },
      {
        icon: <Ticket className="h-5 w-5" />,
        name: "Tiket Master",
        path: "/admin/tickets",
      },
      {
        icon: <Users className="h-5 w-5" />,
        name: "User Plant",
        path: "/superadmin/settings/users",
      },
      {
        icon: <CalendarClock className="h-5 w-5" />,
        name: "Pengaturan Shift",
        path: "/shift",
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Laporan tiket", path: "/reports/tiket-pi" },
          { name: "Report Pemesanan Tiket", path: "/reports/booking" },
          { name: "Report Realisasi Pemuatan", path: "/reports/loading" },
          { name: "Report Pembatalan Tiket", path: "/reports/cancelation" },
          { name: "Report By Pass", path: "/reports/bypass" },
          { name: "Report Pembuatan Kuota", path: "/reports/kuota-log" },
          { name: "Resume Booking Tiket", path: "/reports/resume" },
        ],
      },
      {
        icon: <ArrowRightLeft className="h-5 w-5" />,
        name: "Resume Transit",
        path: "/resume-transit",
      },
    ],
    admin: [
      {
        icon: <ShieldCheck className="h-5 w-5" />,
        name: "Administration",
        subItems: [
          { name: "Konfigurasi Plant", path: "/superadmin/settings/plants" },
          { name: "Tambah Plant", path: "/superadmin/settings/plants/new" },
          { name: "Master Sumbu", path: "/superadmin/settings/sumbu" },
          { name: "Sumbu Percepatan", path: "/superadmin/settings/percepatan" },
          { name: "Konfigurasi Armada", path: "/superadmin/settings/fleet" },
          { name: "Produk & Mapping", path: "/superadmin/settings/products" },
          { name: "Gudang & Mapping", path: "/superadmin/settings/warehouses" },
          { name: "Konfigurasi Rekanan", path: "/superadmin/settings/transport" },
          { name: "Force Delete Tiket", path: "/superadmin/settings/tiket" },
          { name: "Konfigurasi All User", path: "/admin/pengaturan/user" },
          { name: "Sumbu Kendaraan", path: "/armada/axle-setup" },
          { name: "Area Scope User", path: "/superadmin/settings/area-scope" },
          { name: "Role & Menu Group", path: "/superadmin/settings/role-menu" },
          { name: "Menu Per User", path: "/superadmin/settings/user-menu" },
          { name: "Menu per Perusahaan", path: "/superadmin/settings/company-menu" },
        ],
      },
    ],
  },

  admin: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <Package className="h-5 w-5" />,
        name: "Posto",
        subItems: [
          { name: "Data Posto", path: "/posto" },
          { name: "Data So", path: "/so" },
          { name: "Cut Off Posto", path: "/posto/cut-off" },
          { name: "Prioritas Tujuan Muat", path: "/posto/priority" },
          { name: "Upload Posto / So", path: "/posto/upload" },
        ],
      },
      {
        icon: <CalendarCheck className="h-5 w-5" />,
        name: "Kuota",
        subItems: [
          { name: "Penjadwalan Kuota", path: "/kuota/schedule" },
          { name: "Kuota Per-shift", path: "/kuota/shifts" },
        ],
      },
      {
        icon: <TableProperties className="h-5 w-5" />,
        name: "Gudang",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "Antrian Horizontal", path: "/antrian/horizontal" },
          { name: "Antrian Report", path: "/antrian/report" },
          { name: "List Gudang", path: "/gudang" },
          { name: "Antrian Per Unit", path: "/gudang/unit-queue" },
          { name: "Gudang Tujuan Bagian", path: "/gudang/tujuan-bagian" },
          { name: "Monitoring Pemuatan", path: "/gudang/targets" },
          { name: "Traffic Antrian", path: "/gudang/trafik" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Armada",
        subItems: [
          { name: "Datatable Armada", path: "/armada" },
          { name: "Pengajuan Armada", path: "/armada/pengajuan" },
          { name: "Upload Armada", path: "/armada/upload" },
          { name: "Mapping Zero Odol", path: "/armada/mapping-zero-odol" },
          { name: "Sumbu Percepatan", path: "/armada/percepatan" },
        ],
      },
      { icon: <ClipboardList className="h-5 w-5" />, name: "Tiket", path: "/admin/tickets" },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Summary Laporan", path: "/reports" },
          { name: "Report Pemesanan Tiket", path: "/reports/booking" },
          { name: "Report Realisasi Pemuatan", path: "/reports/loading" },
          { name: "Report Pembatalan Tiket", path: "/reports/cancelation" },
          { name: "Report By Pass", path: "/reports/bypass" },
          { name: "Report Pembuatan Kuota", path: "/reports/kuota-log" },
          { name: "Resume Booking Tiket", path: "/reports/resume" },
        ],
      },
    ],
    admin: [
      {
        icon: <ShieldCheck className="h-5 w-5" />,
        name: "Administration",
        subItems: [
          { name: "Konfigurasi Plant", path: "/superadmin/settings/plants" },
          { name: "Master Sumbu", path: "/superadmin/settings/sumbu" },
          { name: "Sumbu Percepatan", path: "/superadmin/settings/percepatan" },
          { name: "Konfigurasi Armada", path: "/superadmin/settings/fleet" },
          { name: "Produk & Mapping", path: "/superadmin/settings/products" },
          { name: "Gudang & Mapping", path: "/superadmin/settings/warehouses" },
          { name: "Konfigurasi Rekanan", path: "/superadmin/settings/transport" },
          { name: "Sumbu Kendaraan", path: "/armada/axle-setup" },
        ],
      },
    ],
  },

  candal: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <CalendarCheck className="h-5 w-5" />,
        name: "Kuota",
        subItems: [
          { name: "Penjadwalan Kuota", path: "/kuota/schedule" },
          { name: "Kuota per Shift", path: "/kuota/shifts" },
          { name: "Pengaturan Shift", path: "/shift" },
        ],
      },
      {
        icon: <Package className="h-5 w-5" />,
        name: "Posto",
        subItems: [
          { name: "Data Posto", path: "/posto" },
          { name: "Data So", path: "/so" },
          { name: "Prioritas Tujuan Muat", path: "/posto/priority" },
        ],
      },
      { icon: <ClipboardList className="h-5 w-5" />, name: "Tiket", path: "/tiket" },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Gudang",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "Antrian Horizontal", path: "/antrian/horizontal" },
          { name: "Antrian Report", path: "/antrian/report" },
          { name: "Gudang", path: "/gudang" },
          { name: "Trafik Antrian Gudang", path: "/gudang/trafik" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Armada",
        subItems: [
          { name: "Datatable Armada", path: "/armada" },
          { name: "Pengajuan Armada", path: "/armada/pengajuan" },
          { name: "Sumbu Kendaraan", path: "/armada/axle-setup" },
          { name: "Mapping Zero Odol", path: "/armada/mapping-zero-odol" },
        ],
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Report Realisasi Pemuatan", path: "/reports/loading" },
          { name: "Report By Pass", path: "/reports/bypass" },
          { name: "Report Pembatalan Tiket", path: "/reports/cancelation" },
          { name: "Report Pembuatan Kuota", path: "/reports/kuota-log" },
          { name: "Report Pemesanan Tiket", path: "/reports/booking" },
          { name: "Resume Booking Tiket", path: "/reports/resume" },
        ],
      },
    ],
    admin: [],
  },

  staffarea: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Antrian",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "Live Monitor Pintu Pemuatan", path: "/antrian/live-monitoring" },
        ],
      },
      {
        icon: <Package className="h-5 w-5" />,
        name: "Posto",
        subItems: [
          { name: "Data Posto", path: "/posto" },
          { name: "Upload Posto", path: "/posto/upload" },
        ],
      },
      {
        icon: <Ticket className="h-5 w-5" />,
        name: "Tiket",
        subItems: [{ name: "Data Tiket", path: "/admin/tickets" }],
      },
      { icon: <CalendarClock className="h-5 w-5" />, name: "Pengaturan Shift", path: "/shift" },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Report Pemesanan Tiket", path: "/reports/booking" },
          { name: "Report Realisasi Pemuatan", path: "/reports/loading" },
          { name: "Report Pembatalan Tiket", path: "/reports/cancelation" },
          { name: "Report By Pass", path: "/reports/bypass" },
          { name: "Report Pembuatan Kuota", path: "/reports/kuota-log" },
          { name: "Resume Booking Tiket", path: "/reports/resume" },
        ],
      },
    ],
    admin: [],
  },

  viewer: {
    nav: [
      {
        icon: <LayoutGrid className="h-5 w-5" />,
        name: "Dashboard",
        subItems: [
          { name: "Dashboard Utama", path: "/" },
          { name: "Report Plant", path: "/dashboard/report" },
        ],
      },
      {
        icon: <ClipboardList className="h-5 w-5" />,
        name: "Tiket",
        subItems: [
          { name: "Dashboard Tiket", path: "/tiket/dashboard" },
          { name: "Track Tiket Integrasi DO", path: "/tiket/track-do" },
        ],
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Antrian",
        subItems: [
          { name: "Antrian All Plant", path: "/antrian/all-plant" },
          { name: "Live Monitor Pintu Pemuatan", path: "/antrian/live-monitoring" },
        ],
      },
      { icon: <ArrowRightLeft className="h-5 w-5" />, name: "Resume Transit", path: "/resume-transit" },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Laporan tiket", path: "/reports/tiket-pi" },
        ],
      },
    ],
    admin: [],
  },

  transport: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <Package className="h-5 w-5" />,
        name: "Posto",
        subItems: [
          { name: "Datatable Posto", path: "/posto" },
          { name: "Pengajuan Jatuh Tempo", path: "/pengajuan/jatuh-tempo" },
        ],
      },
      {
        icon: <ClipboardList className="h-5 w-5" />,
        name: "Tiket",
        subItems: [
          { name: "Data Tiket", path: "/tiket" },
          { name: "Booking Tiket", path: "/tiket/booking" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Transport",
        subItems: [
          { name: "List Armada", path: "/armada" },
          { name: "Pengajuan Armada Baru", path: "/armada/pengajuan" },
        ],
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [{ name: "Report Pemesanan Tiket", path: "/reports/booking" }],
      },
    ],
    admin: [],
  },

  rekanan: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <Package className="h-5 w-5" />,
        name: "Posto",
        subItems: [
          { name: "Datatable Posto", path: "/posto" },
          { name: "Pengajuan Jatuh Tempo", path: "/pengajuan/jatuh-tempo" },
        ],
      },
      {
        icon: <ClipboardList className="h-5 w-5" />,
        name: "Tiket",
        subItems: [
          { name: "Data Tiket", path: "/tiket" },
          { name: "Booking Tiket", path: "/tiket/booking" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Armada",
        subItems: [
          { name: "List Armada", path: "/armada" },
          { name: "Pengajuan Armada Baru", path: "/armada/pengajuan" },
        ],
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [{ name: "Report Pemesanan Tiket", path: "/reports/booking" }],
      },
    ],
    admin: [],
  },

  security: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <ClipboardList className="h-5 w-5" />,
        name: "Tiket",
        subItems: [{ name: "Data Tiket", path: "/tiket" }],
      },
      {
        icon: <Scan className="h-5 w-5" />,
        name: "Scan & Track",
        subItems: [
          { name: "Scan Tiket", path: "/scan/tiket" },
          { name: "Track Tiket", path: "/track/tiket" },
        ],
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Gudang",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "Gudang", path: "/gudang" },
        ],
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Report Pemesanan Tiket", path: "/reports/booking" },
          { name: "Report Realisasi Pemuatan", path: "/reports/loading" },
          { name: "Report Pembatalan Tiket", path: "/reports/cancelation" },
        ],
      },
    ],
    admin: [],
  },

  gudang: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      { icon: <ClipboardList className="h-5 w-5" />, name: "Tiket", path: "/tiket" },
      {
        icon: <Scan className="h-5 w-5" />,
        name: "Scan & Track",
        subItems: [
          { name: "Scan Tiket", path: "/scan/tiket" },
          { name: "Integrasi Tiket", path: "/scan/integrasi" },
          { name: "Track Tiket", path: "/track/tiket" },
        ],
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Gudang",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "Antrian Horizontal", path: "/antrian/horizontal" },
          { name: "Antrian Report", path: "/antrian/report" },
          { name: "Live Monitor Pintu Pemuatan", path: "/antrian/live-monitoring" },
          { name: "Gudang", path: "/gudang" },
          { name: "Gudang Tujuan Bagian", path: "/gudang/tujuan-bagian" },
          { name: "Trafik Antrian Gudang", path: "/gudang/trafik" },
        ],
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Report Pemesanan Tiket", path: "/reports/booking" },
          { name: "Report Realisasi Pemuatan", path: "/reports/loading" },
          { name: "Report Pembatalan Tiket", path: "/reports/cancelation" },
          { name: "Report By Pass", path: "/reports/bypass" },
        ],
      },
    ],
    admin: [],
  },

  jembatan_timbang: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      { icon: <ClipboardList className="h-5 w-5" />, name: "Tiket", path: "/tiket" },
      {
        icon: <Scan className="h-5 w-5" />,
        name: "Scan & Track",
        subItems: [
          { name: "Scan Tiket", path: "/scan/tiket" },
          { name: "Track Tiket", path: "/track/tiket" },
        ],
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Gudang",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "Gudang", path: "/gudang" },
        ],
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Report Pemesanan Tiket", path: "/reports/booking" },
          { name: "Report Realisasi Pemuatan", path: "/reports/loading" },
          { name: "Report Pembatalan Tiket", path: "/reports/cancelation" },
        ],
      },
    ],
    admin: [],
  },

  pod: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      { icon: <BarChart3 className="h-5 w-5" />, name: "Antrian", path: "/antrian" },
      {
        icon: <Package className="h-5 w-5" />,
        name: "Posto",
        subItems: [
          { name: "Upload Posto", path: "/posto/upload" },
          { name: "Data Posto", path: "/posto" },
          { name: "Cut Off Posto", path: "/posto/cut-off" },
          { name: "Prioritas Tujuan", path: "/posto/priority" },
        ],
      },
      {
        icon: <Ticket className="h-5 w-5" />,
        name: "Tiket",
        subItems: [{ name: "Data Tiket", path: "/admin/tickets" }],
      },
      {
        icon: <CalendarCheck className="h-5 w-5" />,
        name: "Kuota",
        subItems: [
          { name: "Penjadwalan Kuota", path: "/kuota/schedule" },
          { name: "Kuota Per-shift", path: "/kuota/shifts" },
        ],
      },
      {
        icon: <TableProperties className="h-5 w-5" />,
        name: "Gudang",
        subItems: [
          { name: "List Gudang", path: "/gudang" },
          { name: "Antrian Per Unit", path: "/gudang/unit-queue" },
          { name: "Gudang Tujuan Bagian", path: "/gudang/tujuan-bagian" },
          { name: "Monitoring Pemuatan", path: "/gudang/targets" },
          { name: "Traffic Antrian", path: "/gudang/trafik" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Armada",
        subItems: [
          { name: "Datatable Armada", path: "/armada" },
          { name: "Pengajuan Armada", path: "/armada/pengajuan" },
          { name: "Upload Armada", path: "/armada/upload" },
          { name: "Sumbu Kendaraan", path: "/armada/axle-setup" },
          { name: "Mapping Zero Odol", path: "/armada/mapping-zero-odol" },
          { name: "Sumbu Percepatan", path: "/armada/percepatan" },
        ],
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Laporan Armada", path: "/reports/fleet" },
        ],
      },
    ],
    admin: [
      {
        icon: <ShieldCheck className="h-5 w-5" />,
        name: "Administration",
        subItems: [
          { name: "Master Sumbu", path: "/superadmin/settings/sumbu" },
          { name: "Sumbu Percepatan", path: "/superadmin/settings/percepatan" },
        ],
      },
    ],
  },

  pkd: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <Package className="h-5 w-5" />,
        name: "Posto",
        subItems: [
          { name: "Data Posto", path: "/posto" },
          { name: "Data So", path: "/so" },
        ],
      },
      { icon: <ClipboardList className="h-5 w-5" />, name: "Tiket", path: "/tiket" },
      {
        icon: <Scan className="h-5 w-5" />,
        name: "Scan & Track",
        subItems: [
          { name: "Scan Tiket", path: "/scan/tiket" },
          { name: "Integrasi Tiket", path: "/scan/integrasi" },
          { name: "Track Tiket", path: "/track/tiket" },
        ],
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Gudang",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "Gudang", path: "/gudang" },
          { name: "Trafik Antrian Gudang", path: "/gudang/trafik" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Armada",
        subItems: [{ name: "List Armada", path: "/armada" }],
      },
      { icon: <ArrowRightLeft className="h-5 w-5" />, name: "Resume Transit", path: "/resume-transit" },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Report Realisasi Pemuatan", path: "/reports/loading" },
          { name: "Report By Pass", path: "/reports/bypass" },
          { name: "Report Pembatalan Tiket", path: "/reports/cancelation" },
          { name: "Report Pembuatan Kuota", path: "/reports/kuota-log" },
          { name: "Report Pemesanan Tiket", path: "/reports/booking" },
          { name: "Resume Booking Tiket", path: "/reports/resume" },
        ],
      },
    ],
    admin: [],
  },

  manager: {
    nav: [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/manager" },
      {
        icon: <Ticket className="h-5 w-5" />,
        name: "Dashboard Tiket",
        path: "/manager/tiket",
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Antrian",
        path: "/manager/antrian",
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        path: "/manager/laporan",
      },
    ],
    admin: [],
  },

  eksternal: {
    nav: [{ icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" }],
    admin: [],
  },
};

export function getPathsForGroup(group: string): string[] {
  const config = MENU_CONFIGS[group];
  if (!config) return [];
  const allItems = [...config.nav, ...config.admin];
  return allItems.flatMap((item) =>
    item.subItems
      ? item.subItems.map((s) => s.path)
      : item.path
        ? [item.path]
        : []
  );
}
