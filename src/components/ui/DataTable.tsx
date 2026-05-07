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
  searchable?: boolean; // New: enable column search
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableParams {
  draw: number;
  start: number;
  length: number;
  search: string;
  columnFilters?: Record<string, string>; // New: per-column search
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
  compact?: boolean;
  hideGlobalSearch?: boolean; // New prop to hide global search
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
  compact = false,
  hideGlobalSearch = false, // Default to false
}: DataTableProps<T>) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [draw, setDraw] = useState(1);

  // Global search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Column filters debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [columnFilters]);

  const fullKey = [...queryKey, debouncedSearch, debouncedColumnFilters, page, pageSize];

  const { data, isLoading, isFetching } = useQuery({
    queryKey: fullKey,
    queryFn: () =>
      fetcher({
        draw,
        start: page * pageSize,
        length: pageSize,
        search: debouncedSearch,
        columnFilters: debouncedColumnFilters,
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

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const hasColumnSearch = columns.some(c => c.searchable);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {!hideGlobalSearch && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                className="pl-9 h-9 rounded-none border-gray-100 dark:border-gray-800 text-xs font-bold"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="shrink-0 h-9 rounded-none border-gray-100 dark:border-gray-800"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <div className={cn(
        "rounded-none overflow-hidden overflow-x-auto bg-white dark:bg-gray-900",
        borderless ? "border-none shadow-none" : "border border-gray-100 dark:border-gray-800 shadow-sm"
      )}>
        <table className="w-full text-left text-sm border-collapse">
          <thead className={borderless ? "bg-gray-50/30 dark:bg-white/[0.01]" : "bg-gray-50/50 dark:bg-white/[0.02]"}>
            <tr className={borderless ? "" : "border-b border-gray-100 dark:border-gray-800"}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-[0.2em] whitespace-nowrap",
                    compact ? "py-1" : "py-4",
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
            {hasColumnSearch && (
              <tr className="bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-gray-800">
                {columns.map((col) => (
                  <th key={`search-${col.key}`} className="px-2 py-2">
                    {col.searchable ? (
                      <Input
                        className="h-8 text-[11px] font-bold rounded-none border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-white/[0.01] focus:border-brand-500 transition-all"
                        placeholder={`Cari ${col.header}...`}
                        value={columnFilters[col.key] || ""}
                        onChange={(e) => handleColumnFilterChange(col.key, e.target.value)}
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className={borderless ? "" : "divide-y divide-gray-50 dark:divide-gray-800"}>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-20 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-brand-500 mx-auto opacity-30" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-20 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest italic"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "group transition-all duration-200 border-b border-transparent",
                    striped && i % 2 === 1 ? "bg-gray-50/20 dark:bg-white/[0.01]" : "bg-transparent",
                    "hover:bg-brand-50/20 dark:hover:bg-brand-500/5",
                    rowClassName ? rowClassName(row) : ""
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 text-[12px] transition-all duration-200 font-medium",
                        compact ? "py-1" : "py-4",
                        col.className
                      )}
                    >
                      <div className={cn(!compact && "group-hover:translate-x-0.5 transition-transform duration-200")}>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2 py-4 border-t border-transparent">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Baris per halaman:</span>
          <select
            className="border-none bg-gray-50 dark:bg-white/[0.02] rounded-none px-2 py-1 text-[10px] font-black text-gray-600 dark:text-gray-400 outline-none focus:ring-1 focus:ring-brand-500"
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
          {!isLoading && total > 0 && (
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
              {from}–{to} <span className="opacity-50">/</span> {total.toLocaleString()} Data
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-none hover:bg-gray-100 dark:hover:bg-white/[0.05]"
            disabled={page === 0}
            onClick={() => setPage(0)}
          >
            <ChevronLeft className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4 -ml-2" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-none hover:bg-gray-100 dark:hover:bg-white/[0.05]"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center px-4">
             <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">
               Halaman {page + 1} <span className="text-gray-400 mx-2">DARI</span> {totalPages}
             </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-none hover:bg-gray-100 dark:hover:bg-white/[0.05]"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-none hover:bg-gray-100 dark:hover:bg-white/[0.05]"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(totalPages - 1)}
          >
            <ChevronRight className="h-4 w-4" />
            <ChevronRight className="h-4 w-4 -ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
