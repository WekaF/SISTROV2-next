"use client";
import { usePathname } from "next/navigation";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { useSidebar } from "@/context/SidebarContext";


export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = 
    pathname === "/login" || 
    pathname === "/register" || 
    pathname === "/forgot-password" ||
    pathname === "/auth/role-select";
  const { isExpanded, isHovered, isMobileOpen, toggleMobileSidebar } = useSidebar();

  if (isAuthPage) {
    return <>{children}</>;
  }

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
          {children}
        </main>
      </div>
    </div>
  );
}
