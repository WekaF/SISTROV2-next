"use client";
import React from "react";
import Badge from "../ui/badge/Badge";
import { Truck, Ticket, Package, AlertCircle, ArrowUp, ArrowDown } from "lucide-react";

export const LogisticsMetrics = () => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-theme-xs">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-900/20 dark:text-blue-400">
          <Ticket className="h-6 w-6" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Tickets Today</span>
            <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              1,284
            </h4>
          </div>
          <Badge color="success" size="sm">
            <ArrowUp className="h-3 w-3" />
            12%
          </Badge>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-theme-xs">
        <div className="flex items-center justify-center w-12 h-12 bg-orange-50 text-orange-600 rounded-xl dark:bg-orange-900/20 dark:text-orange-400">
          <Truck className="h-6 w-6" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Active Trucks</span>
            <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              452
            </h4>
          </div>
          <Badge color="error" size="sm">
            <ArrowDown className="h-3 w-3" />
            5.2%
          </Badge>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-theme-xs">
        <div className="flex items-center justify-center w-12 h-12 bg-green-50 text-green-600 rounded-xl dark:bg-green-900/20 dark:text-green-400">
          <Package className="h-6 w-6" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading Done</span>
            <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              87%
            </h4>
          </div>
          <Badge color="success" size="sm">
            <ArrowUp className="h-3 w-3" />
            3.1%
          </Badge>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 shadow-theme-xs">
        <div className="flex items-center justify-center w-12 h-12 bg-red-50 text-red-600 rounded-xl dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Issues Flagged</span>
            <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
              12
            </h4>
          </div>
          <Badge color="warning" size="sm">
            Stable
          </Badge>
        </div>
      </div>
    </div>
  );
};
