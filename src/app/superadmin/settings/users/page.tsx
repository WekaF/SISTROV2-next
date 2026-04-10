"use client";
import React from "react";
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  MoreVertical, 
  ShieldCheck, 
  Mail,
  UserCheck,
  Building,
  Key
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";

export default function UserConfigPage() {
  const users = [
    { name: "Ahmad Bagus", email: "ahmad@sistro.com", role: "Superadmin", plant: "Global", status: "Active" },
    { name: "Budi Santoso", email: "budi@gresik.com", role: "POD", plant: "Plant Gresik", status: "Active" },
    { name: "Siti Aminah", email: "siti@admin.com", role: "Admin", plant: "Plant Cilacap", status: "Active" },
    { name: "Security Gate 1", email: "gate1@gresik.com", role: "Security", plant: "Plant Gresik", status: "Away" },
    { name: "JT Operator", email: "jt@sistro.com", role: "Weighbridge", plant: "Global", status: "Active" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Konfigurasi Pengguna</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola akses, role, dan mapping pengguna ke seluruh company/plant.</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20">
          <UserPlus className="h-4 w-4 mr-2" />
          Tambah User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="flex flex-col items-center p-4 text-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mb-2 dark:bg-brand-500/10">
               <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">2</div>
            <div className="text-[10px] text-gray-400 uppercase font-black">Superadmins</div>
         </Card>
         <Card className="flex flex-col items-center p-4 text-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-2 dark:bg-orange-500/10">
               <Users className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">124</div>
            <div className="text-[10px] text-gray-400 uppercase font-black">Total Users</div>
         </Card>
         <Card className="flex flex-col items-center p-4 text-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2 dark:bg-emerald-500/10">
               <UserCheck className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">118</div>
            <div className="text-[10px] text-gray-400 uppercase font-black">Active Now</div>
         </Card>
         <Card className="flex flex-col items-center p-4 text-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-2 dark:bg-rose-500/10">
               <Key className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">8</div>
            <div className="text-[10px] text-gray-400 uppercase font-black">Role Types</div>
         </Card>
      </div>

      <Card className="shadow-theme-xs overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-10" placeholder="Cari nama, email, atau role..." />
            </div>
            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" className="gap-2">
                 <Filter className="h-4 w-4" />
                 Filters
               </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-white/[0.01]">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Full Name</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Email Access</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Role Type</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Plant Mapping</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((user, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold dark:bg-gray-800 uppercase text-xs ring-2 ring-white dark:ring-gray-900">
                           {user.name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail className="h-3 w-3" />
                          {user.email}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <Badge variant="light" color={user.role === 'Superadmin' ? 'warning' : 'info'} className="uppercase font-black text-[10px]">
                          {user.role}
                       </Badge>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2 text-xs font-medium">
                          <Building className="h-3 w-3 text-brand-400" />
                          {user.plant}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                          <span className="text-xs font-medium">{user.status}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-white/5">
                          <MoreVertical className="h-4 w-4" />
                       </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
