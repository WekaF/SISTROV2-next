import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Scan, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ScanTiketPage() {
  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">SISTRO</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Scan Tiket</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="mx-auto max-w-md w-full grid gap-4">
          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Scan className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl">Scanner Tiket</CardTitle>
              <CardDescription>
                Scan kartu antrian atau tiket digital armada untuk proses logistik.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-4 text-slate-400">
                <QrCode className="h-24 w-24 opacity-20" />
                <p className="text-xs font-medium uppercase tracking-widest">Camera Viewfinder</p>
                
                {/* Simulated scan line */}
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-bounce" />
              </div>
              
              <div className="grid gap-2">
                <Button size="lg" className="w-full gap-2">
                  <Scan className="h-4 w-4" />
                  Mulai Scan
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">atau</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Masukkan Kode Tiket (Manual)" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button variant="outline">Cari</Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 gap-4">
             <Card className="p-4 flex flex-col items-center text-center gap-2">
                <div className="text-2xl font-bold">12</div>
                <div className="text-xs text-muted-foreground font-medium uppercase">Scan Hari Ini</div>
             </Card>
             <Card className="p-4 flex flex-col items-center text-center gap-2">
                <div className="text-2xl font-bold text-green-600">98%</div>
                <div className="text-xs text-muted-foreground font-medium uppercase">Success Rate</div>
             </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
