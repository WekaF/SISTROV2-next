# Dashboard Chart Plant Overflow Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 ViewerDashboard cards that become visually broken when there are more than 10 company plants — charts overflow their fixed containers and legends become unreadable.

**Architecture:** All changes are isolated to `src/components/dashboard/ViewerDashboard.tsx`. Three strategies: (1) dynamic chart height based on data length for horizontal bar charts, (2) top-N series grouping with "Lainnya" aggregate for the line chart, (3) expand/collapse toggle for the leaderboard table.

**Tech Stack:** React state/hooks, ApexCharts (`react-apexcharts`), Tailwind CSS, inline style for computed heights.

---

## File Structure

Only one file is modified:

- Modify: `src/components/dashboard/ViewerDashboard.tsx`
  - Add `PLANT_CHART_LIMIT = 8` constant (~line 382)
  - Add `showAllRankings` state (~line 71)
  - Apply top-N grouping in `trendPerPlant` useEffect (~lines 292–307)
  - Change fixed height divs to computed style for Durasi Muat chart (~line 1101)
  - Change fixed height divs to computed style for SLA Compliance chart (~line 1147)
  - Add expand/collapse toggle below leaderboard table (~line 1316)

---

### Task 1: Dynamic height for horizontal bar charts + PLANT_CHART_LIMIT constant

Horizontal bar charts (Durasi Muat and SLA Compliance) use fixed pixel heights (`h-[280px]`, `h-[290px]`). With 10+ plants each bar becomes a 2–3px sliver. Fix: compute height dynamically as `max(minHeight, plantCount * 44px)`.

**Files:**
- Modify: `src/components/dashboard/ViewerDashboard.tsx`

- [ ] **Step 1: Add PLANT_CHART_LIMIT constant**

Find the line (approximately line 381) that reads:
```typescript
const COLORS = ["#3C50E0", "#10B981", "#36B9CC", "#F59E0B", "#EF4444", "#858796", "#EC4899", "#8B5CF6"];
```

Add the constant immediately after it:
```typescript
const COLORS = ["#3C50E0", "#10B981", "#36B9CC", "#F59E0B", "#EF4444", "#858796", "#EC4899", "#8B5CF6"];
const PLANT_CHART_LIMIT = 8;
```

- [ ] **Step 2: Fix Avg Durasi Muat chart height**

Find the JSX block around line 1100 (inside the "Avg Durasi Bongkar Muat per Plant" Card):
```tsx
              <CardContent>
                <div className="h-[280px]">
                  <Chart
                    options={durasiMuatOptions}
                    series={durasiMuatSeries}
                    type="bar"
                    height="100%"
                    width="100%"
                  />
                </div>
              </CardContent>
```

Replace with:
```tsx
              <CardContent>
                <div style={{ height: `${Math.max(280, (durasiMuat?.length || 0) * 44)}px` }}>
                  <Chart
                    options={durasiMuatOptions}
                    series={durasiMuatSeries}
                    type="bar"
                    height="100%"
                    width="100%"
                  />
                </div>
              </CardContent>
```

- [ ] **Step 3: Fix SLA Compliance chart height**

Find the JSX block around line 1146 (inside the "SLA Compliance per Plant (30 Hari)" Card):
```tsx
              <CardContent>
                <div className="h-[290px]">
                  <Chart
                    options={slaOptions}
                    series={slaSeries}
                    type="bar"
                    height="100%"
                    width="100%"
                  />
                </div>
              </CardContent>
```

Replace with:
```tsx
              <CardContent>
                <div style={{ height: `${Math.max(290, (slaPerPlant?.length || 0) * 44)}px` }}>
                  <Chart
                    options={slaOptions}
                    series={slaSeries}
                    type="bar"
                    height="100%"
                    width="100%"
                  />
                </div>
              </CardContent>
```

- [ ] **Step 4: Verify visually**

Run `cd C:\Users\weka\Indigo\SISTROV2-next && npm run dev` and open `http://localhost:3000/dashboard`.

