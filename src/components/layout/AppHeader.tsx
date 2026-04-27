"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSidebar } from "@/context/SidebarContext";
import { ThemeToggleButton } from "../common/ThemeToggleButton";
import NotificationDropdown from "../header/NotificationDropdown";
import UserDropdown from "../header/UserDropdown";
import CompanySwitcher from "../header/CompanySwitcher";
import { Search, Menu, X, Command } from "lucide-react";

const AppHeader: React.FC = () => {
  const { toggleSidebar, toggleMobileSidebar, isMobileOpen } = useSidebar();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex w-full bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-4 py-3 sm:gap-4 lg:justify-normal lg:px-0 lg:py-4">
          <button
            className="flex items-center justify-center w-10 h-10 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-cyan-900/10"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="lg:hidden">
            <Image
              width={120}
              height={32}
              className="dark:hidden"
              src="/images/logo/logo.svg"
              alt="Logo"
            />
            <Image
              width={120}
              height={32}
              className="hidden dark:block"
              src="/images/logo/logo-dark.svg"
              alt="Logo"
            />
          </Link>

          <div className="hidden lg:block">
            <form>
              <div className="relative">
                <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search..."
                  className="h-10 w-[300px] xl:w-[400px] rounded-lg border border-gray-200 bg-gray-50 py-2 pl-12 pr-14 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:bg-white/[0.03] dark:border-gray-800 dark:text-white"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-medium text-gray-400 dark:bg-gray-800 dark:border-gray-700">
                  <Command className="h-3 w-3" />
                  <span>K</span>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 lg:gap-4 lg:px-0 lg:py-0">
          <div className="flex items-center gap-3">
            <CompanySwitcher />
            <ThemeToggleButton />
            <NotificationDropdown />
          </div>
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 hidden lg:block"></div>
          <UserDropdown />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
