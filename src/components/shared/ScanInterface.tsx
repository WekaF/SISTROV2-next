"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scan, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanInterfaceProps {
  title?: string;
  description?: string;
  onScan?: (code: string) => void;
}

export const ScanInterface: React.FC<ScanInterfaceProps> = ({ 
  title = "Scanner Tiket", 
  description = "Scan kartu antrian atau tiket digital armada.",
  onScan 
}) => {
  return (
    <div className="mx-auto max-w-md w-full grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-2 border-brand-500/20 shadow-xl overflow-hidden">
        <div className="h-2 bg-brand-500" />
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
            <Scan className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold font-serif">{title}</CardTitle>
          <CardDescription className="px-4">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 pt-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center gap-4 text-gray-400">
            <QrCode className="h-24 w-24 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Viewfinder Active</p>
            
            {/* Animated scan line */}
            <div className="absolute inset-x-0 top-0 h-1 bg-brand-500/50 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-scan-line" />
          </div>

          <div className="grid gap-3">
            <Button size="lg" className="w-full h-12 text-base font-bold shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
              <Scan className="h-5 w-5 mr-2" />
              Mulai Kamera
            </Button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-100 dark:border-gray-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold">
                <span className="bg-white dark:bg-[#0a0a0a] px-3 text-gray-400 tracking-widest">Atau Manual</span>
              </div>
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Kode Tiket..." 
                className="flex h-11 w-full rounded-xl border border-gray-200 bg-white dark:bg-white/5 dark:border-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all font-mono"
              />
              <Button variant="outline" className="h-11 px-6 font-bold">Cari</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-2 gap-4">
         <Card className="p-4 flex flex-col items-center text-center gap-1 border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="text-2xl font-black text-gray-900 dark:text-white">--</div>
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Scan Shift Ini</div>
         </Card>
         <Card className="p-4 flex flex-col items-center text-center gap-1 border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="text-2xl font-black text-brand-500">READY</div>
            <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Status System</div>
         </Card>
      </div>
    </div>
  );
};
