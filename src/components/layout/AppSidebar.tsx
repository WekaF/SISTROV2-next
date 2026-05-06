"use client";
import React, { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSidebar } from "@/context/SidebarContext";
import {
  LayoutGrid,
  FileText,
  PieChart,
  Settings,
  ChevronDown,
  Monitor,
  Truck,
  Scan,
  Package,
  ClipboardList,
  BarChart3,
  ArrowRightLeft,
  TableProperties,
  Ticket,
  CalendarCheck,
} from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

// Normalize raw backend role (already lowercased) to canonical sidebar role
function normalizeRole(raw: string | undefined): string {
  if (!raw) return "eksternal";
  const r = raw.toLowerCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    // Superadmin / TI
    ti: "superadmin",
    superadmin: "superadmin",
    // Admin
    admin: "admin",
    adminsumbu: "admin",
    // Candal
    candalkuota: "candal",
    candaltruk: "candal",
    candaltruck: "candal",
    candalcontainer: "candal",
    candalgudangposto: "gudang",
    candaldept: "candal",
    candalkapal: "candal",
    // Staff Area
    staffarea: "staffarea",
    staffarealayah1: "staffarea",
    staffarealayah2: "staffarea",
    staffarewilayah1: "staffarea",
    staffarewilayah2: "staffarea",
    staffareajatim: "staffarea",
    // DataAreaBagian* → staffarea (area monitoring)
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
    // Viewer
    viewer: "viewer",
    pkg: "viewer",
    viewerposto: "viewer",
    viewerarmada: "viewer",
    // Transport / Rekanan
    transport: "transport",
    transportsuraljalan: "transport",
    rekanan: "rekanan",
    // Security
    security: "security",
    securitylini3: "security",
    // Gudang
    gudang: "gudang",
    candalgudang: "gudang",
    gudanglini3: "gudang",
    chekerlini3: "gudang",
    checkerlini3: "gudang",
    // Jembatan Timbang
    timbangan: "jembatan_timbang",
    jembatan_timbang: "jembatan_timbang",
    // POD / AdminArmada
    adminarmada: "pod",
    pod: "pod",
    // PKD / Pelabuhan
    pelabuhanapp: "pkd",
    pelabuhanuppp: "pkd",
    terminal1: "pkd",
    terminal2: "pkd",
    pkd: "pkd",
    admingudang: "gudang",
    admingudangcandalgudang: "gudang",
  };
  // Handle DataAreaBagian* pattern dynamically
  if (r.startsWith("dataareabagian")) return "staffarea";
  return map[r] ?? "eksternal";
}

