"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSidebar } from "@/context/SidebarContext";
import {
  LayoutGrid,
  Calendar,
  User,
  Table as TableIcon,
  FileText,
  PieChart,
  Settings,
  MoreHorizontal,
  ChevronDown,
  Monitor,
  Truck,
  Scan,
  Package,
  Weight,
  ShieldCheck,
  ClipboardList,
  Map as MapIcon,
  BarChart3,
  Layers,
  ArrowRightLeft,
  Upload,
  TableProperties,
  Scissors,
  Zap,
  Ticket,
  GanttChartSquare,
  History,
  HardDriveDownload,
  CalendarCheck,
} from "lucide-react";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

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

  const [overrideRole, setOverrideRole] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("debug_role_override");
    if (saved) setOverrideRole(saved);
  }, []);

  const role = overrideRole || (session?.user as any)?.role;

  // Compute navigation dynamically based on role
  let navItems = defaultNavItems;
  let adminItems = othersItems;

  if (role === "rekanan") {
    navItems = [
      {
        icon: <LayoutGrid className="h-5 w-5" />,
        name: "Dashboard",
        path: "/",
      },
      {
        icon: <Package className="h-5 w-5" />,
        name: "POSTO",
        subItems: [
          { name: "Datatable Posto", path: "/posto" },
          { name: "Pengajuan Jatuh Tempo", path: "/posto/jatuh-tempo" },
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
        name: "Report",
        subItems: [
          { name: "Report Pemesanan Tiket", path: "/report/pemesanan" },
        ],
      },
    ];
    // Hide admin configuration items for rekanan
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
        icon: <PieChart className="h-5 w-5" />,
        name: "Report",
        subItems: [
          { name: "Report Tiket", path: "/admin/reports" },
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
          { name: "Datatable Posto", path: "/posto" },
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
          { name: "List Gudang", path: "/gudang/list" },
          { name: "Antrian Per Unit", path: "/gudang/unit-queue" },
          { name: "Gudang Tujuan", path: "/gudang/targets" },
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
      { icon: <Scan className="h-5 w-5" />, name: "Scan Tiket", path: "/security/scan" },
      { icon: <Ticket className="h-5 w-5" />, name: "Status Tiket", path: "/security/tickets" },
    ];
    adminItems = [];
  } else if (role === "jembatan_timbang") {
    navItems = [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      { icon: <Scan className="h-5 w-5" />, name: "Scan Tiket", path: "/weighbridge/scan" },
      { icon: <Weight className="h-5 w-5" />, name: "Penimbangan", path: "/weighbridge/weighing" },
      { icon: <Ticket className="h-5 w-5" />, name: "Status Tiket", path: "/weighbridge/tickets" },
      { icon: <Package className="h-5 w-5" />, name: "Posto", path: "/weighbridge/posto" },
    ];
    adminItems = [];
  } else if (role === "gudang") {
    navItems = [
      { icon: <LayoutGrid className="h-5 w-5" />, name: "Dashboard", path: "/" },
      { icon: <Scan className="h-5 w-5" />, name: "Scan Tiket", path: "/warehouse/scan" },
      { icon: <Ticket className="h-5 w-5" />, name: "Status Tiket", path: "/warehouse/tickets" },
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
                  className={`menu-item group ${
                    isOpen || hasActiveSubItem ? "menu-item-active" : "menu-item-inactive"
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
                          className={`menu-dropdown-item ${
                            isActive(sub.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"
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
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <Image src="/images/logo/logo.svg" alt="Logo" width={140} height={40} className="dark:hidden" />
          ) : (
            <Image src="/images/logo/logo-icon.svg" alt="Logo" width={32} height={32} />
          )}
          {(isExpanded || isHovered || isMobileOpen) && (
             <Image src="/images/logo/logo-dark.svg" alt="Logo" width={140} height={40} className="hidden dark:block" />
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
