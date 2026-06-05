"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface GudangSPPTItem {
  code: string;
  nama: string;
}

interface MappingItem {
  produk: string;
  gudang: string;
  kapasitas: string;
  kaptruk: string;
  kuota: string;
}

interface FormState {
  mode: "1" | "2" | "3";
  company_code: string;
  company_name: string;
  set_group: string;
  gudangs: string[];
  gudangSPPT: GudangSPPTItem[];
  produks: string[];
  shift_start: string;
  shift_end: string;
  mapping: MappingItem[];
}

const initialForm: FormState = {
  mode: "1",
  company_code: "",
  company_name: "",
  set_group: "",
  gudangs: [""],
  gudangSPPT: [{ code: "", nama: "" }],
  produks: [""],
  shift_start: "06:00",
  shift_end: "14:00",
  mapping: [{ produk: "", gudang: "", kapasitas: "100", kaptruk: "10", kuota: "5" }],
};

function toPayload(f: FormState) {
  return {
    mode: f.mode,
    set_company: `${f.company_code.toUpperCase()},${f.company_name}`,
    set_group: f.set_group,
    set_gudangs: f.gudangs.filter(Boolean).join("|"),
    set_gudangSPPT: f.gudangSPPT
      .filter((g) => g.code && g.nama)
      .map((g) => `${g.code},${g.nama}`)
      .join("|"),
    set_produk: f.produks.filter(Boolean).join("|"),
    set_shift: `${f.shift_start},${f.shift_end}`,
    set_mappingproduk: f.mapping
      .filter((m) => m.produk && m.gudang)
      .map((m) => `${m.produk},${m.gudang},${m.kapasitas},${m.kaptruk},${m.kuota}`)
      .join("|"),
  };
}

const STEP_LABELS = ["Company", "Gudang", "Produk", "Shift & Mapping"];

