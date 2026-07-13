export interface CatalogItem {
  path: string;
  label: string;
}

export interface CatalogGroup {
  category: string;
  items: CatalogItem[];
}

export const MENU_CATALOG: CatalogGroup[] = [
  {
    category: "Umum",
    items: [
      { path: "/", label: "Dashboard" },
      { path: "/resume-transit", label: "Resume Transit" },
      { path: "/shift", label: "Pengaturan Shift" },
    ],
  },
  {
    category: "Posto",
    items: [
      { path: "/posto", label: "Data Posto" },
      { path: "/so", label: "Data So" },
      { path: "/posto/cut-off", label: "Cut Off Posto" },
      { path: "/posto/priority", label: "Prioritas Tujuan Muat" },
      { path: "/posto/upload", label: "Upload POSTO / SO / So" },
      { path: "/pengajuan/jatuh-tempo", label: "Pengajuan Jatuh Tempo" },
    ],
  },
  {
    category: "Kuota",
    items: [
      { path: "/kuota/schedule", label: "Penjadwalan Kuota" },
      { path: "/kuota/shifts", label: "Kuota Per-shift" },
    ],
  },
  {
    category: "Gudang",
    items: [
      { path: "/antrian", label: "Antrian" },
      { path: "/antrian/all-plant", label: "Antrian All Plant" },
      { path: "/antrian/report-psp", label: "Antrian PSP" },
      { path: "/antrian/report-pkt", label: "Antrian PKT" },
      { path: "/antrian/horizontal", label: "Antrian Horizontal" },
      { path: "/antrian/report", label: "Antrian Report" },
      { path: "/gudang", label: "List Gudang" },
      { path: "/gudang/unit-queue", label: "Antrian Per Unit" },
      { path: "/gudang/tujuan-bagian", label: "Gudang Tujuan Bagian" },
      { path: "/antrian/live-monitoring", label: "Live Monitor Pintu Pemuatan" },

      { path: "/gudang/trafik", label: "Traffic Antrian" },
    ],
  },
  {
    category: "Armada",
    items: [
      { path: "/armada", label: "Datatable Armada" },
      { path: "/armada/pengajuan", label: "Pengajuan Armada" },
      { path: "/armada/upload", label: "Upload Armada" },
      { path: "/armada/mapping-zero-odol", label: "Mapping Zero Odol" },
      { path: "/armada/percepatan", label: "Sumbu Percepatan" },
    ],
  },
  {
    category: "Tiket",
    items: [
      { path: "/tiket", label: "Tiket" },
      { path: "/tiket/booking", label: "Booking Tiket" },
      { path: "/tiket/dashboard", label: "Dashboard Tiket" },
      { path: "/tiket/track-do", label: "Track Tiket Integrasi DO" },
      { path: "/admin/tickets", label: "Tiket Master" },
    ],
  },
  {
    category: "Scan & Track",
    items: [
      { path: "/scan/tiket", label: "Scan Tiket" },
      { path: "/scan/integrasi", label: "Integrasi Tiket" },
      { path: "/track/tiket", label: "Track Tiket" },
    ],
  },
  {
    category: "Laporan",
    items: [
      { path: "/reports", label: "Summary Laporan" },
      { path: "/reports/tiket-pi", label: "laporan tiket" },
      { path: "/reports/booking", label: "Report Pemesanan Tiket" },
      { path: "/reports/loading", label: "Report Realisasi Pemuatan" },
      { path: "/reports/cancelation", label: "Report Pembatalan Tiket" },
      { path: "/reports/bypass", label: "Report By Pass" },
      { path: "/reports/kuota-log", label: "Report Pembuatan Kuota" },
      { path: "/reports/resume", label: "Resume Booking Tiket" },
      { path: "/reports/fleet", label: "Laporan Armada" },
      { path: "/dashboard/report", label: "Report Plant" },
    ],
  },
  {
    category: "Manager",
    items: [
      { path: "/manager", label: "Dashboard Manager" },
      { path: "/manager/tiket", label: "Dashboard Tiket" },
      { path: "/manager/laporan", label: "Laporan" },
    ],
  },
  {
    category: "Administration",
    items: [
      { path: "/superadmin/settings/users", label: "User Plant" },
      { path: "/superadmin/settings/plants", label: "Konfigurasi Plant" },
      { path: "/superadmin/settings/plants/new", label: "Tambah Plant" },
      { path: "/superadmin/settings/sumbu", label: "Master Sumbu" },
      { path: "/superadmin/settings/percepatan", label: "Sumbu Percepatan" },
      { path: "/superadmin/settings/fleet", label: "Konfigurasi Armada" },
      { path: "/superadmin/settings/products", label: "Produk & Mapping" },
      { path: "/superadmin/settings/warehouses", label: "Gudang & Mapping" },
      { path: "/superadmin/settings/transport", label: "Konfigurasi Rekanan" },
      { path: "/superadmin/settings/tiket", label: "Force Delete Tiket" },
      { path: "/admin/pengaturan/user", label: "Konfigurasi All User" },
      { path: "/superadmin/settings/area-scope", label: "Area Scope User" },
      { path: "/superadmin/settings/role-menu", label: "Role & Menu Group" },
      { path: "/superadmin/settings/user-menu", label: "Menu Per User" },
      { path: "/superadmin/settings/company-menu", label: "Menu per Perusahaan" },
    ],
  },
];

export function getAllMenuPaths(): string[] {
  return MENU_CATALOG.flatMap((g) => g.items.map((i) => i.path));
}
