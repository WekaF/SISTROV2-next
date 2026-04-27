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
  Key,
  Edit,
  Trash2,
  X,
  Loader2,
  Check
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Badge from "@/components/ui/badge/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/toast";

export default function UserConfigPage() {
  const { addToast } = useToast();
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Modal & Edit State
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<any>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Lookups
  const [availableRoles, setAvailableRoles] = React.useState<any[]>([]);
  const [availableCompanies, setAvailableCompanies] = React.useState<any[]>([]);

  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    isActive: true,
    roles: [] as string[],
    companyIds: [] as number[]
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data || []);
    } catch (err: any) {
      console.error("[Users Page] Fetch Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [roleRes, companyRes] = await Promise.all([
        fetch('/api/admin/roles'),
        fetch('/api/admin/companies/lookup')
      ]);
      const roles = await roleRes.json();
      const companies = await companyRes.json();
      setAvailableRoles(roles);
      setAvailableCompanies(companies);
    } catch (err) {
      console.error("Lookup fetch error:", err);
    }
  };

  React.useEffect(() => {
    fetchUsers();
    fetchLookups();
  }, []);

  const handleEditClick = (user: any) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.FullName || "",
      email: user.Email || "",
      isActive: user.IsActive,
      roles: user.roles || [],
      companyIds: (user.companies || []).map((c: any) => c.id)
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (user: any) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.Id,
          ...formData
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      
      addToast({ title: "User Updated", description: "User configuration has been saved.", variant: "success" });
      setShowEditModal(false);
      fetchUsers();
    } catch (err: any) {
      addToast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/users?id=${selectedUser.Id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      
      addToast({ title: "User Deleted", description: "User has been removed from the system.", variant: "success" });
      setShowDeleteConfirm(false);
      fetchUsers();
    } catch (err: any) {
      addToast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRole = (code: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(code) 
        ? prev.roles.filter(r => r !== code) 
        : [...prev.roles, code]
    }));
  };

  const toggleCompany = (id: number) => {
    setFormData(prev => ({
      ...prev,
      companyIds: prev.companyIds.includes(id)
        ? prev.companyIds.filter(c => c !== id)
        : [...prev.companyIds, id]
    }));
  };

  const filteredUsers = users.filter(u => 
    (u.FullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.UserName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.Email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    superadmins: users.filter(u => u.roles.includes('superadmin') || u.roles.includes('Superadmin')).length,
    total: users.length,
    active: users.filter(u => u.IsActive).length,
    rolesCount: new Set(users.flatMap(u => u.roles)).size
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-gray-500 font-medium">Memuat data pengguna...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20">
        <p className="text-rose-500 font-bold mb-4">Error: {error}</p>
        <Button onClick={fetchUsers} variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">Coba Lagi</Button>
      </div>
    );
  }

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
            <div className="text-xl font-black">{stats.superadmins}</div>
            <div className="text-[10px] text-gray-400 uppercase font-black">Superadmins</div>
         </Card>
         <Card className="flex flex-col items-center p-4 text-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-2 dark:bg-orange-500/10">
               <Users className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">{stats.total}</div>
            <div className="text-[10px] text-gray-400 uppercase font-black">Total Users</div>
         </Card>
         <Card className="flex flex-col items-center p-4 text-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2 dark:bg-emerald-500/10">
               <UserCheck className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">{stats.active}</div>
            <div className="text-[10px] text-gray-400 uppercase font-black">Active Now</div>
         </Card>
         <Card className="flex flex-col items-center p-4 text-center border-gray-100 dark:border-gray-800 shadow-theme-xs">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-2 dark:bg-rose-500/10">
               <Key className="h-5 w-5" />
            </div>
            <div className="text-xl font-black">{stats.rolesCount}</div>
            <div className="text-[10px] text-gray-400 uppercase font-black">Role Types</div>
         </Card>
      </div>

      <Card className="shadow-theme-xs overflow-hidden">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                className="pl-10" 
                placeholder="Cari nama, username, atau email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Username</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Email</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Roles</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Plants Mapping</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-black uppercase text-gray-500 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map((user, i) => (
                  <tr key={user.Id || i} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold dark:bg-gray-800 uppercase text-xs ring-2 ring-white dark:ring-gray-900 group-hover:bg-brand-50 group-hover:text-brand-500 transition-colors">
                           {(user.FullName || user.UserName || '?').split(' ').map((n:any)=>n[0]).join('')}
                        </div>
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{user.FullName || user.UserName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-xs font-medium text-gray-900 dark:text-white">@{user.UserName}</span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Mail className="h-3 w-3" />
                          {user.Email || '-'}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-wrap gap-1">
                          {user.roles.map((role: string) => (
                            <Badge key={role} variant="light" color={role.toLowerCase() === 'superadmin' ? 'warning' : 'info'} className="uppercase font-black text-[10px]">
                               {role}
                            </Badge>
                          ))}
                          {user.roles.length === 0 && <span className="text-xs text-gray-400">-</span>}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {user.companies && user.companies.length > 0 ? (
                            user.companies.map((c: any) => (
                              <Badge key={c.id} variant="light" size="sm" color="light" className="gap-1 border border-gray-100 dark:border-white/5">
                                <Building className="h-2 w-2" />
                                {c.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${user.IsActive ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                          <span className="text-xs font-medium">{user.IsActive ? 'Active' : 'Inactive'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="hover:text-brand-500 hover:bg-brand-50" onClick={() => handleEditClick(user)}>
                             <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteClick(user)}>
                             <Trash2 className="h-4 w-4" />
                          </Button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl shadow-2xl border-none bg-white dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>Edit Pengguna</CardTitle>
                <CardDescription>Update profil, role, dan plant mapping.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowEditModal(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <form onSubmit={handleUpdate}>
              <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Nama Lengkap</label>
                    <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400">Email Address</label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <input 
                    type="checkbox" 
                    id="user-active"
                    checked={formData.isActive} 
                    onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                   />
                   <label htmlFor="user-active" className="text-sm font-medium">Akun Aktif</label>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400">Role Selection</label>
                  <div className="flex flex-wrap gap-2">
                    {availableRoles.map(role => {
                      const isSelected = formData.roles.includes(role.Code);
                      return (
                        <button
                          key={role.Id}
                          type="button"
                          onClick={() => toggleRole(role.Code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                            isSelected 
                              ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20' 
                              : 'bg-white text-gray-600 border-gray-200 hover:border-brand-200'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                          {role.Name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400">Plant / Company Mapping</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableCompanies.map(company => {
                      const isSelected = formData.companyIds.includes(company.Id);
                      return (
                        <button
                          key={company.Id}
                          type="button"
                          onClick={() => toggleCompany(company.Id)}
                          className={`p-3 rounded-xl text-xs font-medium text-left transition-all border ${
                            isSelected 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-500/20' 
                              : 'bg-gray-50/50 text-gray-600 border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                             <div className={`p-1 rounded ${isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                <Building className="h-3 w-3" />
                             </div>
                             <span className="truncate">{company.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-gray-50/50 p-4 flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setShowEditModal(false)}>Batal</Button>
                <Button type="submit" className="bg-brand-500 hover:bg-brand-600 min-w-[120px]" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Simpan Perubahan"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Hapus Pengguna"
        description={`Apakah Anda yakin ingin menghapus pengguna ${selectedUser?.FullName || selectedUser?.UserName}? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleConfirmDelete}
        confirmText="Hapus Pengguna"
        cancelText="Batal"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}
