"use client";
import React, { useState } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Wilayah {
  id: string;
  code: string;
  name: string;
}

interface VpRegion {
  id: number;
  name: string;
  wilayahs: { id: number; wilayahCode: string }[];
}

export default function VpRegionsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [pendingWilayah, setPendingWilayah] = useState<string | null>(null);

  const { data: regionsData, isLoading: regionsLoading } = useQuery({
    queryKey: ["admin-regions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/regions");
      if (!res.ok) throw new Error("Failed to fetch regions");
      const json = await res.json();
      return json.data as Wilayah[];
    },
  });

  const { data: vpRegionsData, isLoading: vpRegionsLoading } = useQuery({
    queryKey: ["vp-regions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vp-regions");
      if (!res.ok) throw new Error("Failed to fetch VP regions");
      const json = await res.json();
      return json.data as VpRegion[];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ regionId, wilayahCode }: { regionId: number; wilayahCode: string }) => {
      const res = await fetch(`/api/admin/vp-regions/${regionId}/wilayah`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wilayahCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambahkan wilayah");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vp-regions"] });
      addToast({ title: "Wilayah ditambahkan", variant: "success" });
      setPendingWilayah(null);
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
      setPendingWilayah(null);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async ({ regionId, wilayahCode }: { regionId: number; wilayahCode: string }) => {
      const res = await fetch(
        `/api/admin/vp-regions/${regionId}/wilayah?wilayahCode=${encodeURIComponent(wilayahCode)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus wilayah");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vp-regions"] });
      addToast({ title: "Wilayah dihapus", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: err.message, variant: "destructive" });
    },
  });

  const wilayahs = regionsData || [];
  const vpRegions = vpRegionsData || [];

  const assignedCodes = new Set(
    vpRegions.flatMap((r) => r.wilayahs.map((w) => w.wilayahCode))
  );
  const unassigned = wilayahs.filter((w) => !assignedCodes.has(w.code));

  if (regionsLoading || vpRegionsLoading) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <MapPin className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Mapping VP Region</h1>
          <p className="text-sm text-muted-foreground">Kelola pemetaan wilayah ke setiap VP Region</p>
        </div>
      </div>

      {unassigned.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Belum Dipetakan</CardTitle>
            <CardDescription>Wilayah yang belum masuk ke VP Region manapun</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {unassigned.map((w) => (
              <Badge key={w.code} color="warning" variant="outline">
                {w.name} ({w.code})
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vpRegions.map((region) => {
          const assignedWilayahs = region.wilayahs
            .map((w) => wilayahs.find((full) => full.code === w.wilayahCode))
            .filter((w): w is Wilayah => !!w);

          return (
            <Card key={region.id}>
              <CardHeader>
                <CardTitle className="text-base">{region.name}</CardTitle>
                <CardDescription>{assignedWilayahs.length} wilayah</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {assignedWilayahs.length === 0 && (
                    <span className="text-sm text-muted-foreground">Belum ada wilayah</span>
                  )}
                  {assignedWilayahs.map((w) => (
                    <Badge key={w.code} variant="outline" className="flex items-center gap-1">
                      {w.name}
                      <button
                        onClick={() =>
                          unassignMutation.mutate({ regionId: region.id, wilayahCode: w.code })
                        }
                        disabled={unassignMutation.isPending}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value=""
                  disabled={unassigned.length === 0 || assignMutation.isPending}
                  onChange={(e) => {
                    const wilayahCode = e.target.value;
                    if (wilayahCode) {
                      setPendingWilayah(wilayahCode);
                      assignMutation.mutate({ regionId: region.id, wilayahCode });
                    }
                  }}
                >
                  <option value="">-- Tambah Wilayah --</option>
                  {unassigned
                    .filter((w) => w.code !== pendingWilayah)
                    .map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                </select>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
