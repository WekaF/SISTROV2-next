"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  headerClassName?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableParams {
  draw: number;
  start: number;
  length: number;
  search: string;
}

export interface DataTableResult<T> {
  data: T[];
  recordsTotal: number;
  recordsFiltered: number;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  queryKey: (string | number | undefined)[];
  fetcher: (params: DataTableParams) => Promise<DataTableResult<T>>;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  rowKey: (row: T) => string | number;
  rowClassName?: (row: T) => string;
  emptyText?: string;
  refetchInterval?: number;
  borderless?: boolean;
  striped?: boolean;
}

export function DataTable<T>({
  columns,
  queryKey,
  fetcher,
  searchPlaceholder = "Cari...",
  toolbar,
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 25,
  rowKey,
  rowClassName,
  emptyText = "Data tidak ditemukan.",
  refetchInterval,
  borderless = false,
  striped = false,
}: DataTableProps<T>) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [draw, setDraw] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fullKey = [...queryKey, debouncedSearch, page, pageSize];

  const { data, isLoading, isFetching } = useQuery({
    queryKey: fullKey,
    queryFn: () =>
      fetcher({
        draw,
        start: page * pageSize,
        length: pageSize,
        search: debouncedSearch,
      }),
    refetchInterval,
  });

  const rows = data?.data ?? [];
  const total = data?.recordsFiltered ?? data?.recordsTotal ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  const refresh = useCallback(() => {
    setDraw((d) => d + 1);
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              className="pl-9"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>

      {/* Table */}
      <div className={`${borderless ? "" : "border border-gray-100 dark:border-gray-800"} rounded-xl overflow-hidden overflow-x-auto`}>
        <table className="w-full text-left text-sm">
          <thead className={borderless ? "bg-gray-50/30 dark:bg-white/[0.01]" : "bg-gray-50 dark:bg-white/[0.02]"}>
            <tr className={borderless ? "" : "border-b border-gray-100 dark:border-gray-800"}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-4 text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-[0.2em] whitespace-nowrap ${col.headerClassName ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={borderless ? "" : "divide-y divide-gray-100 dark:divide-gray-800"}>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-20 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-brand-500 mx-auto opacity-50" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest italic"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "group transition-all duration-200",
                    striped && i % 2 === 1 ? "bg-gray-50/30 dark:bg-white/[0.01]" : "bg-transparent",
                    "hover:bg-brand-50/30 dark:hover:bg-brand-500/5",
                    rowClassName ? rowClassName(row) : ""
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-4 text-base",
                        col.className
                      )}
                    >
                      <div className="group-hover:translate-x-1 transition-transform duration-200">
                        {col.render
                          ? col.render(row, i)
                          : (row as any)[col.key] ?? "-"}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: info + pagination */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>Tampilkan</span>
          <select
            className="border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-xs bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-brand-500"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>entri</span>
          {!isLoading && total > 0 && (
            <span className="ml-2 text-gray-400">
              {from}–{to} dari {total.toLocaleString()} data
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page === 0}
            onClick={() => setPage(0)}
          >
            <ChevronLeft className="h-3 w-3" />
            <ChevronLeft className="h-3 w-3 -ml-2" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(0, Math.min(page - 2, totalPages - 5));
            const p = start + i;
            return (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="h-7 min-w-[28px] px-2 text-xs"
                onClick={() => setPage(p)}
              >
                {p + 1}
              </Button>
            );
          })}

          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(totalPages - 1)}
          >
            <ChevronRight className="h-3 w-3" />
            <ChevronRight className="h-3 w-3 -ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
