# Rename OTW Labels to "On Going" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace display labels "OTW Security Out" and "OTW Jembatan Timbang Isi" (and any other "OTW …" variants) with "On Going" in the backend antrian (queue) API and controller HTML output.

**Architecture:** Pure string replacement in the ASP.NET backend — no logic change, no schema change, no frontend change needed. The label is a display-only string passed to `BuildPositionSectionQ2()` or interpolated into HTML table strings.

**Tech Stack:** C# / ASP.NET Framework 4.5 — edit with any text editor or IDE. No recompile step listed; the dev runs IIS Express which hot-reloads on build.

---

## File Map

| File | Lines with "OTW" | Action |
|---|---|---|
| `sistropigroup/SISTROAWESOME/api/AntrianController.cs` | 723–724, 735–736 | Replace label strings + update comments |
| `sistropigroup/SISTROAWESOME/Controllers/AntrianController.cs` | 241, 391, 908, 1143, 1745, 1980, 2583, 2818 | Replace label strings |

---

### Task 1: Replace OTW labels in `api/AntrianController.cs`

**Files:**
- Modify: `sistropigroup/SISTROAWESOME/api/AntrianController.cs:723-739`

Current state (lines 723–739):
```csharp
            // OTW Security Out (position == "06")
            sections.Add(BuildPositionSectionQ2("security_out", "OTW Security Out",
                db.Tiket.Include("Produk").Include("Posto1.Gudang1")
                    .Where(x => x.Kuota4Shift.company_code == company && x.position == "06" && x.tanggal == today).ToList(),
                trafficData));

            // Jembatan Timbangan In (position == "02")
            sections.Add(BuildPositionSectionQ2("timbangan_in", "Jembatan Timbangan In",
                db.Tiket.Include("Produk").Include("Posto1.Gudang1")
                    .Where(x => x.Kuota4Shift.company_code == company && x.position == "02" && x.tanggal <= today).ToList(),
                trafficData));

            // OTW Jembatan Timbang Isi (position == "04")
            sections.Add(BuildPositionSectionQ2("timbangan_isi", "OTW Jembatan Timbang Isi",
                db.Tiket.Include("Produk").Include("Posto1.Gudang1")
                    .Where(x => x.Kuota4Shift.company_code == company && x.position == "04" && x.tanggal == today).ToList(),
                trafficData));
```

- [ ] **Step 1: Apply replacement**

Change `"OTW Security Out"` → `"On Going"` and `"OTW Jembatan Timbang Isi"` → `"On Going"`, and update the comments:

```csharp
            // On Going - Security Out (position == "06")
            sections.Add(BuildPositionSectionQ2("security_out", "On Going",
                db.Tiket.Include("Produk").Include("Posto1.Gudang1")
                    .Where(x => x.Kuota4Shift.company_code == company && x.position == "06" && x.tanggal == today).ToList(),
                trafficData));

            // Jembatan Timbangan In (position == "02")
            sections.Add(BuildPositionSectionQ2("timbangan_in", "Jembatan Timbangan In",
                db.Tiket.Include("Produk").Include("Posto1.Gudang1")
                    .Where(x => x.Kuota4Shift.company_code == company && x.position == "02" && x.tanggal <= today).ToList(),
                trafficData));

            // On Going - Jembatan Timbang Isi (position == "04")
            sections.Add(BuildPositionSectionQ2("timbangan_isi", "On Going",
                db.Tiket.Include("Produk").Include("Posto1.Gudang1")
                    .Where(x => x.Kuota4Shift.company_code == company && x.position == "04" && x.tanggal == today).ToList(),
                trafficData));
```

- [ ] **Step 2: Verify no "OTW" remains**

```bash
grep -n "OTW" sistropigroup/SISTROAWESOME/api/AntrianController.cs
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git -C sistropigroup add SISTROAWESOME/api/AntrianController.cs
git -C sistropigroup commit -m "fix: rename OTW labels to On Going in api/AntrianController"
```

---

### Task 2: Replace OTW labels in `Controllers/AntrianController.cs`

**Files:**
- Modify: `sistropigroup/SISTROAWESOME/Controllers/AntrianController.cs`

8 occurrences total — two distinct strings:

| String to replace | Count |
|---|---|
| `OTW Security Out` | 4 (lines 241, 908, 1745, 2583) |
| `OTW Jembatan Timbang Isi` | 4 (lines 391, 1143, 1980, 2818) |

- [ ] **Step 1: Replace line 241**

Before:
```csharp
            table += "<tr><td><h7><b>OTW Security Out</b></h7><br>" +
```
After:
```csharp
            table += "<tr><td><h7><b>On Going</b></h7><br>" +
```

- [ ] **Step 2: Replace line 391**

Before:
```csharp
            table += "<tr><td><h7><b>OTW Jembatan Timbang Isi</b></h7><br>" +
```
After:
```csharp
            table += "<tr><td><h7><b>On Going</b></h7><br>" +
```

- [ ] **Step 3: Replace remaining 6 occurrences (lines 908, 1143, 1745, 1980, 2583, 2818)**

All follow the same HTML pattern. Replace each:

`<h6><b>OTW Security Out</b></h6>` → `<h6><b>On Going</b></h6>`

`<h6><b>OTW Jembatan Timbang Isi</b></h6>` → `<h6><b>On Going</b></h6>`

Fastest approach — run in the sistropigroup directory:

```powershell
(Get-Content "SISTROAWESOME/Controllers/AntrianController.cs") `
  -replace 'OTW Security Out', 'On Going' `
  -replace 'OTW Jembatan Timbang Isi', 'On Going' |
  Set-Content "SISTROAWESOME/Controllers/AntrianController.cs"
```

- [ ] **Step 4: Verify no "OTW" remains**

```bash
grep -n "OTW" sistropigroup/SISTROAWESOME/Controllers/AntrianController.cs
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git -C sistropigroup add SISTROAWESOME/Controllers/AntrianController.cs
git -C sistropigroup commit -m "fix: rename OTW labels to On Going in Controllers/AntrianController"
```

---

## How to Test

1. Start backend: run `.\start-dev.ps1` from `sistropigroup`
2. Open the Antrian (queue) dashboard in the browser
3. Verify sections that previously showed "OTW Security Out" and "OTW Jembatan Timbang Isi" now show "On Going"
4. The internal section keys (`security_out`, `timbangan_isi`) are unchanged — behavior stays the same, only display label differs
