"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BookingPrintDocument } from "@/components/ticket/BookingPrintDocument";

function PrintContent() {
  const searchParams = useSearchParams();
  const noposto = searchParams.get("noposto") || "";

  if (!noposto) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500 font-bold bg-slate-50 p-6 text-center">
        <div className="max-w-md p-6 bg-white shadow-md rounded border border-red-200">
          <p className="text-lg mb-2">Parameter "noposto" tidak ditemukan</p>
          <p className="text-sm text-gray-500">Pastikan URL yang Anda kunjungi menyertakan parameter noposto, misalnya: ?noposto=5320070174</p>
        </div>
      </div>
    );
  }

  return <BookingPrintDocument id={noposto} />;
}

export default function PostoPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-gray-500 bg-slate-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-2"></div>
            <p className="text-sm font-semibold text-gray-400">Memuat Halaman Cetak...</p>
          </div>
        </div>
      }
    >
      <PrintContent />
    </Suspense>
  );
}
