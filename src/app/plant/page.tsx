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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  Search, 
  Settings2, 
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Factory
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

const plants = [
  {
    id: "P001",
    code: "G001",
    name: "Gudang Lini 1 - Surabaya",
    group: "Pusri",
    order: 1,
    status: "Active",
  },
  {
    id: "P002",
    code: "G002",
    name: "Gudang Lini 2 - Semarang",
    group: "Petrokimia",
    order: 2,
    status: "Active",
  },
  {
    id: "P003",
    code: "G003",
    name: "Gudang Lini 3 - Palembang",
    group: "Pusri",
    order: 3,
    status: "Inactive",
  },
  {
    id: "P004",
    code: "G004",
    name: "Pabrik Utama - Gresik",
    group: "Petrokimia",
    order: 4,
    status: "Active",
  },
  {
    id: "P005",
    code: "G005",
    name: "Terminal Khusus - Bontang",
    group: "PKT",
    order: 5,
    status: "Active",
  },
]

export default function PlantPage() {
  const [searchTerm, setSearchTerm] = React.useState("")

  const filteredPlants = plants.filter(plant => 
    plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plant.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
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
                <BreadcrumbPage>Plant Management</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <Button size="sm" className="bg-[#005FA4]">
          <Plus className="mr-2 h-4 w-4" /> Add New Plant
        </Button>
      </header>
      
      <main className="flex-1 p-4 md:p-8 space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Plant Management</h1>
          <p className="text-muted-foreground italic">
            Manage and configure your system plants and their operational parameters.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search plants by name or code..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm">
            <Settings2 className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>

        <Card className="shadow-sm border-none bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[80px]">No.</TableHead>
                  <TableHead>Plant Code</TableHead>
                  <TableHead>Plant Name</TableHead>
                  <TableHead>Company Group</TableHead>
                  <TableHead className="text-center">Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlants.map((plant, index) => (
                  <TableRow key={plant.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{index + 1}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-[#005FA4]">
                      {plant.code}
                    </TableCell>
                    <TableCell className="font-medium">{plant.name}</TableCell>
                    <TableCell>{plant.group}</TableCell>
                    <TableCell className="text-center">{plant.order}</TableCell>
                    <TableCell>
                      {plant.status === "Active" ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0.5">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-2 py-0.5">
                          <XCircle className="mr-1 h-3 w-3" /> Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Factory className="mr-2 h-4 w-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings2 className="mr-2 h-4 w-4" /> Configure Constants
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
