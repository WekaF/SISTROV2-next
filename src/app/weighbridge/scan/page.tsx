"use client";
import React from "react";
import { ScanInterface } from "@/components/shared/ScanInterface";

export default function WeighbridgeScanPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <ScanInterface 
        title="Validasi JBT (Weighbridge)"
        description="Scan tiket untuk proses penimbangan armada masuk atau keluar."
      />
    </div>
  );
}
