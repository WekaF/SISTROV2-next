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
  User,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

const menuIcons = {
  Dashboard: LayoutDashboard,
  Tiket: Ticket,
  Posto: ClipboardList,
  "Antrian Gudang": History,
  "Tracking Truck": Map,
  Stock: Box,
  Laporan: BarChart3,
  Pengaturan: Settings,
  Armada: Truck,
  "Pengajuan Jatuh Tempo": ClipboardList,
  "Pengajuan Armada": FileCheck,
  "Scan Tiket": Scan,
  "Approver Pengajuan": FileCheck,
}

const roleMenus: Record<Role, any[]> = {
  superadmin: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    { title: "Posto", url: "/posto", icon: ClipboardList },
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/tracking", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Laporan", url: "/reports", icon: BarChart3 },
    {
      title: "Pengaturan",
      url: "#",
      icon: Settings,
      items: [
        { title: "Role", url: "/admin/pengaturan/role", icon: UserCog },
        { title: "User", url: "/admin/pengaturan/user", icon: UserCog },
        { title: "Rekanan", url: "/admin/pengaturan/rekanan", icon: Building2 },
        { title: "Company/Plant", url: "/admin/pengaturan/plant", icon: Factory },
        { title: "Produk", url: "/admin/pengaturan/produk", icon: Package },
      ],
    },
  ],
  admin: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    { title: "Posto", url: "/posto", icon: ClipboardList },
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/tracking", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Laporan", url: "/reports", icon: BarChart3 },
    {
      title: "Pengaturan",
      url: "#",
      icon: Settings,
      items: [
        { title: "Role", url: "/admin/pengaturan/role", icon: UserCog },
        { title: "User", url: "/admin/pengaturan/user", icon: UserCog },
        { title: "Rekanan", url: "/admin/pengaturan/rekanan", icon: Building2 },
        { title: "Company/Plant", url: "/admin/pengaturan/plant", icon: Factory },
        { title: "Produk", url: "/admin/pengaturan/produk", icon: Package },
      ],
    },
  ],
  rekanan: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    { title: "Posto", url: "/posto", icon: ClipboardList },
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/tracking", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Laporan", url: "/reports", icon: BarChart3 },
    { title: "Armada", url: "/armada", icon: Truck },
    { title: "Pengajuan Jatuh Tempo", url: "/pengajuan/jatuh-tempo", icon: ClipboardList },
    { title: "Pengajuan Armada", url: "/pengajuan/armada", icon: FileCheck },
  ],
  security: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    { title: "Posto", url: "/posto", icon: ClipboardList },
    { title: "Scan Tiket", url: "/scan-tiket", icon: Scan },
  ],
  gudang: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    { title: "Posto", url: "/posto", icon: ClipboardList },
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Scan Tiket", url: "/scan-tiket", icon: Scan },
  ],
  jembatan_timbang: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    { title: "Posto", url: "/posto", icon: ClipboardList },
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Scan Tiket", url: "/scan-tiket", icon: Scan },
  ],
  pod: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    { title: "Posto", url: "/posto", icon: ClipboardList },
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/tracking", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Laporan", url: "/reports", icon: BarChart3 },
    { title: "Armada", url: "/armada", icon: Truck },
    { title: "Penjadwalan Kuota", url: "/kuota/schedule", icon: CalendarCheck },
    { title: "Approver Pengajuan", url: "/approver/armada", icon: FileCheck },
  ],
  pkd: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    { title: "Posto", url: "/posto", icon: ClipboardList },
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/tracking", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Laporan", url: "/reports", icon: BarChart3 },
  ],
  eksternal: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
  ],
  transport: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Tiket", url: "/ticket", icon: Ticket },
    { title: "Posto", url: "/posto", icon: ClipboardList },
    { title: "Antrian Gudang", url: "/antrian", icon: History },
    { title: "Tracking Truck", url: "/tracking", icon: Map },
    { title: "Stock", url: "/stock", icon: Box },
    { title: "Laporan", url: "/reports", icon: BarChart3 },
    { title: "Transport", url: "/armada", icon: Truck },
    { title: "Pengajuan Jatuh Tempo", url: "/pengajuan/jatuh-tempo", icon: ClipboardList },
    { title: "Pengajuan Armada", url: "/pengajuan/armada", icon: FileCheck },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout, setRole } = useAuth()
  const activeRole = user?.role || "superadmin"
  const navMain = roleMenus[activeRole]

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
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </>
                ) : (
                  <SidebarMenuButton asChild tooltip={item.title} isActive={item.url === "/"}>
                    <a href={item.url}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </a>
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
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="rounded-lg">{user?.name?.substring(0, 2).toUpperCase() || "US"}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
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
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="rounded-lg">{user?.name?.substring(0, 2).toUpperCase() || "US"}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name}</span>
                      <span className="truncate text-xs">{user?.email}</span>
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
                <DropdownMenuItem onClick={() => logout()} className="text-destructive">
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