Check the "Avg Durasi Bongkar Muat per Plant" and "SLA Compliance per Plant" cards. With ≤6 plants (current fallback data) the height should remain at ~280–290px. Open browser devtools, find the wrapping div, verify its `style` attribute shows `height: 280px` (or similar).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/ViewerDashboard.tsx
git commit -m "fix: dynamic chart height for horizontal bar charts to support 10+ plants"
```

---

### Task 2: Top-N series grouping for Trend Tiket per Plant line chart

The line chart renders one series per plant. With 10+ plants the legend overflows and lines overlap making the chart unreadable. Fix: sort plants by total ticket volume, keep top `PLANT_CHART_LIMIT` (8), and aggregate the rest into one "Lainnya (N plant)" series.

**Files:**
- Modify: `src/components/dashboard/ViewerDashboard.tsx`

- [ ] **Step 1: Find the trendPerPlant useEffect block**

Locate the block around lines 292–307 that reads:

```typescript
    // ── Trend Per Plant ───────────────────────────────────────────────────────
    if (trendPlantRes?.status === "success" && Array.isArray(trendPlantRes.data) && trendPlantRes.data.length > 0) {
      const raw = trendPlantRes.data;
      const uniqueDates = Array.from(new Set<string>(raw.map((item: any) => item.Tanggal))).sort();
      const formattedDates = uniqueDates.map((d: string) =>
        new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
      );
      const plants = Array.from(new Set<string>(raw.map((item: any) => item.CompanyName || item.CompanyCode)));
      const series = plants.map((plant: string) => ({
        name: plant,
        data: uniqueDates.map((dateStr: string) => {
          const entry = raw.find((item: any) => (item.CompanyName || item.CompanyCode) === plant && item.Tanggal === dateStr);
          return entry ? (entry.TotalTiket || 0) : 0;
        }),
      }));
      setTrendPerPlant({ dates: formattedDates, series });
    }
```

- [ ] **Step 2: Replace with top-N grouping logic**

Replace the entire block above with:

```typescript
    // ── Trend Per Plant ───────────────────────────────────────────────────────
    if (trendPlantRes?.status === "success" && Array.isArray(trendPlantRes.data) && trendPlantRes.data.length > 0) {
      const raw = trendPlantRes.data;
      const uniqueDates = Array.from(new Set<string>(raw.map((item: any) => item.Tanggal))).sort();
      const formattedDates = uniqueDates.map((d: string) =>
        new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
      );
      const plants = Array.from(new Set<string>(raw.map((item: any) => item.CompanyName || item.CompanyCode)));
      const allSeries = plants.map((plant: string) => ({
        name: plant,
        data: uniqueDates.map((dateStr: string) => {
          const entry = raw.find((item: any) => (item.CompanyName || item.CompanyCode) === plant && item.Tanggal === dateStr);
          return entry ? (entry.TotalTiket || 0) : 0;
        }),
      }));

      // Cap at PLANT_CHART_LIMIT — sort by total tickets desc, group remainder as "Lainnya"
      const sorted = [...allSeries].sort(
        (a, b) => b.data.reduce((s, v) => s + v, 0) - a.data.reduce((s, v) => s + v, 0)
      );
      const topSeries = sorted.slice(0, PLANT_CHART_LIMIT);
      const rest = sorted.slice(PLANT_CHART_LIMIT);
      if (rest.length > 0) {
        const lainnyaData = formattedDates.map((_: string, i: number) =>
          rest.reduce((sum: number, s: any) => sum + (s.data[i] || 0), 0)
        );
        topSeries.push({ name: `Lainnya (${rest.length} plant)`, data: lainnyaData });
      }

      setTrendPerPlant({ dates: formattedDates, series: topSeries });
    }
```

- [ ] **Step 3: Verify PLANT_CHART_LIMIT is in scope**

The constant `PLANT_CHART_LIMIT` is defined inside the component function body (Task 1, Step 1), so it is accessible here inside the `useEffect` callback. Confirm the line `const PLANT_CHART_LIMIT = 8;` was added after `const COLORS = [...]` in Task 1.

- [ ] **Step 4: Verify visually**

The current fallback data has 3 plant series — no change expected. To validate the grouping logic works, temporarily change `PLANT_CHART_LIMIT` to `2` and reload. The chart legend should show exactly 2 named plants + "Lainnya (1 plant)". Revert back to `8` after confirming.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/ViewerDashboard.tsx
git commit -m "fix: cap Trend Tiket per Plant chart at 8 series, group excess as Lainnya"
```