// Base items available to all/admin by default
const defaultNavItems: NavItem[] = [
  {
    icon: <LayoutGrid className="h-5 w-5" />,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: <Scan className="h-5 w-5" />,
    name: "Operational Scans",
    subItems: [
      { name: "Security (Gate)", path: "/scan/security" },
      { name: "Weighbridge (JBT)", path: "/scan/weighbridge" },
      { name: "Warehouse (Gudang)", path: "/scan/warehouse" },
    ],
  },
  {
    icon: <Monitor className="h-5 w-5" />,
    name: "Monitoring & Stats",
    subItems: [
      { name: "Plant Monitoring", path: "/plant" },
      { name: "Ticket History", path: "/ticket/pilih-periode" },
      { name: "Activity Logs", path: "/monitoring" },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <Settings className="h-5 w-5" />,
    name: "User Management",
    subItems: [
      { name: "Users & Roles", path: "/admin/users" },
      { name: "System Settings", path: "/admin/settings" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openSubmenu, setOpenSubmenu] = useState<{ type: string; index: number } | null>(null);

  const role = normalizeRole((session?.user as any)?.role);

  // Compute navigation dynamically based on role
  let navItems = defaultNavItems;
  let adminItems = othersItems;

  if (role === "rekanan" || role === "transport") {
    navItems = [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <Package className="h-5 w-5" />,
        name: "POSTO",
        subItems: [
          { name: "Datatable Posto", path: "/posto" },
          { name: "Pengajuan Jatuh Tempo", path: "/pengajuan/jatuh-tempo" },
        ],
      },
      {
        icon: <ClipboardList className="h-5 w-5" />,
        name: "Tiket",
        subItems: [
          { name: "Datatable Tiket", path: "/tiket" },
          { name: "Booking Tiket", path: "/tiket/booking" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: role === "transport" ? "Transport" : "Armada",
        subItems: [
          { name: "List Armada", path: "/armada" },
          { name: "Pengajuan Armada Baru", path: "/armada/pengajuan" },
        ],
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Report Pemesanan Tiket", path: "/reports/booking" },
        ],
      },
    ];
    adminItems = [];
  } else if (role === "admin") {
    navItems = [
      {
        icon: <LayoutGrid className="h-5 w-5" />,
        name: "Dashboard",
        path: "/",
      },
      {
        icon: <Settings className="h-5 w-5" />,
        name: "SETTING",
        subItems: [
          { name: "Konfigurasi Plant", path: "/superadmin/settings/plants" },
          { name: "Master Sumbu", path: "/superadmin/settings/sumbu" },
          { name: "Master Percepatan", path: "/superadmin/settings/percepatan" },
          { name: "Konfigurasi Armada", path: "/superadmin/settings/fleet" },
          { name: "Produk & Mapping", path: "/superadmin/settings/products" },
          { name: "Gudang & Mapping", path: "/superadmin/settings/warehouses" },
          { name: "Konfigurasi Rekanan", path: "/superadmin/settings/transport" },
        ],
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Antrian",
        path: "/antrian",
      },
      {
        icon: <ClipboardList className="h-5 w-5" />,
        name: "Tiket",
        path: "/admin/tickets",
      },
      {
        icon: <ArrowRightLeft className="h-5 w-5" />,
        name: "Resume in Transit",
        path: "/transit",
      },
      {
        icon: BarChart3,
        name: "Laporan",
        path: "/reports",
        subItems: [
          { name: "Summary Laporan", path: "/reports" },
          { name: "Antrian Per Gudang", path: "/reports/antrian" },
          { name: "Performance Analysis", path: "/admin/reports/performance" },
        ],
      },
    ];
  } else if (role === "superadmin") {
    navItems = [
      {
        icon: <LayoutGrid className="h-5 w-5" />,
        name: "Dashboard",
        path: "/",
      },
      {
        icon: <Settings className="h-5 w-5" />,
        name: "SETTING",
        subItems: [
          { name: "Konfigurasi Plant", path: "/superadmin/settings/plants" },
          { name: "Tambah Plant", path: "/superadmin/settings/plants/new" },
          { name: "Konfigurasi All User", path: "/superadmin/settings/users" },
          { name: "Master Sumbu", path: "/superadmin/settings/sumbu" },
          { name: "Master Percepatan", path: "/superadmin/settings/percepatan" },
          { name: "Konfigurasi Armada", path: "/superadmin/settings/fleet" },
          { name: "Produk & Mapping", path: "/superadmin/settings/products" },
          { name: "Gudang & Mapping", path: "/superadmin/settings/warehouses" },
          { name: "Konfigurasi Rekanan", path: "/superadmin/settings/transport" },
        ],
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Antrian",
        path: "/antrian",
      },
      {
        icon: <ClipboardList className="h-5 w-5" />,
        name: "Tiket Master",
        path: "/admin/tickets",
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Global Reports",
        path: "/admin/reports",
      },
    ];
  } else if (role === "pod") {
    navItems = [
      {
        icon: <LayoutGrid className="h-5 w-5" />,
        name: "Dashboard",
        path: "/",
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Antrian",
        path: "/antrian",
      },
      {
        icon: <Package className="h-5 w-5" />,
        name: "POSTO",
        subItems: [
          { name: "Upload Posto", path: "/posto/upload" },
          { name: "Data Posto", path: "/posto" },
          { name: "Cut Off Posto", path: "/posto/cut-off" },
          { name: "Prioritas Tujuan", path: "/posto/priority" },
        ],
      },
      {
        icon: <Ticket className="h-5 w-5" />,
        name: "TIKET",
        subItems: [
          { name: "Datatable Tiket", path: "/admin/tickets" },
        ],
      },
      {
        icon: <CalendarCheck className="h-5 w-5" />,
        name: "KUOTA",
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
          { name: "Bypass Antrian", path: "/gudang/bypass" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Armada",
        subItems: [
          { name: "Datatable Armada", path: "/armada" },
          { name: "Pengajuan Armada", path: "/armada/approvals" },
          { name: "Sumbu Kendaraan", path: "/armada/axle-setup" },
        ],
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Laporan Tiket", path: "/reports/tickets" },
          { name: "Laporan Antrian", path: "/reports/queue" },
          { name: "Laporan Armada", path: "/reports/fleet" },
          { name: "Laporan Gudang", path: "/reports/warehouses" },
          { name: "Laporan Posto", path: "/reports/posto" },
          { name: "Laporan Statistik", path: "/reports/stats" },
        ],
      },
    ];
    // Hide specialized user management items for POD
    adminItems = [];
  } else if (role === "security") {
    navItems = [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <ClipboardList className="h-5 w-5" />,
        name: "Tiket",
        subItems: [
          { name: "Data Tiket", path: "/tiket" },
        ],
      },
      {
        icon: <Scan className="h-5 w-5" />,
        name: "Scan",
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
          { name: "Antrian Per Gudang", path: "/reports/antrian" },
        ],
      },
    ];
    adminItems = [];
  } else if (role === "jembatan_timbang") {
    navItems = [
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
          { name: "ByPass Antrian", path: "/antrian/bypass" },
          { name: "Gudang", path: "/gudang" },
          // { name: "Batch Gudang Pemuatan", path: "/gudang/batch" },
          { name: "Antrian Per Gudang", path: "/reports/antrian" },
        ],
      },
    ];
    adminItems = [];
  } else if (role === "gudang") {
    navItems = [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      { icon: <ClipboardList className="h-5 w-5" />, name: "Tiket", path: "/tiket" },
      {
        icon: <Scan className="h-5 w-5" />,
        name: "Scan",
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
          // { name: "Batch Gudang Pemuatan", path: "/gudang/batch" },
          { name: "Gudang Tujuan Bagian", path: "/gudang/tujuan-bagian" },
          { name: "Antrian Per Gudang", path: "/reports/antrian" },
          { name: "Trafik Antrian Gudang", path: "/gudang/trafik" },
        ],
      },
    ];
    adminItems = [];
  } else if (role === "candal") {
    navItems = [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <CalendarCheck className="h-5 w-5" />,
        name: "Kuota Pemuatan",
        subItems: [
          { name: "Penjadwalan Kuota", path: "/kuota/schedule" },
          { name: "Kuota per Shift", path: "/kuota/shifts" },
          { name: "Pengaturan Shift", path: "/shift" },
          { name: "Template Kuota", path: "/kuota/template" },
        ],
      },
      {
        icon: <Package className="h-5 w-5" />,
        name: "POSTO",
        subItems: [
          { name: "Data POSTO", path: "/posto" },
          { name: "Data SO", path: "/so" },
          { name: "Prioritas Tujuan Muat", path: "/posto/priority" },
        ],
      },
      { icon: <ClipboardList className="h-5 w-5" />, name: "Tiket", path: "/tiket" },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Gudang & Antrian",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "ByPass Antrian", path: "/antrian/bypass" },
          { name: "Gudang", path: "/gudang" },
          { name: "Antrian Per Gudang", path: "/reports/antrian" },
          { name: "Trafik Antrian Gudang", path: "/gudang/trafik" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Armada",
        subItems: [
          { name: "List Armada", path: "/armada" },
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
    ];
    adminItems = [];
  } else if (role === "staffarea") {
    navItems = [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Antrian",
        path: "/antrian",
      },
      {
        icon: <Package className="h-5 w-5" />,
        name: "POSTO",
        subItems: [
          { name: "Upload Posto", path: "/posto/upload" },
          { name: "Data Posto", path: "/posto" },
          { name: "Cut Off Posto", path: "/posto/cut-off" },
          { name: "Prioritas Tujuan", path: "/posto/priority" },
        ],
      },
      {
        icon: <Ticket className="h-5 w-5" />,
        name: "TIKET",
        subItems: [
          { name: "Datatable Tiket", path: "/admin/tickets" },
        ],
      },
      {
        icon: <CalendarCheck className="h-5 w-5" />,
        name: "KUOTA",
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
          { name: "Bypass Antrian", path: "/gudang/bypass" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Armada",
        subItems: [
          { name: "Datatable Armada", path: "/armada" },
          { name: "Pengajuan Armada", path: "/armada/approvals" },
          { name: "Sumbu Kendaraan", path: "/armada/axle-setup" },
        ],
      },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Laporan Tiket", path: "/reports/tickets" },
          { name: "Antrian Per Gudang", path: "/reports/antrian" },
          { name: "Laporan Armada", path: "/reports/fleet" },
          { name: "Laporan Gudang", path: "/reports/warehouses" },
          { name: "Laporan Posto", path: "/reports/posto" },
          { name: "Laporan Statistik", path: "/reports/stats" },
        ],
      },
    ];
    adminItems = [];
  } else if (role === "viewer") {
    // Viewer = multi-company monitoring (Viewer + PKG roles in cshtml)
    navItems = [
      {
        icon: <LayoutGrid className="h-5 w-5" />,
        name: "Dashboard",
        subItems: [
          { name: "Petrokimia Gresik", path: "/dashboard?company=PKG" },
          { name: "Pupuk Kujang", path: "/dashboard?company=PKC" },
          { name: "Pupuk Iskandar Muda", path: "/dashboard?company=PIM" },
          { name: "UPP Meneng Banyuwangi", path: "/dashboard?company=LOG4MENENG" },
          { name: "DC Makasar DSP", path: "/dashboard?company=D243" },
          { name: "UPP Semarang", path: "/dashboard?company=F207" },
          { name: "GD Romokalisari Surabaya", path: "/dashboard?company=ROMO" },
          { name: "DC Medan", path: "/dashboard?company=MEDAN" },
          { name: "DC Cilacap", path: "/dashboard?company=CILACAP" },
          { name: "DC Lampung", path: "/dashboard?company=B205" },
          { name: "UPP Celukan Bawang", path: "/dashboard?company=F249" },
          { name: "UPP Lembar", path: "/dashboard?company=LOMBOK" },
          { name: "UPP Makasar", path: "/dashboard?company=MAKASAR2" },
          { name: "UPP Banjarmasin", path: "/dashboard?company=BANJARMASIN2" },
        ],
      },
      {
        icon: <ClipboardList className="h-5 w-5" />,
        name: "Tiket",
        subItems: [
          { name: "Dashboard Tiket", path: "/tiket/dashboard" },
        ],
      },
      {
        icon: <BarChart3 className="h-5 w-5" />,
        name: "Antrian",
        subItems: [
          { name: "Antrian PKG", path: "/antrian?company=PKG" },
          { name: "Antrian PKC", path: "/antrian?company=PKC" },
          { name: "Antrian PIM", path: "/antrian?company=PIM" },
          { name: "Antrian Meneng", path: "/antrian?company=LOG4MENENG" },
          { name: "Antrian DC Makasar", path: "/antrian?company=D243" },
          { name: "Antrian UPP Semarang", path: "/antrian?company=F207" },
          { name: "Antrian Romokalisari", path: "/antrian?company=ROMO" },
          { name: "Antrian DC Medan", path: "/antrian?company=MEDAN" },
          { name: "Antrian DC Cilacap", path: "/antrian?company=CILACAP" },
          { name: "Antrian DC Lampung", path: "/antrian?company=B205" },
          { name: "Antrian Celukan Bawang", path: "/antrian?company=F249" },
          { name: "Antrian UPP Lembar", path: "/antrian?company=LOMBOK" },
          { name: "Antrian UPP Makasar", path: "/antrian?company=MAKASAR2" },
          { name: "Antrian UPP Banjarmasin", path: "/antrian?company=BANJARMASIN2" },
        ],
      },
      { icon: <ArrowRightLeft className="h-5 w-5" />, name: "Resume Transit", path: "/resume-transit" },
    ];
    adminItems = [
      {
        icon: <Settings className="h-5 w-5" />,
        name: "Admin",
        subItems: [
          { name: "Management Plant", path: "/admin/plant" },
        ],
      },
    ];
  } else if (role === "pkd") {
    navItems = [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      {
        icon: <Package className="h-5 w-5" />,
        name: "POSTO",
        subItems: [
          { name: "Data POSTO", path: "/posto" },
          { name: "Data SO", path: "/so" },
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
        name: "Gudang & Antrian",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "ByPass Antrian", path: "/antrian/bypass" },
          { name: "Gudang", path: "/gudang" },
          { name: "Antrian Per Gudang", path: "/reports/antrian" },
          { name: "Trafik Antrian Gudang", path: "/gudang/trafik" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Armada",
        subItems: [
          { name: "List Armada", path: "/armada" },
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
    ];
    adminItems = [];
  } else if (role === "eksternal") {
    navItems = [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
    ];
    adminItems = [];
  }

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const handleSubmenuToggle = (index: number, type: string) => {
    setOpenSubmenu((prev) =>
      prev?.type === type && prev?.index === index ? null : { type, index }
    );
  };

  const renderMenuItems = (items: NavItem[], type: string) => (
    <ul className="flex flex-col gap-2">
      {items.map((nav, index) => {
        const isOpen = openSubmenu?.type === type && openSubmenu?.index === index;
        const hasActiveSubItem = nav.subItems?.some(sub => isActive(sub.path));

        return (
          <li key={nav.name}>
            {nav.subItems ? (
              <div>
                <button
                  onClick={() => handleSubmenuToggle(index, type)}
                  className={`menu-item group ${isOpen || hasActiveSubItem ? "menu-item-active" : "menu-item-inactive"
                    } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                >
                  <span className={`${isOpen || hasActiveSubItem ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <>
                      <span className="menu-item-text ml-3 flex-grow text-left">{nav.name}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                    </>
                  )}
                </button>
                {isOpen && (isExpanded || isHovered || isMobileOpen) && (
                  <ul className="mt-2 ml-11 space-y-1">
                    {nav.subItems.map((sub) => (
                      <li key={sub.name}>
                        <Link
                          href={sub.path}
                          className={`menu-dropdown-item ${isActive(sub.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"
                            }`}
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <Link
                href={nav.path || "#"}
                className={`menu-item group ${isActive(nav.path || "") ? "menu-item-active" : "menu-item-inactive"
                  } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
              >
                <span className={`${isActive(nav.path || "") ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}>
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text ml-3">{nav.name}</span>
                )}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed top-0 left-0 z-100 h-screen transition-all duration-300 ease-in-out bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
        ${isExpanded || isHovered || isMobileOpen ? "w-72" : "w-20"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex items-center h-20 px-6 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link href="/" className="flex items-center gap-3">
          {!(isExpanded || isHovered || isMobileOpen) ? (
            <div className="flex items-center justify-center">
              <Image
                src="/images/logo/avatar.jpg"
                alt="Sistro"
                width={40}
                height={40}
                className="object-cover rounded-full border border-gray-100 shadow-sm"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-[140px]">
              <Image src="/images/logo/logosistro.png" alt="Sistro" width={70} height={32} className="object-contain" />
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />
              <Image src="/images/logo/logocompany.png" alt="Pupuk Indonesia" width={80} height={32} className="object-contain" />
            </div>
          )}
        </Link>
      </div>

      <div className="flex flex-col px-4 py-4 h-[calc(100vh-80px)] overflow-y-auto no-scrollbar">
        <nav className="flex-grow">
          <div className="mb-6">
            <h3 className={`mb-4 px-3 text-xs font-semibold uppercase text-gray-400 ${!isExpanded && !isHovered ? "lg:hidden" : "block"}`}>
              Main Menu
            </h3>
            {renderMenuItems(navItems, "main")}
          </div>

          {adminItems.length > 0 && (
            <div>
              <h3 className={`mb-4 px-3 text-xs font-semibold uppercase text-gray-400 ${!isExpanded && !isHovered ? "lg:hidden" : "block"}`}>
                Administration
              </h3>
              {renderMenuItems(adminItems, "others")}
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
