# Armada blokir columns — deployment guide

## What
Adds 4 columns to `dbo.Armada`: `is_blocked` (bit, default 0), `blocked_on`,
`blocked_by`, `blocked_reason`. Backs the new admin "blokir armada" feature.

## How to apply
1. Run `armada_blokir_columns.sql` against the target SQL Server database (SSMS).
2. Open `SISTROAWESOME/SISTROAWESOME.sln` in Visual Studio.
3. Open `SISTROAWESOME/BDO/SistroEntities.edmx`, right-click the design
   surface → "Update Model from Database" → Refresh tab → check `Armada` →
   Finish. This regenerates `BDO/Armada.cs` with the 4 new properties.
4. Rebuild the solution, redeploy the API.
5. No app restart needed for the SQL step alone, but the API must be
   rebuilt/redeployed to pick up the new EF-mapped columns.
