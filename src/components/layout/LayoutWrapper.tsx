"use client";
import { usePathname } from "next/navigation";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { useSidebar } from "@/context/SidebarContext";
import { useSession } from "next-auth/react";
import { normalizeRole } from "@/lib/menu-configs";
import { ShieldAlert } from "lucide-react";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isExpanded, isHovered, isMobileOpen, toggleMobileSidebar } =
    useSidebar();

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/auth/role-select" ||
    pathname === "/security/print";

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-12 w-12 rounded-full border-4 border-gray-200 dark:border-gray-800 border-t-brand-500 animate-spin"></div>
      </div>
    );
  }

  const isAdminRoute =
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/admin/pengaturan");

  const rawMenuGroups = (session?.user as any)?.menuGroups as
    string[] | undefined;
  const rawMenuGroup = (session?.user as any)?.menuGroup as string | undefined;
  let activeGroups: string[] = [];
  if (rawMenuGroups && rawMenuGroups.length > 0) {
    activeGroups = rawMenuGroups;
  } else if (rawMenuGroup) {
    activeGroups = [rawMenuGroup];
  } else if (session?.user) {
    activeGroups = [normalizeRole((session?.user as any)?.role)];
  }

  const userRole = ((session?.user as any)?.role || "").toLowerCase();
  const isSuperAdmin =
    activeGroups.includes("superadmin") ||
    userRole === "superadmin" ||
    userRole === "ti";

  const showAccessDenied =
    isAdminRoute && !isSuperAdmin;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <AppSidebar />

      {/* Mobile Sidebar Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-90 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      <div
        className={`relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden no-scrollbar transition-all duration-300 ease-in-out
          ${isExpanded || isHovered ? "lg:ml-72" : "lg:ml-20"}
        `}
      >
        <AppHeader />
        <main className="p-4 md:p-6 lg:p-8">
          {showAccessDenied ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4 dark:bg-rose-500/10 ring-8 ring-rose-500/5 animate-pulse">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                Akses Ditolak
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
                Anda tidak memiliki izin yang diperlukan untuk mengakses halaman
                menu administration. Halaman ini hanya dapat diakses oleh
                Superadmin.
              </p>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/10 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                Kembali ke Dashboard
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