export default function PlantInstallPage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<any[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const { addToast } = useToast();

  const installMutation = useMutation({
    mutationFn: async (payload: ReturnType<typeof toPayload>) => {
      const res = await fetch("/api/admin/plant-install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal install plant");
      return json.data;
    },
    onSuccess: (data) => {
      const rows = data?.data ?? data;
      setResult(Array.isArray(rows) ? rows : []);
      setStep(5);
      addToast({ title: "Instalasi selesai", variant: "success" });
    },
    onError: (err: any) => {
      addToast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function removeItem(key: "gudangs" | "gudangSPPT" | "produks" | "mapping", idx: number) {
    setForm((prev) => {
      const arr = [...(prev[key] as any[])];
      arr.splice(idx, 1);
      return { ...prev, [key]: arr };
    });
  }

  function updateGudangSPPT(idx: number, patch: Partial<GudangSPPTItem>) {
    setForm((prev) => {
      const arr = [...prev.gudangSPPT];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, gudangSPPT: arr };
    });
  }

  function updateMapping(idx: number, patch: Partial<MappingItem>) {
    setForm((prev) => {
      const arr = [...prev.mapping];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, mapping: arr };
    });
  }

  function canProceed(): boolean {
    if (step === 1) return !!(form.company_code && form.company_name && form.set_group);
    if (step === 2)
      return (
        form.gudangs.some(Boolean) &&
        form.gudangSPPT.some((g) => g.code && g.nama)
      );
    if (step === 3) return form.produks.some(Boolean);
    if (step === 4)
      return (
        !!(form.shift_start && form.shift_end) &&
        form.mapping.some((m) => m.produk && m.gudang)
      );
    return false;
  }

  function renderStep1() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Mode Instalasi</label>
          <select
            className="border rounded px-3 py-2 w-full bg-background"
            value={form.mode}
            onChange={(e) => setField("mode", e.target.value as "1" | "2" | "3")}
          >
            <option value="1">Mode 1 — Standar (onestaff ON)</option>
            <option value="2">Mode 2 — Multi User (SA + SEC + SG)</option>
            <option value="3">Mode 3 — Full (MG + SA + SEC + SG)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Kode Company</label>
            <Input
              placeholder="cth: PKB"
              value={form.company_code}
              onChange={(e) => setField("company_code", e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nama Company</label>
            <Input
              placeholder="cth: Pusri Kalimantan Barat"
              value={form.company_name}
              onChange={(e) => setField("company_name", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Group Company (Region)</label>
          <Input
            placeholder="cth: Kalimantan"
            value={form.set_group}
            onChange={(e) => setField("set_group", e.target.value)}
          />
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Gudang Mapping (kode saja)</label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setField("gudangs", [...form.gudangs, ""])}
            >
              <Plus className="w-3 h-3 mr-1" /> Tambah
            </Button>
          </div>
          {form.gudangs.map((g, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input
                placeholder="cth: G01"
                value={g}
                onChange={(e) => {
                  const arr = [...form.gudangs];
                  arr[i] = e.target.value;
                  setField("gudangs", arr);
                }}
              />
              {form.gudangs.length > 1 && (
                <Button size="sm" variant="ghost" onClick={() => removeItem("gudangs", i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Gudang SPPT (kode + nama)</label>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setField("gudangSPPT", [...form.gudangSPPT, { code: "", nama: "" }])
              }
            >
              <Plus className="w-3 h-3 mr-1" /> Tambah
            </Button>
          </div>
          {form.gudangSPPT.map((g, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input
                className="w-32"
                placeholder="Kode"
                value={g.code}
                onChange={(e) => updateGudangSPPT(i, { code: e.target.value })}
              />
              <Input
                placeholder="Nama Gudang"
                value={g.nama}
                onChange={(e) => updateGudangSPPT(i, { nama: e.target.value })}
              />
              {form.gudangSPPT.length > 1 && (
                <Button size="sm" variant="ghost" onClick={() => removeItem("gudangSPPT", i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Kode Produk</label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setField("produks", [...form.produks, ""])}
          >
            <Plus className="w-3 h-3 mr-1" /> Tambah
          </Button>
        </div>
        {form.produks.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <Input
              placeholder="cth: UREA"
              value={p}
              onChange={(e) => {
                const arr = [...form.produks];
                arr[i] = e.target.value;
                setField("produks", arr);
              }}
            />
            {form.produks.length > 1 && (
              <Button size="sm" variant="ghost" onClick={() => removeItem("produks", i)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Shift 1 (jam mulai – jam selesai)
          </label>
          <div className="flex gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Mulai</label>
              <Input
                type="time"
                value={form.shift_start}
                onChange={(e) => setField("shift_start", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Selesai</label>
              <Input
                type="time"
                value={form.shift_end}
                onChange={(e) => setField("shift_end", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Mapping Produk–Gudang</label>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setField("mapping", [
                  ...form.mapping,
                  { produk: "", gudang: "", kapasitas: "100", kaptruk: "10", kuota: "5" },
                ])
              }
            >
              <Plus className="w-3 h-3 mr-1" /> Tambah
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-1 pr-2">Produk</th>
                  <th className="pb-1 pr-2">Gudang SPPT</th>
                  <th className="pb-1 pr-2">Kapasitas</th>
                  <th className="pb-1 pr-2">Kap. Truk</th>
                  <th className="pb-1 pr-2">Kuota</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {form.mapping.map((m, i) => (
                  <tr key={i}>
                    <td className="pr-2 py-1">
                      <Input
                        className="h-8"
                        placeholder="UREA"
                        value={m.produk}
                        onChange={(e) => updateMapping(i, { produk: e.target.value })}
                      />
                    </td>
                    <td className="pr-2 py-1">
                      <Input
                        className="h-8"
                        placeholder="SPPT01"
                        value={m.gudang}
                        onChange={(e) => updateMapping(i, { gudang: e.target.value })}
                      />
                    </td>
                    <td className="pr-2 py-1">
                      <Input
                        className="h-8 w-20"
                        type="number"
                        value={m.kapasitas}
                        onChange={(e) => updateMapping(i, { kapasitas: e.target.value })}
                      />
                    </td>
                    <td className="pr-2 py-1">
                      <Input
                        className="h-8 w-20"
                        type="number"
                        value={m.kaptruk}
                        onChange={(e) => updateMapping(i, { kaptruk: e.target.value })}
                      />
                    </td>
                    <td className="pr-2 py-1">
                      <Input
                        className="h-8 w-20"
                        type="number"
                        value={m.kuota}
                        onChange={(e) => updateMapping(i, { kuota: e.target.value })}
                      />
                    </td>
                    <td className="py-1">
                      {form.mapping.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem("mapping", i)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded border border-yellow-400 bg-yellow-50 p-3 flex gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">
              Perhatian — Operasi Destruktif
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Klik Install akan menjalankan{" "}
              <code className="font-mono">installationPlant_deleteData</code> yang{" "}
              <strong>MENGHAPUS</strong> semua data plant{" "}
              <strong>{form.company_code || "…"}</strong> sebelum re-seed. Pastikan
              ini memang intended.
            </p>
            <label className="flex items-center gap-2 mt-2 text-xs font-medium text-yellow-800 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Saya memahami dan ingin melanjutkan
            </label>
          </div>
        </div>
      </div>
    );
  }

  function renderResult() {
    return (
      <div>
        <h3 className="font-semibold mb-3">
          Hasil Instalasi Plant {form.company_code}
        </h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-1 pr-4">Tabel</th>
              <th className="pb-1 pr-4">Keterangan</th>
              <th className="pb-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.map((row, i) => (
              <tr key={i} className="border-b">
                <td className="py-1 pr-4 font-mono text-xs">{row.namaTabel}</td>
                <td className="py-1 pr-4 text-xs">{row.keterangan}</td>
                <td className="py-1">
                  {row.statusInsert > 0 ? (
                    <span className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle2 className="w-3 h-3" /> +{row.statusInsert}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400 text-xs">
                      <XCircle className="w-3 h-3" /> Already exists
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button
          className="mt-6"
          onClick={() => {
            setStep(1);
            setForm(initialForm);
            setConfirmed(false);
            setResult([]);
          }}
        >
          Install Plant Baru
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Instalasi Plant Baru</h1>

      {step < 5 && (
        <div className="flex items-center gap-2 mb-6">
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const active = step === num;
            const done = (step as number) > num;
            return (
              <div key={num} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    done
                      ? "bg-green-500 text-white"
                      : active
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? "✓" : num}
                </div>
                <span
                  className={`text-sm ${
                    active ? "font-medium" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <div className="h-px w-6 bg-border" />
                )}
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          {step < 5 && (
            <p className="font-semibold">
              Step {step}: {STEP_LABELS[step - 1]}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderResult()}
        </CardContent>
      </Card>

      {step < 5 && (
        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s))}
            disabled={step === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => ((s + 1) as WizardStep))}
              disabled={!canProceed()}
            >
              Lanjut <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => installMutation.mutate(toPayload(form))}
              disabled={!canProceed() || !confirmed || installMutation.isPending}
              variant="destructive"
            >
              {installMutation.isPending ? "Menginstall…" : "Install Plant"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
