-- ==========================================================================
-- FIX: Set menu_group untuk candal sub-roles di AspNetRoles
-- Jalankan di SQL Server Management Studio (SSMS) terhadap database SISTRO
-- ==========================================================================

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
--    (user yang HANYA punya adminarmada tetap dapat menu POD)
--    (user candal + adminarmada ditangani buildCandalMenus() di frontend Next.js)
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
