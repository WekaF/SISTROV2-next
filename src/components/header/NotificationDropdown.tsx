"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Bell, X } from "lucide-react";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);

  function toggleDropdown() {
    setIsOpen(!isOpen);
    if (isOpen === false) {
      setNotifying(false);
    }
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-10 w-10 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-cyan-900/20"
        onClick={toggleDropdown}
      >
        {notifying && (
          <span className="absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-500 flex">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <Bell className="h-5 w-5" />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[400px] w-[320px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark lg:right-0 sm:w-[350px]"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
          <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Notifications
          </h5>
          <button
            onClick={closeDropdown}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto no-scrollbar">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex gap-3 rounded-lg border-b border-gray-50 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
            >
              <div className="relative h-10 w-10 flex-shrink-0">
                <Image
                  width={40}
                  height={40}
                  src="/images/user/user-02.jpg"
                  alt="User"
                  className="rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-900"></span>
              </div>

              <div className="flex flex-col text-left">
                <p className="text-theme-sm text-gray-800 dark:text-gray-200">
                  <span className="font-semibold">Budi Santoso</span> created a new ticket
                </p>
                <p className="text-theme-xs text-gray-500">Gudang Lini 1 • 5 min ago</p>
              </div>
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              className="flex gap-3 rounded-lg border-b border-gray-50 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
            >
              <div className="relative h-10 w-10 flex-shrink-0">
                <Image
                  width={40}
                  height={40}
                  src="/images/user/user-03.jpg"
                  alt="User"
                  className="rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-orange-500 dark:border-gray-900"></span>
              </div>

              <div className="flex flex-col text-left">
                <p className="text-theme-sm text-gray-800 dark:text-gray-200">
                  <span className="font-semibold">SISTRO Bot</span> warned about low stock
                </p>
                <p className="text-theme-xs text-gray-500">Warehouse Alert • 1 hr ago</p>
              </div>
            </DropdownItem>
          </li>
        </ul>

        <Link
          href="/notifications"
          className="block px-4 py-2 mt-auto text-xs font-medium text-center text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          View All Notifications
        </Link>
      </Dropdown>
    </div>
  );
}
