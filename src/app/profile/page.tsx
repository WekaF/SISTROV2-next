"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Camera,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Label from "@/components/form/Label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states - initialized with session data to avoid empty fields while loading
  const [formData, setFormData] = useState({
    fullName: session?.user?.name || "",
    email: session?.user?.email || "",
    department: "",
    bagian: "",
    avatarUrl: (session?.user as any)?.avatar || "",
    nik: (session?.user as any)?.nik || "",
    sapVendorCode: (session?.user as any)?.companyCode || "",
  });

  useEffect(() => {
    if (session && loading) {
      // If we have some session data, pre-fill it immediately
      setFormData(prev => ({
        ...prev,
        fullName: session.user?.name || prev.fullName,
        email: session.user?.email || prev.email,
        avatarUrl: (session.user as any)?.avatar || prev.avatarUrl,
        sapVendorCode: (session.user as any)?.companyCode || prev.sapVendorCode,
        nik: (session.user as any)?.nik || prev.nik,
      }));

      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        console.log("Profile data received:", data); // Debugging
        setFormData({
          fullName: data.FullName || data.fullName || "",
          email: data.Email || data.email || "",
          department: data.Department || data.department || "",
          bagian: data.Bagian || data.bagian || "",
          avatarUrl: data.AvatarUrl || data.avatarUrl || "",
          nik: data.NIK || data.nik || "",
          sapVendorCode: data.SapVendorCode || data.sapVendorCode || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Profile updated successfully!" });
        // Update the next-auth session to reflect name changes in header
        await update({
          ...session,
          user: {
            ...session?.user,
            name: formData.fullName,
            email: formData.email,
          }
        });
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to update profile." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your personal information and account preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative group mb-4">
                  <Avatar className="h-32 w-32 border-4 border-white dark:border-gray-800 shadow-lg">
                    <AvatarImage src={formData.avatarUrl || "/images/user/user-01.jpg"} alt={formData.fullName} />
                    <AvatarFallback className="bg-brand-500 text-white text-3xl font-bold font-outfit">
                      {formData.fullName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate w-full">
                  {formData.fullName || "Loading..."}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {session?.user?.role || "User"}
                </p>
                <div className="w-full pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4 mr-3 text-brand-500" />
                    <span className="truncate">{formData.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Building2 className="h-4 w-4 mr-3 text-brand-500" />
                    <span className="truncate">{formData.department || "No Department"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your contact details and organizational info.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {message && (
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                      : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20"
                    }`}>
                    {message.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <span className="text-sm font-medium">{message.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="pl-10"
                        placeholder="Your full name"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10"
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="pl-10"
                        placeholder="Department name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bagian / Team</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        name="bagian"
                        value={formData.bagian}
                        onChange={handleInputChange}
                        className="pl-10"
                        placeholder="Team or section"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>NIK (Karyawan PI)</Label>
                    <Input
                      value={formData.nik || "-"}
                      className="bg-gray-100 dark:bg-white/5"
                      disabled
                      title="NIK cannot be changed manually"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SAP Vendor Code</Label>
                    <Input
                      value={formData.sapVendorCode || "-"}
                      className="bg-gray-100 dark:bg-white/5"
                      disabled
                      title="Vendor Code cannot be changed manually"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Avatar URL</Label>
                  <Input
                    name="avatarUrl"
                    value={formData.avatarUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/photo.jpg"
                  />
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Note: Currently we only support public image URLs.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="justify-end bg-gray-50/50 dark:bg-white/[0.02]">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
