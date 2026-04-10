"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  User, 
  Truck, 
  Warehouse, 
  Gauge, 
  LayoutGrid, 
  Settings,
  ChevronRight 
} from "lucide-react";

const roleMetadata: Record<string, { label: string; icon: any; color: string; desc: string }> = {
  superadmin: {
    label: "Super Admin",
    icon: ShieldCheck,
    color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    desc: "Full system access and global configurations.",
  },
  admin: {
    label: "Administrator",
    icon: Settings,
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    desc: "Management of plants, users, and regional settings.",
  },
  pod: {
    label: "POD Operations",
    icon: LayoutGrid,
    color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    desc: "Monitoring plant operations and inventory.",
  },
  rekanan: {
    label: "Partner Portal",
    icon: Truck,
    color: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    desc: "Fleet management, ticketing, and shipments.",
  },
  jembatan_timbang: {
    label: "Weighbridge",
    icon: Gauge,
    color: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400",
    desc: "Ticket validation and vehicle weighing.",
  },
  gudang: {
    label: "Warehouse Admin",
    icon: Warehouse,
    color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
    desc: "Loading supervision and stock management.",
  },
  security: {
    label: "Security Gate",
    icon: User,
    color: "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    desc: "Vehicle verification and gate scanning.",
  },
};

export default function RoleSelectPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  useEffect(() => {
    if (session?.user) {
      const roles = (session.user as any).roles || [];
      if (roles.length <= 1) {
        router.push("/");
      } else {
        setAvailableRoles(roles);
      }
    }
  }, [session, router]);

  const handleRoleSelection = async (role: string) => {
    // We update the localStorage override to ensure the UI reacts immediately
    localStorage.setItem("debug_role_override", role);
    // Use window.location.href to force a full reload and reset sidebar/dashboard state
    window.location.href = "/";
  };

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Choose Your Workspace
          </h1>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            You have multiple roles assigned. Please select which dashboard you would like to access for this session.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {availableRoles.map((role) => {
            const meta = roleMetadata[role] || { 
              label: role, 
              icon: LayoutGrid, 
              color: "bg-gray-50 text-gray-600",
              desc: "Standard access to the platform."
            };
            const Icon = meta.icon;

            return (
              <button
                key={role}
                onClick={() => handleRoleSelection(role)}
                className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-start border border-gray-100 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 text-left"
              >
                <div className={`p-3 rounded-xl mb-4 ${meta.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-between w-full">
                  {meta.label}
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {meta.desc}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Logged in as <span className="font-semibold text-gray-900 dark:text-white">{session.user.name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
