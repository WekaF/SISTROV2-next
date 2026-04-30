"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { PodDashboard } from "@/components/dashboard/PodDashboard";
import { RekananDashboard } from "@/components/dashboard/RekananDashboard";
import { LogisticsMetrics } from "@/components/dashboard/LogisticsMetrics";
import { ClipboardList, TrendingUp, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardClient({ session, dbRole }: { session: any, dbRole: string }) {
  const [role, setRole] = useState(dbRole?.toLowerCase());
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const primaryRole = (session?.user as any)?.role as string | undefined;
    if (primaryRole) {
      setRole(primaryRole.toLowerCase());
    } else {
      setRole(dbRole?.toLowerCase());
    }
  }, [session, dbRole]);

  useEffect(() => {
    if (role === "transport" && pathname === "/") {
      router.push("/armada");
    }
  }, [role, pathname, router]);

  // Header Title Logic
  const title = role === "admin" || role === "superadmin"
    ? "Central Command Dashboard"
    : role === "pod"
      ? "POD Operations Center"
      : role === "security"
        ? "Security Checkpoint Dashboard"
        : role === "jembatan_timbang"
          ? "Weighbridge (JBT) Station"
          : role === "gudang"
            ? "Warehouse Operations Admin"
            : role === "rekanan"
              ? "Partner Portal Dashboard"
              : role === "transport"
                ? "Transport Portal Dashboard"
                : "Logistics Overview";
  
  const description = role === "admin" || role === "superadmin"
    ? "Global monitoring across all plants and regions."
    : role === "pod"
      ? "Real-time plant operations monitoring and inventory."
      : role === "security"
        ? "Personnel entry/exit and vehicle verification."
        : role === "jembatan_timbang"
          ? "Precision weighing and ticket validation."
          : role === "gudang"
            ? "Stock management and loading supervision."
          : role === "rekanan"
            ? "Manage your fleet, tickets, and shipment orders."
            : role === "transport"
              ? "Manage your vehicle fleet and transport operations."
              : "Welcome back. Here&apos;s what&apos;s happening today.";

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button size="sm">
            <ClipboardList className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Dynamic Content based on Role */}
      {role === "admin" || role === "superadmin" ? (
        <AdminDashboard />
      ) : role === "pod" ? (
        <PodDashboard />
      ) : (role === "rekanan" || role === "transport") ? (
        <RekananDashboard />
      ) : (
        <>
          <LogisticsMetrics />
          
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 mt-6">
            <div className="lg:col-span-8">
              <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                  <button className="text-sm text-brand-500 hover:text-brand-600 font-medium">View All</button>
                </div>
                
                <div className="p-6">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 dark:bg-gray-800">
                      <Clock className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">No major activity yet</h4>
                    <p className="text-sm text-gray-500">Operational updates will appear here.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs p-6 h-full">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg dark:bg-green-900/20">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Success metrics</h3>
                </div>
                
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative w-32 h-32 flex items-center justify-center rounded-full border-[10px] border-gray-100 dark:border-gray-800">
                    <div className="absolute inset-0 rounded-full border-[10px] border-brand-500 border-t-transparent -rotate-45"></div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">82%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
