"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";

export function PhoneNumberModal() {
  const { apiJson, apiFetch } = useApi();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["phone-number-modal"],
    queryFn: () => apiJson<{ PhoneNumber: string | null }>("/api/Home/PhoneNumberForModal"),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!data || dismissed) return;
    if (!data.PhoneNumber) setOpen(true);
  }, [data, dismissed]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setDismissed(true);
  };

  const handleSave = async () => {
    if (!phone.trim()) {
      addToast({ title: "Validasi", description: "No. Telp / HP tidak boleh kosong", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/Home/Simpan_PhoneNumberforModal", {
        method: "POST",
        body: JSON.stringify({ PhoneNumber: phone.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      addToast({ title: "Berhasil", description: "No. Telp / HP berhasil disimpan", variant: "success" });
      setDismissed(true);
      setOpen(false);
    } catch (err: any) {
      addToast({ title: "Gagal", description: err?.message || "Gagal menyimpan No. Telp / HP", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
            <Phone className="h-6 w-6 text-amber-500" />
          </div>
          <DialogTitle className="text-center">Informasi Akun Diperlukan</DialogTitle>
          <DialogDescription className="text-center">
            Kami memerlukan nomor telepon Anda untuk melanjutkan.
          </DialogDescription>
        </DialogHeader>
        <Input
          type="tel"
          placeholder="Masukkan No. Telp / No. Hp"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Tutup
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
