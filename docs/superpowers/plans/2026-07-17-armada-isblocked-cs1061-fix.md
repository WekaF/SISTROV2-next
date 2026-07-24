# Armada IsBlocked/Blocked* CS1061 Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 7 `CS1061` build errors in `SISTROAWESOME` by adding the missing `is_blocked`/`blocked_on`/`blocked_by`/`blocked_reason` columns to `dbo.Armada` and wiring them through the EF6 EDMX model so `ArmadaController.cs` compiles and the blokir-armada feature works end to end.

**Architecture:** `SISTROAWESOME` uses EF6 Database-First with `BDO/SistroEntities.edmx` (SSDL = DB schema, CSDL = C# entity shape, MSL = mapping between the two). `BDO/Armada.cs` is a T4-generated partial class whose properties come from the CSDL. `ArmadaController.cs` already references `Armada.IsBlocked`, `.BlockedOn`, `.BlockedBy`, `.BlockedReason` (feature code was written first) but none of the 3 EDMX layers or the DB columns exist yet — normally "Update Model from Database" in Visual Studio regenerates all of this, but there's no VS/T4 tooling available here, so every layer is hand-edited to exactly what that regeneration would produce. DB naming stays `snake_case` (matches every other column in this table); C# property naming stays `PascalCase` (matches what the controller already calls) — MSL bridges the two, same pattern already used for every other column in this entity.

**Tech Stack:** ASP.NET Framework 4.5, EF6 (Database-First/EDMX), SQL Server (`SISTROSTAGING` @ `192.168.188.29,7869`), MSBuild.

**Baseline (verified before writing this plan):**
- `sqlcmd` query against `SISTROSTAGING.dbo.Armada` confirms none of the 4 columns exist yet.
- Full solution build (`MSBuild SISTROAWESOME.csproj`) shows exactly 7 `error CS1061`, all in `ArmadaController.cs` (lines 69, 70, 71, 1923, 1924, 1925, 1926), all caused by the same missing 4 properties. No other errors anywhere in the solution.
- A migration guide and idempotent SQL script for this exact fix already exist: `docs/armada_blokir_columns_guide.md` and `docs/sql/10_add_armada_blokir_columns.sql` (this repo, SISTROV2-next).

---

### Task 1: Apply the DB migration to SISTROSTAGING

**Files:**
- Read: `c:\Users\weka\Indigo\SISTROV2-next\docs\sql\10_add_armada_blokir_columns.sql`
- Read (for current active connection): `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\Web.config` (active `DefaultConnection`/`sistroEntities` around line 38-40 — currently `SISTROSTAGING` @ `192.168.188.29,7869`, user `usr_sistro_dev`)

- [ ] **Step 1: Confirm columns are still absent (guards against re-running against a DB someone already patched)**

Run:
```bash
"/c/Program Files/Microsoft SQL Server/Client SDK/ODBC/170/Tools/Binn/sqlcmd" -S "192.168.188.29,7869" -U usr_sistro_dev -P 'Si$tr0@Pupuk1!_d3v' -d SISTROSTAGING -Q "SELECT name FROM sys.columns WHERE object_id=OBJECT_ID('dbo.Armada') AND name IN ('is_blocked','blocked_on','blocked_by','blocked_reason')" -h -1
```
Expected: `(0 rows affected)` — confirms columns are still missing (matches the baseline check above; if this now returns rows, someone else already applied the migration — stop and skip to Task 2, re-verify column types match Task 1 Step 2's SQL before trusting them).

- [ ] **Step 2: Run the migration**

Run:
```bash
"/c/Program Files/Microsoft SQL Server/Client SDK/ODBC/170/Tools/Binn/sqlcmd" -S "192.168.188.29,7869" -U usr_sistro_dev -P 'Si$tr0@Pupuk1!_d3v' -d SISTROSTAGING -i "C:\Users\weka\Indigo\SISTROV2-next\docs\sql\10_add_armada_blokir_columns.sql"
```
Expected: no error output. The script is idempotent (each `ALTER TABLE` is guarded by `IF NOT EXISTS`), safe to re-run.

- [ ] **Step 3: Verify the 4 columns now exist with correct types**

Run:
```bash
"/c/Program Files/Microsoft SQL Server/Client SDK/ODBC/170/Tools/Binn/sqlcmd" -S "192.168.188.29,7869" -U usr_sistro_dev -P 'Si$tr0@Pupuk1!_d3v' -d SISTROSTAGING -Q "SELECT c.name, t.name AS type_name, c.max_length, c.is_nullable FROM sys.columns c JOIN sys.types t ON c.user_type_id = t.user_type_id WHERE c.object_id=OBJECT_ID('dbo.Armada') AND c.name IN ('is_blocked','blocked_on','blocked_by','blocked_reason') ORDER BY c.name" -h -1
```
Expected: 4 rows —
- `blocked_by` / `nvarchar` / max_length `200` (100 chars × 2 bytes) / nullable `1`
- `blocked_on` / `datetime` / nullable `1`
- `blocked_reason` / `nvarchar` / max_length `1000` (500 chars × 2 bytes) / nullable `1`
- `is_blocked` / `bit` / nullable `0`

---

### Task 2: Extend the EDMX (SSDL, CSDL, MSL) for the 4 new columns

**Files:**
- Modify: `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\BDO\SistroEntities.edmx`

The `Armada` entity appears 3 times in this one XML file — storage schema (SSDL, ~line 97), conceptual schema (CSDL, ~line 4904), and the mapping bridging them (MSL, ~line 8319). All 3 need the new properties or EF's LINQ-to-Entities query translator won't recognize `x.IsBlocked` etc. inside `db.Armada.Where(...).Select(...)` — a plain C#-only property added just to `Armada.cs` would compile but throw a runtime `NotSupportedException` the first time a query touches it.

- [ ] **Step 1: Add the 4 columns to the SSDL `Armada` `EntityType`**

Find (around line 140, the last `<Property>` before `</EntityType>` in the **first** `EntityType Name="Armada"` block — the one inside `<Schema Namespace="SISTROPIModel.Store"`):
```xml
          <Property Name="status_armada" Type="varchar" MaxLength="20" />
        </EntityType>
```
Replace with:
```xml
          <Property Name="status_armada" Type="varchar" MaxLength="20" />
          <Property Name="is_blocked" Type="bit" Nullable="false" />
          <Property Name="blocked_on" Type="datetime" />
          <Property Name="blocked_by" Type="nvarchar" MaxLength="100" />
          <Property Name="blocked_reason" Type="nvarchar" MaxLength="500" />
        </EntityType>
```
This must be the SSDL occurrence (line ~97-141), not the CSDL one (line ~4904) — SSDL properties use the literal DB column names (`Type="bit"`/`"datetime"`/`"nvarchar"`, no `FixedLength`/`Unicode`/C# type names). If both blocks look similar, confirm by checking the enclosing `<Schema>` tag's `Namespace` attribute a few lines up: SSDL is `Namespace="SISTROPIModel.Store"`.

- [ ] **Step 2: Add the 4 properties to the CSDL `Armada` `EntityType`**

Find (around line 4947, the last `<Property>` before `<NavigationProperty Name="Transport"...` in the **second** `EntityType Name="Armada"` block — the one inside `<Schema Namespace="SISTROPIModel"` without `.Store`):
```xml
          <Property Name="status_armada" MaxLength="20" FixedLength="false" Unicode="false" Type="String" />
          <NavigationProperty Name="Transport" Relationship="SISTROPIModel.FK_Armada_Transport" FromRole="Armada" ToRole="Transport" />
```
Replace with:
```xml
          <Property Name="status_armada" MaxLength="20" FixedLength="false" Unicode="false" Type="String" />
          <Property Name="IsBlocked" Nullable="false" Type="Boolean" />
          <Property Name="BlockedOn" Type="DateTime" Precision="3" />
          <Property Name="BlockedBy" MaxLength="100" FixedLength="false" Unicode="true" Type="String" />
          <Property Name="BlockedReason" MaxLength="500" FixedLength="false" Unicode="true" Type="String" />
          <NavigationProperty Name="Transport" Relationship="SISTROPIModel.FK_Armada_Transport" FromRole="Armada" ToRole="Transport" />
```
Names here are `PascalCase` (`IsBlocked`, not `is_blocked`) — this is what becomes the C# property name in `Armada.cs`, and it's what `ArmadaController.cs` already calls. `Unicode="true"` on the two string properties (unlike the existing `varchar` columns which use `Unicode="false"`) because the DB columns are `nvarchar`.

- [ ] **Step 3: Add the 4 scalar mappings to the MSL `EntityTypeMapping` for `Armada`**

Find (around line 8360, the last `<ScalarProperty>` before `</MappingFragment>` inside `<EntityTypeMapping TypeName="SISTROPIModel.Armada">`):
```xml
                <ScalarProperty Name="status_armada" ColumnName="status_armada" />
              </MappingFragment>
            </EntityTypeMapping>
```
Replace with:
```xml
                <ScalarProperty Name="status_armada" ColumnName="status_armada" />
                <ScalarProperty Name="IsBlocked" ColumnName="is_blocked" />
                <ScalarProperty Name="BlockedOn" ColumnName="blocked_on" />
                <ScalarProperty Name="BlockedBy" ColumnName="blocked_by" />
                <ScalarProperty Name="BlockedReason" ColumnName="blocked_reason" />
              </MappingFragment>
            </EntityTypeMapping>
```
`Name` is the CSDL (C#) name from Step 2; `ColumnName` is the SSDL (DB) name from Step 1. Double-check this is the `Armada` mapping and not the neighboring `LogArmada` one a few hundred lines down (line ~8811) — confirm via the `TypeName="SISTROPIModel.Armada"` attribute on the enclosing `<EntityTypeMapping>`.

- [ ] **Step 4: Save and sanity-check the XML is well-formed**

Run (from `SISTROV2-next` repo root, adjust path if needed):
```bash
python -c "import xml.dom.minidom as m; m.parse(r'C:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\BDO\SistroEntities.edmx')" && echo "XML OK"
```
Expected: `XML OK`. If Python isn't available, any XML-aware editor/linter check works — the goal is just to catch a mismatched tag before it fails 8000+ lines into a build.

---

### Task 3: Add the matching properties to the generated `Armada.cs` partial class

**Files:**
- Modify: `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\BDO\Armada.cs:62-64`

This file is normally regenerated by a T4 template reading the CSDL whenever the `.edmx` is saved in Visual Studio. There's no VS here, so it's hand-edited to exactly what that regeneration would produce from Task 2's CSDL additions — if this file and the CSDL ever drift, the next real "Update Model from Database" in VS will silently overwrite this file back to matching the CSDL, so keeping them in lockstep now avoids a surprise later.

- [ ] **Step 1: Add the 4 properties**

Find:
```csharp
        public string status_armada { get; set; }
    
        public virtual Transport Transport { get; set; }
```
Replace with:
```csharp
        public string status_armada { get; set; }
        public bool IsBlocked { get; set; }
        public Nullable<System.DateTime> BlockedOn { get; set; }
        public string BlockedBy { get; set; }
        public string BlockedReason { get; set; }
    
        public virtual Transport Transport { get; set; }
```
Type mapping from CSDL (Task 2 Step 2): `Boolean`/`Nullable="false"` → `bool`; `DateTime` (nullable, no `Nullable="false"`) → `Nullable<System.DateTime>`; `String` (nullable) → `string`. Matches the existing pattern in this same file (e.g. `updatedon` → `Nullable<System.DateTime> updatedon`).

---

### Task 4: Rebuild and verify the CS1061 errors are gone

**Files:** none (verification only)

- [ ] **Step 1: Full solution build**

Run:
```bash
cd "C:/Users/weka/Indigo/sistropigroup" && MSYS_NO_PATHCONV=1 "/c/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe" "SISTROAWESOME/SISTROAWESOME.csproj" -p:Configuration=Debug -t:Build -nologo -v:q > /c/Users/weka/AppData/Local/Temp/claude/c--Users-weka-Indigo-SISTROV2-next/e17cbd5d-6b30-4c56-b935-7b997f1d6e88/scratchpad/build2.log 2>&1; grep -E "error CS|Error\(s\)" /c/Users/weka/AppData/Local/Temp/claude/c--Users-weka-Indigo-SISTROV2-next/e17cbd5d-6b30-4c56-b935-7b997f1d6e88/scratchpad/build2.log
```
Expected: no output (no `error CS` lines — the 7 `CS1061` errors from the baseline are gone). If `Error(s)` summary line is captured, expect `0 Error(s)`.

This project's `vstest.console.exe` test discovery is broken in this environment (throws on every MSTest class, reproduces even on untouched pre-existing tests — see `docs/superpowers/plans/2026-07-16-armada-sumbu-master-validation.md`), so a clean MSBuild build (0 errors) plus the hand-traced checks in Task 5 are the project's established pass/fail signal here, in place of running the test runner.

- [ ] **Step 2: Confirm no new warnings were introduced on the touched lines**

Run:
```bash
grep -c "ArmadaController.cs" /c/Users/weka/AppData/Local/Temp/claude/c--Users-weka-Indigo-SISTROV2-next/e17cbd5d-6b30-4c56-b935-7b997f1d6e88/scratchpad/build2.log
```
Compare the count to `build1.log` (baseline, captured before this plan's changes) — should not have grown from new warnings on `Armada.cs`/`ArmadaController.cs`.

---

### Task 5: Hand-trace the two affected endpoints (no automated test runner available)

**Files:**
- Read: `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\ArmadaController.cs:58-75` (`GetOwnArmadaStatus`)
- Read: `c:\Users\weka\Indigo\sistropigroup\SISTROAWESOME\api\ArmadaController.cs:1901-1935` (`ToggleBlokir`)

- [ ] **Step 1: Trace `GetOwnArmadaStatus` (GET)**

Re-read lines 58-75. Confirm the `Select` projection (`IsBlocked = x.IsBlocked`, `BlockedReason = x.BlockedReason`, `BlockedOn = x.BlockedOn`) now resolves against the `Armada.IsBlocked`/`.BlockedReason`/`.BlockedOn` properties added in Task 3, and that those in turn are EF-mapped (Task 2) so the `Where(...).Select(...)` still translates to a single SQL query rather than throwing at runtime. Confirm the returned `ArmadaStatusItem.IsBlocked` is `bool` (matches `Armada.IsBlocked`'s new `bool` type, no null-handling needed).

- [ ] **Step 2: Trace `ToggleBlokir` (POST)**

Re-read lines 1908-1935. Confirm:
- `exist.IsBlocked = req.IsBlocked` — both `bool`, no cast needed.
- `exist.BlockedOn = req.IsBlocked ? gh.DateTimeNowSistro(myCompanyCode) : (DateTime?)null` — assigns into `Nullable<System.DateTime> BlockedOn`, types match.
- `exist.BlockedBy = req.IsBlocked ? User.Identity.Name : null` — assigns into `string BlockedBy`, types match.
- `exist.BlockedReason = req.IsBlocked ? req.Reason : null` — assigns into `string BlockedReason`, types match.
- `db.Entry(exist).State = EntityState.Modified; db.SaveChanges();` — since all 4 properties are now EF-mapped scalar properties (Task 2 Step 3), `SaveChanges` will include all 4 columns in its `UPDATE` statement.

- [ ] **Step 3: Confirm via `sqlcmd` that a live row can be toggled and reflects correctly (optional but cheap — only if the app is/can be running against SISTROSTAGING)**

If the API is deployed/running against `SISTROSTAGING`, exercise `POST /api/Armada/ToggleBlokir` with a real `ID` and `{"IsBlocked": true, "Reason": "test"}`, then:
```bash
"/c/Program Files/Microsoft SQL Server/Client SDK/ODBC/170/Tools/Binn/sqlcmd" -S "192.168.188.29,7869" -U usr_sistro_dev -P 'Si$tr0@Pupuk1!_d3v' -d SISTROSTAGING -Q "SELECT ID, is_blocked, blocked_on, blocked_by, blocked_reason FROM dbo.Armada WHERE ID = <the ID used>" -h -1
```
Expected: `is_blocked = 1`, `blocked_on` set, `blocked_by` set to the calling user, `blocked_reason = 'test'`. If the app isn't running/deployable in this environment, skip this step — Task 4's build pass plus this task's hand-trace are the available verification.

- [ ] **Step 4: Commit**

```bash
git -C "C:/Users/weka/Indigo/sistropigroup" add BDO/SistroEntities.edmx BDO/Armada.cs
git -C "C:/Users/weka/Indigo/sistropigroup" commit -m "fix: add Armada.IsBlocked/BlockedOn/BlockedBy/BlockedReason to EDMX (CS1061)"
```
(The DB migration in Task 1 is applied directly against `SISTROSTAGING` and isn't part of this commit — `docs/sql/10_add_armada_blokir_columns.sql` was already committed in a prior session per `docs/armada_blokir_columns_guide.md`.)

---

## Self-review notes

- **Spec coverage:** user asked (1) diagnose the CS1061 error — done via baseline build + root-cause trace above; (2) fix it; (3) add the DB column if missing — confirmed missing, Task 1 adds it; (4) don't touch/break the existing system — every SSDL/CSDL/MSL/`.cs` edit is a pure addition after the last existing property, no existing lines touched, full-solution build in Task 4 catches any regression across the whole `.csproj`, not just `ArmadaController.cs`.
- **Placeholder scan:** every step has literal file paths, literal XML/C# to insert, exact commands, and expected output — no "TBD"/"add validation"/"similar to Task N".
- **Type consistency:** `IsBlocked`(CSDL/MSL/`.cs`) / `is_blocked`(SSDL/DB) and the other 3 properties use identical names and types across all 4 layers (SQL → SSDL → CSDL → MSL → `Armada.cs`) and match exactly what `ArmadaController.cs` already calls (verified via `grep` — no other casing variant like `Is_Blocked` or `isBlocked` exists anywhere in the controller).