---

### Task 3: Leaderboard table expand/collapse toggle

The Plant Performance Leaderboard renders all plants unconditionally. With 20+ plants the table becomes extremely long and buries the content below it. Fix: show top 10 rows by default with a toggle button to expand/collapse.

**Files:**
- Modify: `src/components/dashboard/ViewerDashboard.tsx`

- [ ] **Step 1: Add showAllRankings state**

Find the state declarations block (~line 69–71) that contains `activeDurasiTab` and `isExporting`:
```typescript
  const [durasiTickets, setDurasiTickets] = useState<{ longest: any[], fastest: any[] } | null>(null);
  const [activeDurasiTab, setActiveDurasiTab] = useState<"longest" | "fastest">("longest");
  const [isExporting, setIsExporting] = useState(false);
```

Add `showAllRankings` state:
```typescript
  const [durasiTickets, setDurasiTickets] = useState<{ longest: any[], fastest: any[] } | null>(null);
  const [activeDurasiTab, setActiveDurasiTab] = useState<"longest" | "fastest">("longest");
  const [isExporting, setIsExporting] = useState(false);
  const [showAllRankings, setShowAllRankings] = useState(false);
```

- [ ] **Step 2: Slice plantRanking in the table render**

Find the table body's `.map()` call (~line 1260):
```tsx
                  {plantRanking.map((plant: any, index: number) => {
```

Replace with:
```tsx
                  {(showAllRankings ? plantRanking : plantRanking.slice(0, 10)).map((plant: any, index: number) => {
```

- [ ] **Step 3: Add expand/collapse toggle button below the table**

Find the closing `</div>` of the table wrapper right before `</CardContent>` (~line 1315–1317):
```tsx
            </div>
          </CardContent>
        </Card>
```

Replace with:
```tsx
            </div>
            {plantRanking.length > 10 && (
              <div className="flex justify-center pt-4 pb-1">
                <button
                  onClick={() => setShowAllRankings(prev => !prev)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-brand-500 border border-brand-200 dark:border-brand-900/50 hover:bg-brand-50 dark:hover:bg-brand-950/20 rounded-xl transition-all"
                >
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${showAllRankings ? "rotate-90" : ""}`} />
                  {showAllRankings ? "Sembunyikan" : `Tampilkan Semua (${plantRanking.length} Plant)`}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
```

- [ ] **Step 4: Verify visually**

With the current fallback data (6 plants), the toggle button should NOT appear (6 ≤ 10). To test the toggle, temporarily change the `slice(0, 10)` to `slice(0, 3)` and confirm the button appears and works. Revert after confirming.

Verify `ChevronRight` is already imported — it is, at the top of the file in the lucide-react import block.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/ViewerDashboard.tsx
git commit -m "fix: leaderboard table shows top 10 by default with expand/collapse toggle"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Covered by |
|-------------|------------|
| Trend Tiket per Plant — fix for 10+ plants | Task 2 (top-N series + Lainnya grouping) |
| Plant Performance Leaderboard — fix for 10+ plants | Task 3 (expand/collapse toggle) |
| Avg Durasi Bongkar Muat — fix for 10+ plants | Task 1 (dynamic height) |
| SLA Compliance per Plant — fix for 10+ plants | Task 1 (dynamic height) |

**Placeholder scan:** No TBDs, all code blocks are complete.

**Type consistency:** 
- `PLANT_CHART_LIMIT` defined in Task 1, used in Task 2 — consistent.
- `showAllRankings` defined in Task 3 Step 1, used in Steps 2 and 3 — consistent.
- `plantRanking` is `any[]` — `.slice(0, 10)` on any[] is valid.
- `topSeries.push(...)` — `topSeries` is typed as `Array<{name: string, data: number[]}>` from the `sorted.slice()` call. The Lainnya push matches the same shape — consistent.
