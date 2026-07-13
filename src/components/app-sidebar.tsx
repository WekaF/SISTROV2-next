"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Truck,
  Factory,
  Ticket,
  Map,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Scan,
  Box,
  ClipboardList,
  UserCog,
  Building2,
  Package,
  History,
  FileCheck,
  CalendarCheck,
  Upload,
  Scissors,
  SortAsc,
  AlertCircle,
  ShieldCheck,
  Users,
  Layers,
  Warehouse,
  MapPin,
  TrendingUp,
  ArrowLeftRight,
  FileText,
  Zap,
  XCircle,
  Database,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { useAuth, Role } from "@/context/auth-context"
import { useSession, signOut } from "next-auth/react"

// ─── Map backend ASP.NET role names → sidebar Role ───────────────────────────
// Backend returns roles like "CandalKuota", lowercased in auth.ts to "candalkuota"
const ASPNET_ROLE_MAP: Record<string, Role> = {
  // TI / IT Admin
  ti: "superadmin",
  // Candal (quota operators)
  candalkuota: "candal",
  candaltruk: "candal",
  candaltruck: "candal",
  candalcontainer: "candal",
  candalgudangposto: "candal",
  // Staff Area
  staffarea: "staffarea",
  staffarealayah1: "staffarea",
  staffarealayah2: "staffarea",
  staffarewilayah1: "staffarea",
  staffarewilayah2: "staffarea",
  staffareajatim: "staffarea",
  // Viewer (multi-plant read-only) — including PKG plant-specific viewer
  viewer: "viewer",
  pkg: "viewer",
  viewerposto: "viewer",
  viewerarmada: "viewer",
  // Transport / Rekanan
  transport: "transport",
  transportsuraljalan: "transport",
  rekanan: "rekanan",
  // Security / Gerbang
  security: "security",
  securitylini3: "security",
  // Gudang
  gudang: "gudang",
  candalgudang: "gudang",
  gudanglini3: "gudang",
  checkerlini3: "gudang",
  // Jembatan Timbang
  timbangan: "jembatan_timbang",
  // POD (AdminArmada + Approver)
  adminarmada: "pod",
  // Pelabuhan / Terminal
  pelabuhanapp: "pkd",
  pelabuhanuppp: "pkd",
  terminal1: "pkd",
  terminal2: "pkd",
  // Superadmin fallbacks
  admin: "admin",
  superadmin: "superadmin",
  admingudang: "gudang",
  admingudangcandalgudang: "gudang",
}

function mapAspnetRole(rawRole: string | undefined | null): Role {
  if (!rawRole) return "eksternal"
  const key = rawRole.toLowerCase().replace(/\s+/g, "")
  return ASPNET_ROLE_MAP[key] ?? "eksternal"
}

// ─── Shared menu fragments ────────────────────────────────────────────────────

const MENU_POSTO_FULL = {
  title: "POSTO / SO",
  url: "#",
  icon: ClipboardList,
  items: [
    { title: "Data POSTO", url: "/posto", icon: ClipboardList },
    { title: "Data SO", url: "/posto/so", icon: FileText },
    { title: "Cut Off POSTO", url: "/posto/cut-off", icon: Scissors },
    { title: "Prioritas Tujuan Muat", url: "/posto/priority", icon: SortAsc },
    { title: "Upload POSTO / SO", url: "/posto/upload", icon: Upload },
    { title: "Pengajuan Jatuh Tempo", url: "/pengajuan/jatuh-tempo", icon: AlertCircle },
  ],
}

const MENU_POSTO_VIEW = { title: "POSTO", url: "/posto", icon: ClipboardList }

const MENU_KUOTA_FULL = {
  title: "Kuota Pemuatan",
  url: "#",
  icon: CalendarCheck,
  items: [
    { title: "Penjadwalan Kuota", url: "/kuota/schedule", icon: CalendarCheck },
    { title: "Kuota per Shift", url: "/kuota/shifts", icon: Layers },
  ],
}

const MENU_ARMADA_TRANSPORT = {
  title: "Armada Saya",
  url: "#",
  icon: Truck,
  items: [
    { title: "Data Armada", url: "/armada", icon: Truck },
    { title: "Pengajuan Armada Baru", url: "/armada/pengajuan", icon: FileCheck },
    { title: "Pengajuan Jatuh Tempo", url: "/pengajuan/jatuh-tempo", icon: AlertCircle },
  ],
}

