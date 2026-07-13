# Candal Granular Menu Fix Guide

Dokumen ini menjelaskan perbaikan menu untuk user sub-role candal (seperti `candaltruk`, `candalkuota`, `candaldept`, dll.) dan apa yang perlu dijalankan di database.

## 1. Perubahan Frontend (Telah Selesai)
File [app-sidebar.tsx](file:///c:/Users/weka/Indigo/SISTROV2-next/src/components/app-sidebar.tsx) telah diperbarui agar:
- Menu Posto untuk seluruh user candal **tidak menampilkan menu Upload POSTO / SO** (`MENU_POSTO_CANDAL`).
- Menu dirakit secara dinamis berdasarkan array `session.user.roles` menggunakan fungsi `buildCandalMenus()`.
- Jika user memiliki beberapa sub-role candal (misal `candaltruk` + `candalkuota`), menunya akan digabung (merged).
- Jika user memiliki role `adminarmada` beserta sub-role candal lainnya, item **"Approval Pengajuan"** otomatis disisipkan ke menu **Armada** mereka.
- Role `candaldept` mendapatkan akses lengkap: menu **Gudang**, **Kuota**, dan **Armada** (tanpa upload).

## 2. Perubahan Database (Perlu Dieksekusi)
Agar perbaikan ini berjalan dengan benar dan user candal tidak fallback mendapatkan menu `pod` (full access), jalankan script SQL berikut pada database SISTRO menggunakan SQL Server Management Studio (SSMS):

File SQL dapat ditemukan di: [fix_candal_menu_group.sql](file:///c:/Users/weka/Indigo/SISTROV2-next/docs/fix_candal_menu_group.sql)

```sql
-- 1. Set semua candal sub-roles → menu_group = 'candal'
UPDATE AspNetRoles
SET menu_group = 'candal'
WHERE Name IN (
    'CandalTruk',
    'CandalTruck',
    'CandalKuota',
    'CandalDept',
    'CandalGudangPosto',
    'CandalKapal',
    'CandalContainer'
);

-- 2. Pastikan AdminArmada tetap 'pod'
UPDATE AspNetRoles
SET menu_group = 'pod'
WHERE Name = 'AdminArmada';

-- 3. Verifikasi hasil
SELECT Name, menu_group
FROM AspNetRoles
WHERE Name IN (
    'CandalTruk','CandalTruck','CandalKuota','CandalDept',
    'CandalGudangPosto','CandalKapal','CandalContainer','AdminArmada'
)
ORDER BY Name;
```

> **PENTING:** Setelah script SQL di atas sukses dijalankan, user terkait wajib melakukan **Logout** dan **Login ulang** agar token session NextAuth mereka diperbarui dengan `menuGroup` yang baru.
