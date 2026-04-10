"use client";
import React from "react";
import { ScanInterface } from "@/components/shared/ScanInterface";

export default function SecurityScanPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <ScanInterface 
        title="Check-in Gate (Security)"
        description="Scan tiket digital atau fisik untuk verifikasi akses masuk armada."
      />
    </div>
  );
}