const MENU_ARMADA_ADMIN = {
  title: "Armada",
  url: "#",
  icon: Truck,
  items: [
    { title: "List Armada", url: "/armada", icon: Truck },
    { title: "Approval Pengajuan", url: "/armada/approvals", icon: ShieldCheck },
  ],
}

const MENU_GUDANG = {
  title: "Gudang",
  url: "#",
  icon: Warehouse,
  items: [
    { title: "List Gudang", url: "/gudang", icon: Package },
    { title: "Antrian Per Unit", url: "/gudang/unit-queue", icon: Layers },
    { title: "Gudang Tujuan Bagian", url: "/gudang/tujuan-bagian", icon: Building2 },

    { title: "Traffic Antrian", url: "/gudang/trafik", icon: ArrowLeftRight },
    { title: "Bypass Antrian", url: "/gudang/bypass", icon: Zap },
    { title: "Mapping Zero ODOL", url: "/armada/mapping-zero-odol", icon: MapPin },
  ],
}

const MENU_REPORTS = {
  title: "Laporan",
  url: "#",
  icon: BarChart3,
  items: [
    { title: "Summary Laporan", url: "/reports", icon: BarChart3 },
    { title: "Laporan Tiket", url: "/reports/tiket-pi", icon: FileText },
    { title: "Laporan Booking", url: "/reports/booking", icon: ClipboardList },
    { title: "Laporan Loading", url: "/reports/loading", icon: Truck },
    { title: "Laporan Pembatalan", url: "/reports/cancelation", icon: XCircle },
    { title: "Log Bypass", url: "/reports/log-bypass", icon: AlertCircle },
    { title: "Log Kuota", url: "/reports/log-kuota", icon: Database },
  ],
}

const MENU_PENGATURAN_SUPERADMIN = {
  title: "Pengaturan",
  url: "#",
  icon: Settings,
  items: [
    { title: "Semua Pengguna", url: "/admin/users", icon: Users },
    { title: "Management User", url: "/superadmin/settings/users", icon: UserCog },
    { title: "Area Scope User", url: "/superadmin/settings/area-scope", icon: MapPin },
    { title: "User Transport", url: "/admin/pengaturan/rekanan", icon: Users },
    { title: "Company / Plant", url: "/admin/pengaturan/plant", icon: Factory },
    { title: "Produk", url: "/admin/pengaturan/produk", icon: Package },
    { title: "Mapping Produk Gudang", url: "/admin/pengaturan/mapping-produk", icon: Building2 },
    { title: "Fleet / Armada", url: "/superadmin/settings/fleet", icon: Truck },
  ],
}

const MENU_PENGATURAN_ADMIN = {
  title: "Pengaturan",
  url: "#",
  icon: Settings,
  items: [
    { title: "Management User", url: "/admin/pengaturan/user", icon: UserCog },
    { title: "Produk", url: "/admin/pengaturan/produk", icon: Package },
  ],
}

// ─── Role → Menu mapping ──────────────────────────────────────────────────────

