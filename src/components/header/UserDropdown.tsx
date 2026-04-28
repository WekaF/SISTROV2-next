"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { User, Settings, LifeBuoy, LogOut, ChevronDown } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const [activeRole, setActiveRole] = useState<string | null>(null);

  React.useEffect(() => {
    setActiveRole(localStorage.getItem("debug_role_override") || (session?.user as any)?.role);
  }, [session]);

  const handleRoleSwitch = (role: string) => {
    if (role === "reset") {
      localStorage.removeItem("debug_role_override");
    } else {
      localStorage.setItem("debug_role_override", role);
    }
    window.location.reload(); // Reload to apply changes across all components
  };

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dark:text-gray-400 dropdown-toggle gap-2"
      >
        <span className="relative overflow-hidden rounded-full h-10 w-10 border border-gray-200 dark:border-gray-800">
          <Image
            width={40}
            height={40}
            src="/images/user/user-01.jpg" // Using an available image
            alt="User"
            className="object-cover"
          />
        </span>

        <div className="hidden text-left lg:block">
          <span className="block font-medium text-theme-sm text-gray-900 dark:text-white truncate max-w-[150px]">
            {session?.user?.name || "Loading..."}
          </span>
          <span className="block text-theme-xs text-gray-500 dark:text-gray-400 capitalize">
            {(session?.user as any)?.role || "User"}
          </span>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
          <span className="block font-semibold text-gray-900 text-theme-sm dark:text-white truncate max-w-[230px]">
            {session?.user?.name || "Loading..."}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400 truncate max-w-[230px]">
            {session?.user?.email || "No Email"}
          </span>
        </div>

        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <User className="h-4 w-4 text-gray-400 group-hover:text-brand-500" />
              View Profile
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <Settings className="h-4 w-4 text-gray-400 group-hover:text-brand-500" />
              Account Settings
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/support"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <LifeBuoy className="h-4 w-4 text-gray-400 group-hover:text-brand-500" />
              Support
            </DropdownItem>
          </li>
        </ul>
        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <li className="px-3 py-1 text-theme-xs font-bold text-gray-400 uppercase">Switch Workspace</li>
          {((session?.user as any)?.roles || []).map((role: string) => {
            const label = role === "superadmin" ? "Super Admin" 
                        : role === "admin" ? "Admin"
                        : role === "pod" ? "POD"
                        : role === "rekanan" ? "Rekanan"
                        : role === "transport" ? "Transport"
                        : role === "security" ? "Security"
                        : role === "jembatan_timbang" ? "Weighbridge"
                        : role === "gudang" ? "Gudang"
                        : role.charAt(0).toUpperCase() + role.slice(1);
            
            return (
              <li key={role}>
                <button
                  onClick={() => handleRoleSwitch(role)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 font-medium rounded-lg text-theme-xs transition-colors ${
                    activeRole === role 
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" 
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  {label}
                  {activeRole === role && (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
                  )}
                </button>
              </li>
            );
          })}
          <li>
            <button
                onClick={() => handleRoleSwitch("reset")}
                className="flex w-full items-center gap-3 px-3 py-1.5 font-medium text-gray-400 rounded-lg text-theme-xs hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Reset to Selection
              </button>
          </li>
        </ul>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center w-full gap-3 px-3 py-2 mt-3 font-medium text-red-600 rounded-lg group text-theme-sm hover:bg-red-50 dark:hover:bg-red-900/10"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </Dropdown>
    </div>
  );
}
