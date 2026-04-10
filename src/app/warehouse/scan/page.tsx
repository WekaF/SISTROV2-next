"use client";
import React from "react";
import { ScanInterface } from "@/components/shared/ScanInterface";

export default function WarehouseScanPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <ScanInterface 
        title="Validasi Muat (Warehouse)"
        description="Scan tiket untuk mulai proses pemuatan produk di gudang."
      />
    </div>
  );
}
