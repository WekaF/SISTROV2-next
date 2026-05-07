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
  ti:                    "superadmin",
  // Candal (quota operators)
  candalkuota:           "candal",
  candaltruk:            "candal",
  candaltruck:           "candal",
  candalcontainer:       "candal",
  candalgudangposto:     "candal",
  // Staff Area
  staffarea:             "staffarea",
  staffarealayah1:       "staffarea",
  staffarealayah2:       "staffarea",
  staffarewilayah1:      "staffarea",
  staffarewilayah2:      "staffarea",
  staffareajatim:        "staffarea",
  // Viewer (multi-plant read-only) — including PKG plant-specific viewer
  viewer:                "viewer",
  pkg:                   "viewer",
  viewerposto:           "viewer",
  viewerarmada:          "viewer",
  // Transport / Rekanan
  transport:             "transport",
  transportsuraljalan:   "transport",
  rekanan:               "rekanan",
  // Security / Gerbang
  security:              "security",
  securitylini3:         "security",
  // Gudang
  gudang:                "gudang",
  candalgudang:          "gudang",
  gudanglini3:           "gudang",
  checkerlini3:          "gudang",
  // Jembatan Timbang
  timbangan:             "jembatan_timbang",
  // POD (AdminArmada + Approver)
  adminarmada:           "pod",
  // Pelabuhan / Terminal
  pelabuhanapp:          "pkd",
  pelabuhanuppp:         "pkd",
  terminal1:             "pkd",
  terminal2:             "pkd",
  // Superadmin fallbacks
  admin:                 "admin",
  superadmin:            "superadmin",
  admingudang:           "gudang",
  admingudangcandalgudang: "gudang",
}

function mapAspnetRole(rawRole: string | undefined | null): Role {
  if (!rawRole) return "eksternal"
  const key = rawRole.toLowerCase().replace(/\s+/g, "")
  return ASPNET_ROLE_MAP[key] ?? "eksternal"
}

// ─── Shared menu fragments ────────────────────────────────────────────────────

const MENU_POSTO_FULL = {
  title: "POSTO",
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
    { title: "Konfigurasi Sumbu", url: "/armada/axle-setup", icon: Settings },
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
    { title: "Monitoring Pemuatan", url: "/gudang/targets", icon: MapPin },
    { title: "Traffic Antrian", url: "/gudang/trafik", icon: ArrowLeftRight },
    { title: "Bypass Antrian", url: "/gudang/bypass", icon: Zap },
  ],
}

const MENU_REPORTS = {
  title: "Laporan",
  url: "#",
  icon: BarChart3,
  items: [
    { title: "Summary Laporan", url: "/reports", icon: BarChart3 },
    { title: "Antrian Per Gudang", url: "/reports/antrian", icon: History },
  ],
}

const MENU_PENGATURAN_ADMIN = {
  title: "Pengaturan",
  url: "#",
  icon: Settings,
  items: [
    { title: "Management User", url: "/admin/pengaturan/user", icon: UserCog },
    { title: "User Transport", url: "/admin/pengaturan/rekanan", icon: Users },
    { title: "Company / Plant", url: "/admin/pengaturan/plant", icon: Factory },
    { title: "Produk", url: "/admin/pengaturan/produk", icon: Package },
    { title: "Mapping Produk Gudang", url: "/admin/pengaturan/mapping-produk", icon: Building2 },
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
    MENU_PENGATURAN_ADMIN,
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
    { title: "Laporan", url: "/reports", icon: BarChart3 },
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
      ],
    },
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Laporan", url: "/reports", icon: BarChart3 },
  ],

  // ── Viewer — read-only, lihat semua company ────────────────────────────────
  viewer: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Laporan", url: "/reports", icon: BarChart3 },
  ],

  // ── Rekanan / Transport — operator kendaraan ──────────────────────────────
  rekanan: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Laporan", url: "/reports", icon: BarChart3 },
    MENU_ARMADA_TRANSPORT,
  ],

  transport: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Laporan", url: "/reports", icon: BarChart3 },
    MENU_ARMADA_TRANSPORT,
  ],

  // ── Security / Gerbang ────────────────────────────────────────────────────
  security: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Scan Tiket", url: "/scan/tiket", icon: Scan },
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
  ],

  // ── Jembatan Timbang ──────────────────────────────────────────────────────
  jembatan_timbang: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Scan Tiket", url: "/scan/tiket", icon: Scan },
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
  ],

  // ── PKD — Pelabuhan / Terminal ────────────────────────────────────────────
  pkd: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    MENU_POSTO_VIEW,
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/track/tiket", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Laporan", url: "/reports", icon: BarChart3 },
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
            <SidebarMenuButton size="lg" className="hover:bg-transparent">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Ticket className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-[#005FA4]">SISTRO</span>
                <span className="truncate text-xs text-muted-foreground">Digital Logistics Platform</span>
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
                      {item.items.map((subItem: { title: string; url: string }) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton href={subItem.url}>
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
