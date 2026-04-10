"use client";
import React, { useState, useEffect } from "react";
import { 
  CalendarCheck, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Package, 
  Truck, 
  Layers, 
  Clock, 
  AlertCircle,
  Save,
  Info
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

// Types for Lookup Data
interface LookupItem {
  id: string;
  name: string;
  wilayahId?: string;
}

export default function NewQuotaWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookup, setLookup] = useState({
    products: [] as LookupItem[],
    wilayah: [] as LookupItem[],
    areas: [] as LookupItem[],
  });

  const [formData, setFormData] = useState({
    header: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      productId: "",
      totalQuota: 0,
    },
    wilayah: {} as Record<string, number>,
    areas: {} as Record<string, number>,
    shifts: {} as Record<string, Record<number, number>>, // areaId -> { shiftNum: amount }
  });

  // Fetch Lookup Data
  useEffect(() => {
    async function fetchLookup() {
      try {
        const res = await fetch('/api/kuota/lookup');
        const data = await res.json();
        if (data.success) {
          setLookup({
            products: data.products,
            wilayah: data.wilayah,
            areas: data.areas,
          });
        }
      } catch (error) {
        console.error("Failed to fetch lookup data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLookup();
  }, []);

  // Steps Configuration
  const steps = [
    { title: "Harian", desc: "General Info", icon: Package },
    { title: "Moda", desc: "Transport Modes", icon: Truck },
    { title: "Cluster", desc: "Area Allocation", icon: Layers },
    { title: "Shift", desc: "Shift Breakdown", icon: Clock },
  ];

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // Math Validations
  const totalWilayah = Object.values(formData.wilayah).reduce((a, b) => a + b, 0);
  const totalAreas = Object.values(formData.areas).reduce((a, b) => a + b, 0);
  
  const validateStep = () => {
    if (step === 1) return formData.header.productId && formData.header.totalQuota > 0;
    if (step === 2) return totalWilayah === formData.header.totalQuota;
    if (step === 3) return totalAreas === totalWilayah;
    return true;
  };

  const currentProduct = lookup.products.find(p => p.id == formData.header.productId)?.name || "Select Product";

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/pod/kuota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/kuota/schedule';
      } else {
        alert("Error saving quota: " + data.error);
      }
    } catch (error) {
      console.error("Save failed", error);
      alert("Save failed. Please check console.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium italic animate-pulse">Initializing Setup...</p>
       </div>
     );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
             <CalendarCheck className="h-7 w-7 text-brand-500" />
             Penjadwalan Kuota Baru
          </h1>
          <p className="text-sm text-gray-500">Buat alokasi tonase distribusi per shift secara sistematis.</p>
        </div>
        <div className="flex items-center gap-3">
           <Badge color={validateStep() ? "success" : "warning"} variant="solid" size="md">
              {validateStep() ? "Form Valid" : "Lengkapi Data"}
           </Badge>
           <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase font-black">Target Tonase</p>
              <p className="text-lg font-bold text-brand-500">{formData.header.totalQuota} <span className="text-xs font-normal">Ton</span></p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Stepper Indicator */}
        <div className="lg:col-span-3 space-y-4">
          {steps.map((s, i) => {
            const num = i + 1;
            const isActive = step === num;
            const isCompleted = step > num;
            const Icon = s.icon;

            return (
              <div 
                key={s.title}
                className={`relative p-4 rounded-2xl border transition-all ${
                  isActive 
                  ? "bg-brand-50 border-brand-200 dark:bg-brand-500/10 dark:border-brand-500/50 shadow-theme-xs ring-4 ring-brand-500/5" 
                  : isCompleted 
                  ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20" 
                  : "bg-white border-gray-100 dark:bg-white/[0.01] dark:border-gray-800"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${
                    isActive ? "bg-brand-500 text-white" : isCompleted ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-500"}`}>{s.title}</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-tighter">{s.desc}</p>
                  </div>
                </div>
                {isActive && (
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-500 rotate-45 hidden lg:block" />
                )}
              </div>
            );
          })}

          <Card className="mt-8 bg-gray-900 text-white overflow-hidden">
             <CardHeader className="pb-3 border-b border-white/10">
                <CardTitle className="text-xs uppercase tracking-widest text-brand-400">Current Summary</CardTitle>
             </CardHeader>
             <CardContent className="pt-4 space-y-4">
                <div>
                   <p className="text-[10px] text-gray-500 uppercase font-black">Product</p>
                   <p className="text-sm font-bold">{currentProduct}</p>
                </div>
                <div>
                   <p className="text-[10px] text-gray-500 uppercase font-black">Period</p>
                   <p className="text-sm font-medium">{formData.header.startDate} - {formData.header.endDate}</p>
                </div>
                <div className="pt-2 border-t border-white/5">
                   <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Moda Allocated</span>
                      <span className={totalWilayah > formData.header.totalQuota ? "text-red-400" : "text-brand-400"}>{totalWilayah} / {formData.header.totalQuota}</span>
                   </div>
                   <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${totalWilayah > formData.header.totalQuota ? "bg-red-500" : "bg-brand-500"}`}
                        style={{ width: `${Math.min((totalWilayah / (formData.header.totalQuota || 1)) * 100, 100)}%` }}
                      />
                   </div>
                </div>
             </CardContent>
          </Card>
        </div>

        {/* Right: Step Forms */}
        <Card className="lg:col-span-9 shadow-theme-md">
          <CardHeader>
            <CardTitle>{steps[step-1].title}</CardTitle>
            <CardDescription>{steps[step-1].desc}</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[400px]">
             {/* Step 1: Header */}
             {step === 1 && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Produk</label>
                    <select 
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/5"
                      value={formData.header.productId}
                      onChange={(e) => setFormData({...formData, header: {...formData.header, productId: e.target.value}})}
                    >
                       <option value="">Pilih Produk...</option>
                       {lookup.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Total Tonase (Harian)</label>
                    <Input 
                      type="number" 
                      placeholder="Masukkan Tonase..." 
                      value={formData.header.totalQuota || ""}
                      onChange={(e) => setFormData({...formData, header: {...formData.header, totalQuota: Number(e.target.value)}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Mulai Berlaku</label>
                    <Input 
                      type="date" 
                      value={formData.header.startDate}
                      onChange={(e) => setFormData({...formData, header: {...formData.header, startDate: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Selesai (Optional)</label>
                    <Input 
                      type="date" 
                      value={formData.header.endDate}
                      onChange={(e) => setFormData({...formData, header: {...formData.header, endDate: e.target.value}})}
                    />
                  </div>

                  <div className="md:col-span-2 pt-6">
                     <div className="p-4 bg-blue-50 border border-blue-100 dark:bg-blue-500/5 dark:border-blue-500/20 rounded-xl flex gap-4">
                        <Info className="h-6 w-6 text-blue-500 shrink-0" />
                        <div className="text-sm text-blue-800 dark:text-blue-300">
                           <p className="font-bold mb-1">Penting:</p>
                           <p>Tonase harian akan didistribusikan ke level moda transportasi pada tahap selanjutnya. Pastikan total tonase mencukupi target pengiriman hari ini.</p>
                        </div>
                     </div>
                  </div>
               </div>
             )}

             {/* Step 2: Moda Transportasi */}
             {step === 2 && (
               <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {lookup.wilayah.map((w) => (
                       <div key={w.id} className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-white/[0.01] space-y-3">
                          <div className="flex items-center justify-between">
                             <label className="text-sm font-bold">{w.name}</label>
                             <Badge color="info" size="sm">Active</Badge>
                          </div>
                          <Input 
                             type="number" 
                             placeholder="0"
                             value={formData.wilayah[w.id] || ""}
                             onChange={(e) => setFormData({
                               ...formData, 
                               wilayah: {...formData.wilayah, [w.id]: Number(e.target.value)}
                             })}
                          />
                       </div>
                     ))}
                  </div>
                  {totalWilayah !== formData.header.totalQuota && (
                    <div className="flex items-center gap-2 text-red-500 text-sm font-medium justify-center p-3 bg-red-50 dark:bg-red-500/5 rounded-lg border border-red-100 dark:border-red-500/20">
                       <AlertCircle className="h-4 w-4" />
                       Total ( {totalWilayah} ) must equal Global Target ( {formData.header.totalQuota} )
                    </div>
                  )}
               </div>
             )}

             {/* Step 3: Area Allocation */}
             {step === 3 && (
               <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  {lookup.wilayah.filter(w => formData.wilayah[w.id] > 0).map(w => (
                    <div key={w.id} className="space-y-4">
                       <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                          <h4 className="text-sm font-bold flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-brand-500" />
                             {w.name}
                          </h4>
                          <span className="text-xs font-medium text-gray-500">Allocated: {formData.wilayah[w.id]} Ton</span>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {lookup.areas.filter(a => a.wilayahId === w.id).map(a => (
                            <div key={a.id} className="flex flex-col gap-2">
                               <label className="text-xs font-medium text-gray-500">{a.name}</label>
                               <Input 
                                 type="number" 
                                 placeholder="0"
                                 value={formData.areas[a.id] || ""}
                                 onChange={(e) => setFormData({
                                   ...formData, 
                                   areas: {...formData.areas, [a.id]: Number(e.target.value)}
                                 })}
                               />
                            </div>
                          ))}
                       </div>
                    </div>
                  ))}
               </div>
             )}

             {/* Step 4: Shift Breakdown */}
             {step === 4 && (
               <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  {lookup.areas.filter(a => formData.areas[a.id] > 0).map(a => (
                    <div key={a.id} className="p-5 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-white/[0.01]">
                       <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold flex items-center gap-2 text-brand-500">
                             <Clock className="h-4 w-4" />
                             {a.name}
                          </h4>
                          <Badge color="light" size="sm">Global: {formData.areas[a.id]} Ton</Badge>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {[1, 2, 3].map(sNum => (
                            <div key={sNum} className="space-y-2">
                               <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Shift {sNum}</label>
                               <Input 
                                  type="number" 
                                  placeholder="0"
                                  value={formData.shifts[a.id]?.[sNum] || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setFormData({
                                      ...formData,
                                      shifts: {
                                        ...formData.shifts,
                                        [a.id]: {
                                          ...formData.shifts[a.id],
                                          [sNum]: val
                                        }
                                      }
                                    });
                                  }}
                               />
                            </div>
                          ))}
                       </div>
                    </div>
                  ))}
               </div>
             )}
          </CardContent>
          <CardFooter className="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-6">
             <Button variant="ghost" onClick={prevStep} disabled={step === 1}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
             </Button>
             
             {step < 4 ? (
               <Button onClick={nextStep} disabled={!validateStep()}>
                  Next Step
                  <ChevronRight className="h-4 w-4 ml-2" />
               </Button>
             ) : (
               <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => window.location.href='/kuota/schedule'}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Quota Schedule
               </Button>
             )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
