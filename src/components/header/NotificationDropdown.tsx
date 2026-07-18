"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Bell, X } from "lucide-react";
import { getNotificationHref } from "@/lib/notifications/href";

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  sourceId: string;
  sourceLabel: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return { data: [] as NotificationItem[], unreadCount: 0 };
      return res.json() as Promise<{ data: NotificationItem[]; unreadCount: number }>;
    },
    refetchInterval: 30_000,
  });

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const notifying = unreadCount > 0;

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function toggleDropdown() {
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function handleItemClick(n: NotificationItem) {
    if (!n.isRead) markRead.mutate(n.id);
    closeDropdown();
    router.push(getNotificationHref(n.type, n.sourceId, n.sourceLabel));
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
          {notifications.length === 0 ? (
            <li className="py-8 text-center text-xs text-gray-400 italic">
              Tidak ada notifikasi.
            </li>
          ) : (
            notifications.map((n) => (
              <li key={n.id}>
                <DropdownItem
                  onItemClick={() => handleItemClick(n)}
                  className="flex gap-3 rounded-lg border-b border-gray-50 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <div className="flex flex-col text-left">
                    <p className="text-theme-sm text-gray-800 dark:text-gray-200">
                      <span className="font-semibold">{n.title}</span>
                    </p>
                    <p className="text-theme-xs text-gray-500">{n.message}</p>
                    <p className="text-theme-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="ml-auto mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                  )}
                </DropdownItem>
              </li>
            ))
          )}
        </ul>

        <Link
          href="/notifications"
          onClick={closeDropdown}
          className="block px-4 py-2 mt-auto text-xs font-medium text-center text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          View All Notifications
        </Link>
      </Dropdown>
    </div>
  );
}
