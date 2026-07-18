"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";
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

interface NotificationsPageResponse {
  data: NotificationItem[];
  unreadCount: number;
  nextCursor: number | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<"all" | "unread">("all");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["notifications-full", filter],
    queryFn: async ({ pageParam }: { pageParam: number | null }) => {
      const params = new URLSearchParams({ take: "20" });
      if (pageParam) params.set("cursor", String(pageParam));
      if (filter === "unread") params.set("unreadOnly", "1");
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) return { data: [], unreadCount: 0, nextCursor: null } as NotificationsPageResponse;
      return res.json() as Promise<NotificationsPageResponse>;
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-full"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  function handleClick(n: NotificationItem) {
    if (!n.isRead) markRead.mutate(n.id);
    router.push(getNotificationHref(n.type, n.sourceId, n.sourceLabel));
  }

  const items = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
          Notifikasi
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Semua notifikasi Anda.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          Semua
        </Button>
        <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>
          Belum Dibaca
        </Button>
      </div>

      <Card className="shadow-theme-xs">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-500 mx-auto" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-gray-400 italic flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 opacity-30" />
              Tidak ada notifikasi.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-semibold">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.isRead && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasNextPage && (
            <div className="p-4 text-center border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Muat Lebih Banyak"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