const roleMenus: Record<Role, any[]> = {

  // ── Superadmin / TI — akses penuh ─────────────────────────────────────────
  superadmin: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_FULL,
    MENU_KUOTA_FULL,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    MENU_GUDANG,
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    MENU_REPORTS,
    MENU_ARMADA_ADMIN,
  ],

  // ── Admin — sama dengan superadmin ────────────────────────────────────────
  admin: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_FULL,
    MENU_KUOTA_FULL,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    MENU_GUDANG,
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    MENU_REPORTS,
    MENU_ARMADA_ADMIN,
    MENU_PENGATURAN_ADMIN,
  ],

  // ── Candal (CandalKuota / CandalTruk / CandalContainer) ───────────────────
  candal: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_FULL,
    MENU_KUOTA_FULL,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    MENU_REPORTS,
  ],

  // ── Staff Area (StaffArea + StaffAreaWilayah) ─────────────────────────────
  staffarea: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_FULL,
    {
      title: "Kuota Pemuatan",
      url: "#",
      icon: CalendarCheck,
      items: [
        { title: "Penjadwalan Kuota", url: "/kuota/schedule", icon: CalendarCheck },
        { title: "Kuota per Shift", url: "/kuota/shifts", icon: Layers },
        { title: "Mapping Zero ODOL", url: "/armada/mapping-zero-odol", icon: MapPin },
      ],
    },
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    MENU_REPORTS,
  ],

  // ── Viewer — read-only, lihat semua company ────────────────────────────────
  viewer: [
    {
      title: "Dashboard",
      url: "#",
      icon: LayoutDashboard,
      items: [
        { title: "Dashboard Utama", url: "/", icon: LayoutDashboard },
        { title: "Report Plant", url: "/dashboard/report", icon: BarChart3 },
        { title: "Pengajuan Armada", url: "/dashboard/armada", icon: Truck },
      ],
    },
    {
      title: "Tiket",
      url: "#",
      icon: Ticket,
      items: [
        { title: "Dashboard Tiket", url: "/tiket/dashboard", icon: ClipboardList },
        { title: "Track Tiket Integrasi DO", url: "/tiket/track-do", icon: Map },
      ],
    },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    MENU_REPORTS,
  ],

  // ── Rekanan / Transport — operator kendaraan ──────────────────────────────
  rekanan: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    MENU_REPORTS,
    MENU_ARMADA_TRANSPORT,
  ],

  transport: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    MENU_REPORTS,
    MENU_ARMADA_TRANSPORT,
  ],

  // ── Security / Gerbang ────────────────────────────────────────────────────
  security: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Scan Tiket", url: "/scan/tiket", icon: Scan },
    MENU_REPORTS,
  ],

  // ── Gudang ────────────────────────────────────────────────────────────────
  gudang: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    MENU_GUDANG,
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Scan Tiket", url: "/scan/tiket", icon: Scan },
    MENU_REPORTS,
  ],

  // ── Jembatan Timbang ──────────────────────────────────────────────────────
  jembatan_timbang: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Scan Tiket", url: "/scan/tiket", icon: Scan },
    MENU_REPORTS,
  ],

  // ── POD — AdminArmada + approver pengajuan ────────────────────────────────
  pod: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    MENU_REPORTS,
    MENU_ARMADA_ADMIN,
    { title: "Penjadwalan Kuota", url: "/kuota/schedule", icon: CalendarCheck },
    { title: "Mapping Zero ODOL", url: "/armada/mapping-zero-odol", icon: MapPin },
  ],

  // ── PKD — Pelabuhan / Terminal ────────────────────────────────────────────
  pkd: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    MENU_REPORTS,
  ],

  // ── Eksternal — akses minimal ─────────────────────────────────────────────
  eksternal: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
  const { setRole } = useAuth()

  const rawRole = (session?.user as any)?.role as string | undefined
  const activeRole = mapAspnetRole(rawRole)
  const navMain = roleMenus[activeRole]

  const userName = session?.user?.name || "User"
  const userEmail = session?.user?.email || ""
  const userInitials = userName.substring(0, 2).toUpperCase()

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent h-auto py-2">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  <img
                    src="/images/logo/logo-text1.png"
                    alt="SISTRO"
                    className="h-7 w-auto object-contain dark:hidden"
                  />
                  <img
                    src="/images/logo/logo-text.png"
                    alt="SISTRO"
                    className="h-7 w-auto object-contain hidden dark:block"
                  />
                </div>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 flex-shrink-0" />
                <div className="flex-shrink-0">
                  <img
                    src="/images/logo/logopihd.png"
                    alt="Pupuk Indonesia"
                    className="h-7 w-auto object-contain dark:brightness-0 dark:invert"
                  />
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu ({activeRole.replace("_", " ").toUpperCase()})</SidebarGroupLabel>
          <SidebarMenu>
            {navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                {item.items ? (
                  <>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/menu-item:rotate-90" />
                    </SidebarMenuButton>
                    <SidebarMenuSub>
                      {item.items.map((subItem: { title: string; url: string; icon?: React.ComponentType<{ className?: string }> }) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton href={subItem.url}>
                            {subItem.icon && <subItem.icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                            <span>{subItem.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </>
                ) : (
                  <SidebarMenuButton render={<a href={item.url} />} tooltip={item.title} isActive={item.url === "/"}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {(activeRole === "superadmin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              {MENU_PENGATURAN_SUPERADMIN.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton render={<a href={item.url} />} tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userName}</span>
                  <span className="truncate text-xs">{userEmail}</span>
                </div>
                <ChevronDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                      <span className="truncate text-xs">{userEmail}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">Switch Role (Debug)</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={activeRole} onValueChange={(v) => setRole(v as Role)}>
                  {Object.keys(roleMenus).map((r) => (
                    <DropdownMenuRadioItem key={r} value={r} className="text-xs uppercase">
                      {r.replace("_", " ")}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
