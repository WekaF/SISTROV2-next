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
            {(session?.user as any)?.username || "User"}
          </span>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
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
          {((session?.user as any)?.roles?.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(session?.user as any).roles.map((r: string) => (
                <span
                  key={r}
                  className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-[9px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight border border-gray-200 dark:border-gray-800"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
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
