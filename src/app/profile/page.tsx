"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Mail,
  Building2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Building
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Label from "@/components/form/Label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [activeTab, setActiveTab] = useState<"profile" | "reset">("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    id: "",
    email: "",
    fullname: "",
    phoneNumber: "",
    nik: "",
    sapVendorCode: "",
  });

  // Verify Password Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Reset Password State
  const [passwordForm, setPasswordForm] = useState({
    oldpassword: "",
    password: "",
    newpassword: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfileForm({
          id: data.id || "",
          email: data.email || data.Email || "",
          fullname: data.fullname || data.FullName || data.Nama || "",
          phoneNumber: data.phoneNumber || data.PhoneNumber || "",
          nik: data.nik || data.NIK || "",
          sapVendorCode: data.sapVendorCode || data.sapvendorcode || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  // Pre-validate Profile Form
  const handleProfileSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullname || !profileForm.email) {
      setMessage({ type: "error", text: "Nama dan Email tidak boleh kosong" });
      return;
    }
    setMessage(null);
    setConfirmPassword("");
    setConfirmError(null);
    setShowConfirmModal(true);
  };

  // Actual Profile Save with Password Verification
  const handleConfirmSave = async () => {
    if (!confirmPassword) {
      setConfirmError("Password verifikasi wajib diisi!");
      return;
    }

    setSaving(true);
    setShowConfirmModal(false);
    setMessage(null);

    try {
      const res = await fetch("/api/user/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profileForm.id,
          fullname: profileForm.fullname,
          email: profileForm.email,
          phonenumber: profileForm.phoneNumber,
          currentPassword: confirmPassword,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Profil berhasil diperbarui!" });
        // Update the next-auth session to reflect name changes in header
        await update({
          ...session,
          user: {
            ...session?.user,
            name: profileForm.fullname,
            email: profileForm.email,
          }
        });
        fetchProfile();
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Gagal memperbarui profil. Pastikan password Anda benar." });
      }
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setSaving(false);
    }
  };

  // Handle Reset Password Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { oldpassword, password, newpassword } = passwordForm;

    if (!oldpassword || !password || !newpassword) {
      setMessage({ type: "error", text: "Semua field password harus diisi" });
      return;
    }

    if (password !== newpassword) {
      setMessage({ type: "error", text: "Konfirmasi password baru tidak sama!" });
      return;
    }

    if (password.length < 8) {
      setMessage({ type: "error", text: "Password baru minimal 8 karakter!" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldpassword,
          newpassword: password,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Password berhasil diganti!" });
        setPasswordForm({ oldpassword: "", password: "", newpassword: "" });
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Gagal mengganti password. Pastikan password lama sesuai." });
      }
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const roleName = session?.user?.role || "User";
  const isRekanan = roleName.toLowerCase() === "rekanan" || roleName.toLowerCase() === "transport";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up-fade">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">User Profile</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Kelola informasi profil pribadi dan keamanan akun Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden border border-gray-150 dark:border-gray-800 shadow-theme-xs">
            {/* Header Cover Background */}
            <div className="h-28 bg-gradient-to-r from-brand-600 to-indigo-600 relative flex items-end justify-center">
              <div className="absolute -bottom-14">
                <Avatar className="h-28 w-28 border-4 border-white dark:border-gray-900 shadow-md">
                  <AvatarFallback className="bg-brand-500 text-white text-3xl font-black font-outfit">
                    {profileForm.fullname?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            
            <CardContent className="pt-16 pb-6 text-center">
              <h2 className="text-lg font-black text-gray-900 dark:text-white truncate px-4">
                {profileForm.fullname || "User SISTRO"}
              </h2>
              <p className="text-xs text-brand-500 dark:text-brand-400 font-bold uppercase tracking-wider mt-1.5 bg-brand-50 dark:bg-brand-950/20 px-3 py-1 rounded-full inline-block">
                Role Anda: {roleName}
              </p>

              <div className="w-full pt-6 mt-6 border-t border-gray-100 dark:border-gray-800 space-y-3.5 text-left">
                <div className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4 mr-3 text-brand-500 shrink-0" />
                  <span className="truncate" title={profileForm.email}>{profileForm.email}</span>
                </div>
                {profileForm.phoneNumber && (
                  <div className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <Phone className="h-4 w-4 mr-3 text-brand-500 shrink-0" />
                    <span>{profileForm.phoneNumber}</span>
                  </div>
                )}
                {profileForm.nik && (
                  <div className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <Building2 className="h-4 w-4 mr-3 text-brand-500 shrink-0" />
                    <span>NIK: {profileForm.nik}</span>
                  </div>
                )}
                {isRekanan && profileForm.sapVendorCode && (
                  <div className="flex items-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <Building className="h-4 w-4 mr-3 text-brand-500 shrink-0" />
                    <span>Vendor: {profileForm.sapVendorCode}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Content with Tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Custom Modern Tabs */}
          <div className="flex gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-px">
            <button
              onClick={() => { setActiveTab("profile"); setMessage(null); }}
              className={`px-4 py-2.5 text-sm font-extrabold transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                activeTab === "profile"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400 font-black"
                  : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => { setActiveTab("reset"); setMessage(null); }}
              className={`px-4 py-2.5 text-sm font-extrabold transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                activeTab === "reset"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400 font-black"
                  : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              Reset Password
            </button>
          </div>

          {/* Feedback Messages */}
          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 border animate-slide-up-fade ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                : "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
            }`}>
              {message.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
              <span className="text-xs font-bold leading-tight">{message.text}</span>
            </div>
          )}

          {/* Tab 1: Profile Form */}
          {activeTab === "profile" && (
            <form onSubmit={handleProfileSubmitClick}>
              <Card className="border border-gray-150 dark:border-gray-800 shadow-theme-xs">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold text-gray-900 dark:text-white">Profile Saya</CardTitle>
                  <CardDescription>Informasi terkait profil Anda dapat dilihat dan diperbarui pada formulir di bawah ini.</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          name="email"
                          type="email"
                          value={profileForm.email}
                          onChange={handleProfileChange}
                          className="pl-10 h-10 text-xs font-semibold"
                          placeholder="Ketikkan Email Baru"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fullname</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          name="fullname"
                          type="text"
                          value={profileForm.fullname}
                          onChange={handleProfileChange}
                          className="pl-10 h-10 text-xs font-semibold"
                          placeholder="Nama lengkap Anda"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>No. Telp / No. HP</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          name="phoneNumber"
                          type="text"
                          value={profileForm.phoneNumber}
                          onChange={handleProfileChange}
                          className="pl-10 h-10 text-xs font-semibold"
                          placeholder="Masukkan No. Telp / No. HP"
                        />
                      </div>
                    </div>
                  </div>

                  {(profileForm.nik || (isRekanan && profileForm.sapVendorCode)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      {profileForm.nik && (
                        <div className="space-y-1.5">
                          <Label>NIK (Karyawan PI)</Label>
                          <Input
                            value={profileForm.nik}
                            disabled
                            className="bg-gray-50 dark:bg-white/[0.02] h-10 text-xs font-bold text-gray-500 border-gray-200 cursor-not-allowed"
                          />
                        </div>
                      )}
                      {isRekanan && profileForm.sapVendorCode && (
                        <div className="space-y-1.5">
                          <Label>SAP Vendor Code</Label>
                          <Input
                            value={profileForm.sapVendorCode}
                            disabled
                            className="bg-gray-50 dark:bg-white/[0.02] h-10 text-xs font-bold text-gray-500 border-gray-200 cursor-not-allowed"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="justify-end border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-white/[0.01] py-3.5">
                  <Button type="submit" disabled={saving} className="bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs h-9 cursor-pointer">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-3.5 w-3.5" />
                        Simpan Profil
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          )}

          {/* Tab 2: Reset Password Form */}
          {activeTab === "reset" && (
            <form onSubmit={handlePasswordSubmit}>
              <Card className="border border-gray-150 dark:border-gray-800 shadow-theme-xs">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold text-gray-900 dark:text-white">Reset Password</CardTitle>
                  <CardDescription>Untuk keamanan akun Anda, masukkan password lama Anda terlebih dahulu untuk mengganti password.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Password Lama</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        name="oldpassword"
                        type={showPassword ? "text" : "password"}
                        value={passwordForm.oldpassword}
                        onChange={handlePasswordChange}
                        className="pl-10 h-10 text-xs font-semibold"
                        placeholder="Masukkan Password Saat Ini"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Password Baru</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={passwordForm.password}
                          onChange={handlePasswordChange}
                          className="pl-10 h-10 text-xs font-semibold"
                          placeholder="Ketikkan Password Baru"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Ketik Ulang Password Baru</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          name="newpassword"
                          type={showPassword ? "text" : "password"}
                          value={passwordForm.newpassword}
                          onChange={handlePasswordChange}
                          className="pl-10 h-10 text-xs font-semibold"
                          placeholder="Ketikkan Ulang Password Baru"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 cursor-pointer select-none" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff className="h-4.5 w-4.5 text-brand-500" />
                    ) : (
                      <Eye className="h-4.5 w-4.5 text-gray-400" />
                    )}
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Tampilkan Password</span>
                  </div>
                </CardContent>

                <CardFooter className="justify-end border-t border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-white/[0.01] py-3.5">
                  <Button type="submit" disabled={saving} className="bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs h-9 cursor-pointer">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                        Simpan Perubahan
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          )}
        </div>
      </div>

      {/* Modern Verify Password Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up-fade">
            <div className="p-5 border-b border-gray-150 dark:border-gray-800">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
                <ShieldCheck className="h-5 w-5 text-brand-500 animate-pulse" />
                Konfirmasi Identitas
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">
                Untuk alasan keamanan (mencegah pembajakan akun), silakan masukkan password Anda saat ini untuk menyimpan perubahan profil.
              </p>
              
              <div className="space-y-1.5">
                <Label>Masukkan Password Anda</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(null); }}
                    className="pl-10 h-10 text-xs font-semibold"
                    placeholder="Masukkan Password Anda"
                    autoFocus
                  />
                </div>
                {confirmError && (
                  <p className="text-xs text-red-500 font-bold">{confirmError}</p>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-brand-500 hover:bg-brand-600 shadow cursor-pointer"
              >
                Konfirmasi &amp; Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
