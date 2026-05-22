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
  Users,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

function normalizeRole(raw: string | undefined): string {
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
function mergeNavItems(itemsList: NavItem[][]): NavItem[] {
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
  return Array.from(resultMap.values());
}

function filterNavByPaths(items: NavItem[], allowedPaths: string[]): NavItem[] {
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

const MENU_CONFIGS: Record<string, { nav: NavItem[]; admin: NavItem[] }> = {
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
          { name: "Pengajuan Armada", path: "/armada/pengajuan" },
          { name: "Upload Armada", path: "/armada/upload" },
          { name: "Mapping Zero Odol", path: "/armada/mapping-zero-odol" },
          { name: "Sumbu Percepatan", path: "/armada/percepatan" },
        ],
      },
      { icon: <ClipboardList className="h-5 w-5" />, name: "Tiket", path: "/admin/tickets" },
      { icon: <Users className="h-5 w-5" />, name: "User Plant", path: "/superadmin/settings/users" },
      { icon: <CalendarClock className="h-5 w-5" />, name: "Manajemen Shift", path: "/superadmin/settings/shifts" },
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
        name: "Gudang & Antrian",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "Bypass Antrian", path: "/antrian/bypass" },
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
      { icon: <BarChart3 className="h-5 w-5" />, name: "Antrian", path: "/antrian" },
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
        subItems: [{ name: "Datatable Tiket", path: "/admin/tickets" }],
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
          { name: "Antrian PSP", path: "/antrian/report-psp" },
          { name: "Antrian PKT", path: "/antrian/report-pkt" },
        ],
      },
      { icon: <ArrowRightLeft className="h-5 w-5" />, name: "Resume Transit", path: "/resume-transit" },
      {
        icon: <FileText className="h-5 w-5" />,
        name: "Laporan",
        subItems: [
          { name: "Report Pemesanan Tiket", path: "/reports/booking" },
          { name: "Report Realisasi Pemuatan", path: "/reports/loading" },
          { name: "Report Pembatalan Tiket", path: "/reports/cancelation" },
          { name: "Resume Booking Tiket", path: "/reports/resume" },
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
          { name: "Datatable Tiket", path: "/tiket" },
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
          { name: "Datatable Tiket", path: "/tiket" },
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
          { name: "Bypass Antrian", path: "/antrian/bypass" },
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
        subItems: [{ name: "Datatable Tiket", path: "/admin/tickets" }],
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
          { name: "Bypass Antrian", path: "/gudang/bypass" },
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
          { name: "Laporan Tiket", path: "/reports/tickets" },
          { name: "Laporan Antrian", path: "/reports/queue" },
          { name: "Laporan Armada", path: "/reports/fleet" },
          { name: "Laporan Gudang", path: "/reports/warehouses" },
          { name: "Laporan Posto", path: "/reports/posto" },
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
        name: "Gudang & Antrian",
        subItems: [
          { name: "Antrian", path: "/antrian" },
          { name: "Bypass Antrian", path: "/antrian/bypass" },
          { name: "Gudang", path: "/gudang" },
          { name: "Trafik Antrian Gudang", path: "/gudang/trafik" },
        ],
      },
      {
        icon: <Truck className="h-5 w-5" />,
        name: "Armada",
        subItems: [{ name: "List Armada", path: "/armada" }],
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

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openSubmenu, setOpenSubmenu] = useState<{ type: string; index: number } | null>(null);

  const rawMenuGroups = (session?.user as any)?.menuGroups as string[] | undefined;
  const rawMenuGroup = (session?.user as any)?.menuGroup as string | undefined;

  // Priority: menuGroups array (multi-role) > single menuGroup > role normalization fallback
  let activeGroups: string[];
  if (rawMenuGroups && rawMenuGroups.length > 0) {
    activeGroups = rawMenuGroups;
  } else if (rawMenuGroup) {
    activeGroups = [rawMenuGroup];
  } else {
    activeGroups = [normalizeRole((session?.user as any)?.role)];
  }

  const rawMenuItems = (session?.user as any)?.menuItems as string[] | null | undefined;

  let navItems: NavItem[];
  let adminItems: NavItem[];

  if (rawMenuItems && rawMenuItems.length > 0) {
    const allNav = mergeNavItems(Object.values(MENU_CONFIGS).map((c) => c.nav));
    const allAdmin = mergeNavItems(Object.values(MENU_CONFIGS).map((c) => c.admin));
    navItems = filterNavByPaths(allNav, rawMenuItems);
    adminItems = filterNavByPaths(allAdmin, rawMenuItems);
  } else {
    navItems = mergeNavItems(activeGroups.map((g) => MENU_CONFIGS[g]?.nav ?? []));
    adminItems = mergeNavItems(activeGroups.map((g) => MENU_CONFIGS[g]?.admin ?? []));
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
        const hasActiveSubItem = nav.subItems?.some((sub) => isActive(sub.path));

        return (
          <li key={nav.name}>
            {nav.subItems ? (
              <div>
                <button
                  onClick={() => handleSubmenuToggle(index, type)}
                  className={`menu-item group ${
                    isOpen || hasActiveSubItem ? "menu-item-active" : "menu-item-inactive"
                  } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                >
                  <span
                    className={`${
                      isOpen || hasActiveSubItem ? "menu-item-icon-active" : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <>
                      <span className="menu-item-text ml-3 flex-grow text-left">{nav.name}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </button>
                {isOpen && (isExpanded || isHovered || isMobileOpen) && (
                  <ul className="mt-2 ml-11 space-y-1">
                    {nav.subItems.map((sub) => (
                      <li key={sub.name}>
                        <Link
                          href={sub.path}
                          className={`menu-dropdown-item ${
                            isActive(sub.path)
                              ? "menu-dropdown-item-active"
                              : "menu-dropdown-item-inactive"
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
                className={`menu-item group ${
                  isActive(nav.path || "") ? "menu-item-active" : "menu-item-inactive"
                } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
              >
                <span
                  className={`${
                    isActive(nav.path || "") ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  }`}
                >
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
      <div
        className={`flex items-center h-20 px-6 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
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
              <Image
                src="/images/logo/logosistro.png"
                alt="Sistro"
                width={70}
                height={32}
                className="object-contain"
              />
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />
              <Image
                src="/images/logo/logocompany.png"
                alt="Pupuk Indonesia"
                width={80}
                height={32}
                className="object-contain"
              />
            </div>
          )}
        </Link>
      </div>

      <div className="flex flex-col px-4 py-4 h-[calc(100vh-80px)] overflow-y-auto no-scrollbar">
        <nav className="flex-grow">
          <div className="mb-6">
            <h3
              className={`mb-4 px-3 text-xs font-semibold uppercase text-gray-400 ${
                !isExpanded && !isHovered ? "lg:hidden" : "block"
              }`}
            >
              Main Menu
            </h3>
            {renderMenuItems(navItems, "main")}
          </div>

          {adminItems.length > 0 && (
            <div>
              <h3
                className={`mb-4 px-3 text-xs font-semibold uppercase text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:hidden" : "block"
                }`}
              >
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
