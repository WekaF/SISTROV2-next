"use client"

import * as React from "react"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Plus, 
  Calendar, 
  Clock, 
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Box,
  Hash
} from "lucide-react"

const availableShifts = [
  { date: "01 April 2026", shift1: "Available", shift2: "Available", shift3: "Full" },
  { date: "02 April 2026", shift1: "Available", shift2: "Full", shift3: "Available" },
  { date: "03 April 2026", shift1: "Available", shift2: "Available", shift3: "Available" },
]

const recentTickets = [
  {
    id: 1,
    bookingCode: "BK-94025",
    date: "01 April 2026",
    shift: "Shift 1",
    nopol: "B 1234 XY",
    driver: "Budi Santoso",
    qty: "24.5",
    status: "Completed",
  },
  {
    id: 2,
    bookingCode: "BK-94026",
    date: "01 April 2026",
    shift: "Shift 2",
    nopol: "B 5678 ZW",
    driver: "Agus Salim",
    qty: "18.0",
    status: "Pending",
  },
]

export default function TicketPilihPeriodePage() {
  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-white px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">SISTRO</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/ticket">Ticket Management</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Pilih Periode</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm">History</Button>
           <Button size="sm" className="bg-[#005FA4]">
            <Plus className="mr-2 h-4 w-4" /> New Booking
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 space-y-8">
        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-600 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Total Tonase</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">1,500</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Ton</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Statistics for this period</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Booking / Realisasi</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-green-700">1,200 / 950</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Ton</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Current loading progress</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-600 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Sisa Kuota</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-red-600">300</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Ton</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Available slots for booking</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-cyan-600 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Progress Muat</CardDescription>
                <Badge variant="outline" className="text-[8px] h-4">63%</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                <div className="text-lg font-bold text-cyan-700">63.50%</div>
                <Progress value={63.5} className="h-1" />
                <p className="text-[10px] text-muted-foreground line-clamp-1">Gudang Lini 3 - Palembang | Urea Bulk</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shift Table */}
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Available Loading Schedule</CardTitle>
              <CardDescription>Select a shift to book your quota.</CardDescription>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-[200px]">Date</TableHead>
                  <TableHead className="text-center">Shift 1 (08:00 - 16:00)</TableHead>
                  <TableHead className="text-center">Shift 2 (16:00 - 00:00)</TableHead>
                  <TableHead className="text-center">Shift 3 (00:00 - 08:00)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableShifts.map((shift) => (
                  <TableRow key={shift.date} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold">{shift.date}</TableCell>
                    <TableCell className="text-center">
                      <Button variant={shift.shift1 === "Full" ? "ghost" : "outline"} size="sm" className={shift.shift1 === "Full" ? "bg-red-50 text-red-600" : "border-blue-100 hover:bg-blue-50"}>
                        {shift.shift1}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant={shift.shift2 === "Full" ? "ghost" : "outline"} size="sm" className={shift.shift2 === "Full" ? "bg-red-50 text-red-600" : "border-blue-100 hover:bg-blue-50"}>
                        {shift.shift2}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant={shift.shift3 === "Full" ? "ghost" : "outline"} size="sm" className={shift.shift3 === "Full" ? "bg-red-50 text-red-600" : "border-blue-100 hover:bg-blue-50"}>
                        {shift.shift3}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Existing Tickets Table */}
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Tickets</CardTitle>
              <CardDescription>Your recently created loading tickets.</CardDescription>
            </div>
            <Hash className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-[80px]">No.</TableHead>
                  <TableHead>Booking Code</TableHead>
                  <TableHead>Draft Date</TableHead>
                  <TableHead>Plate No.</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Qty (Ton)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTickets.map((ticket, index) => (
                  <TableRow key={ticket.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-[11px]">{index + 1}</TableCell>
                    <TableCell className="font-bold text-[#005FA4]">{ticket.bookingCode}</TableCell>
                    <TableCell className="text-[12px]">
                      <div className="flex flex-col">
                        <span>{ticket.date}</span>
                        <span className="text-muted-foreground text-[10px]">{ticket.shift}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant="secondary" className="rounded-sm font-mono">{ticket.nopol}</Badge>
                    </TableCell>
                    <TableCell>{ticket.driver}</TableCell>
                    <TableCell className="text-right font-semibold">{ticket.qty}</TableCell>
                    <TableCell>
                      <Badge className={ticket.status === "Completed" ? "bg-green-100 text-green-700 hover:bg-green-100 border-none" : "bg-sky-100 text-sky-700 hover:bg-sky-100 border-none"}>
                         {ticket.status === "Completed" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                         {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon-sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
