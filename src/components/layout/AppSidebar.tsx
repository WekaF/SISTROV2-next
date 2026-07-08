"use client";
import React, { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSidebar } from "@/context/SidebarContext";
import { ChevronDown } from "lucide-react";
import { NavItem, normalizeRole, mergeNavItems, filterNavByPaths, MENU_CONFIGS } from "@/lib/menu-configs";


const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openSubmenu, setOpenSubmenu] = useState<{ type: string; index: number } | null>(null);

  const rawMenuGroups = (session?.user as any)?.menuGroups as string[] | undefined;
  const rawMenuGroup = (session?.user as any)?.menuGroup as string | undefined;

  // Priority: menuGroups array (multi-role) > single menuGroup > role normalization fallback
  let activeGroups: string[];
  if (rawMenuGroups && rawMenuGroups.length > 0) {
    activeGroups = rawMenuGroups;
  } else if (rawMenuGroup) {
    activeGroups = [rawMenuGroup];
  } else {
    activeGroups = [normalizeRole((session?.user as any)?.role)];
  }

  const rawMenuItems = (session?.user as any)?.menuItems as string[] | null | undefined;

  let navItems: NavItem[];
  let adminItems: NavItem[];

  if (rawMenuItems && rawMenuItems.length > 0) {
    const allGroups = Object.values(MENU_CONFIGS);
    navItems = mergeNavItems(allGroups.map((c) => filterNavByPaths(c.nav, rawMenuItems)));
    adminItems = mergeNavItems(allGroups.map((c) => filterNavByPaths(c.admin, rawMenuItems)));
  } else {
    navItems = mergeNavItems(activeGroups.map((g) => MENU_CONFIGS[g]?.nav ?? []));
    adminItems = mergeNavItems(activeGroups.map((g) => MENU_CONFIGS[g]?.admin ?? []));
  }

  const userRole = ((session?.user as any)?.role || "").toLowerCase();
  const isSuperAdmin = activeGroups.includes("superadmin") || userRole === "superadmin" || userRole === "ti";

  if (!isSuperAdmin) {
    adminItems = [];
  }

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const handleSubmenuToggle = (index: number, type: string) => {
    setOpenSubmenu((prev) =>
      prev?.type === type && prev?.index === index ? null : { type, index }
    );
  };

  const renderMenuItems = (items: NavItem[], type: string) => (
    <ul className="flex flex-col gap-2">
      {items.map((nav, index) => {
        const isOpen = openSubmenu?.type === type && openSubmenu?.index === index;
        const hasActiveSubItem = nav.subItems?.some((sub) => isActive(sub.path));

        return (
          <li key={nav.name}>
            {nav.subItems ? (
              <div>
                <button
                  onClick={() => handleSubmenuToggle(index, type)}
                  className={`menu-item group ${
                    isOpen || hasActiveSubItem ? "menu-item-active" : "menu-item-inactive"
                  } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                >
                  <span
                    className={`${
                      isOpen || hasActiveSubItem ? "menu-item-icon-active" : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <>
                      <span className="menu-item-text ml-3 flex-grow text-left">{nav.name}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </button>
                {isOpen && (isExpanded || isHovered || isMobileOpen) && (
                  <ul className="mt-2 ml-11 space-y-1">
                    {nav.subItems.map((sub) => (
                      <li key={sub.path}>
                        <Link
                          href={sub.path}
                          className={`menu-dropdown-item ${
                            isActive(sub.path)
                              ? "menu-dropdown-item-active"
                              : "menu-dropdown-item-inactive"
                          }`}
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <Link
                href={nav.path || "#"}
                className={`menu-item group ${
                  isActive(nav.path || "") ? "menu-item-active" : "menu-item-inactive"
                } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
              >
                <span
                  className={`${
                    isActive(nav.path || "") ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text ml-3">{nav.name}</span>
                )}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed top-0 left-0 z-100 h-screen transition-all duration-300 ease-in-out bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        ${isExpanded || isHovered || isMobileOpen ? "w-72" : "w-20"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex items-center h-20 px-6 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/" className="flex items-center gap-3">
          {!(isExpanded || isHovered || isMobileOpen) ? (
            <div className="flex items-center justify-center">
              <Image
                src="/images/logo/avatar.jpg"
                alt="Sistro"
                width={40}
                height={40}
                className="object-cover rounded-full border border-gray-100 shadow-sm"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-[140px]">
              <Image
                src="/images/logo/logo.svg"
                alt="Sistro"
                width={85}
                height={32}
                className="object-contain dark:hidden"
              />
              <Image
                src="/images/logo/logo-dark.svg"
                alt="Sistro"
                width={85}
                height={32}
                className="object-contain hidden dark:block"
              />
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-800" />
              <Image
                src="/images/logo/logopihd.png"
                alt="Pupuk Indonesia"
                width={80}
                height={32}
                className="object-contain dark:brightness-0 dark:invert"
              />
            </div>
          )}
        </Link>
      </div>

      <div className="flex flex-col px-4 py-4 h-[calc(100vh-80px)] overflow-y-auto no-scrollbar">
        <nav className="flex-grow">
          <div className="mb-6">
            <h3
              className={`mb-4 px-3 text-xs font-semibold uppercase text-gray-400 ${
                !isExpanded && !isHovered ? "lg:hidden" : "block"
              }`}
            >
              Main Menu
            </h3>
            {renderMenuItems(navItems, "main")}
          </div>

          {adminItems.length > 0 && (
            <div>
              <h3
                className={`mb-4 px-3 text-xs font-semibold uppercase text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:hidden" : "block"
                }`}
              >
                Administration
              </h3>
              {renderMenuItems(adminItems, "others")}
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
