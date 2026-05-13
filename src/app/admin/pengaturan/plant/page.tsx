"use client"

import { Factory, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PlantPengaturanPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-500 text-white rounded-2xl shadow-lg shadow-brand-500/20">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Plant Management
            </h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-70">
              SISTRO NEXT &bull; KONFIGURASI UNIT
            </p>
          </div>
        </div>
        
        <Button className="bg-brand-500 hover:bg-brand-600 font-black uppercase tracking-widest text-[10px] h-10 px-6 shadow-xl shadow-brand-500/20 rounded-none">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Plant
        </Button>
      </div>

      <main className="flex flex-1 flex-col gap-4">
        <div className="grid gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
               <CardTitle>Active Plants</CardTitle>
               <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex min-h-[400px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                Plant configuration table will be implemented here.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
