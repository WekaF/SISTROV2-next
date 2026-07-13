"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useApi } from "@/hooks/use-api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, BarChart3, TrendingUp, Calendar, Filter } from "lucide-react";
import { format } from "date-fns";
import Badge from "@/components/ui/badge/Badge";
import { DataTable, DataTableColumn, DataTableParams } from "@/components/ui/DataTable";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/SearchableSelect";

// Load ApexCharts dynamically to prevent SSR errors
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface TiketRow {
  bookingno: string;
  tiketno?: string;
  posto?: string;
  tanggalPOSTO?: string;
  qtyPOSTO?: number;
  qty?: number;
  tanggalString?: string;
  shift?: string;
  produkString?: string;
  transportString?: string;
  asal?: string;
  tujuan?: string;
  Kabupaten?: string;
  nopol?: string;
  driver?: string;
  statuspemuatan?: string;
  position?: string;
  positionString?: string;
  string_timesec?: string;
  string_timekosong?: string;
  string_timegudang?: string;
  string_timemuat?: string;
  string_timeisi?: string;
  string_timeout?: string;
  updatedonString?: string;
  donumber?: string;
}

interface PlantOption {
  company: string;
  company_code: string;
}

interface ProductOption {
  ID: string;
  Nama: string;
}

const POSITION_BADGE: Record<string, "info" | "warning" | "success" | "error" | "default"> = {
  "01": "info",
  "02": "warning",
  "03": "warning",
  "04": "info",
  "05": "success",
  "06": "success",
  "07": "error",
};

export default function TiketDashboardPage() {
  const { apiJson, apiTable, token } = useApi();

  // Form input states (temporary filters) - Start Date & End Date default to null/empty string
  const [tempCompany, setTempCompany] = useState("PKG"); // default PKG (Petrokimia Gresik)
  const [tempSD, setTempSD] = useState("");
  const [tempED, setTempED] = useState("");
  const [tempProduct, setTempProduct] = useState("all");
  const [tempPosition, setTempPosition] = useState("all");

  // Applied states (used by DataTable queryKey & fetcher)
  const [appliedCompany, setAppliedCompany] = useState("PKG");
  const [appliedSD, setAppliedSD] = useState("");
  const [appliedED, setAppliedED] = useState("");
  const [appliedProduct, setAppliedProduct] = useState("all");
  const [appliedPosition, setAppliedPosition] = useState("all");

  // Chart-specific product mapping state
  const [selectedProductChart, setSelectedProductChart] = useState("all");

  // Options lists states
  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  // Chart data states
  const [chartData, setChartData] = useState<{
    categories: string[];
    kuota: number[];
    shift1: number[];
    shift2: number[];
    shift3: number[];
  } | null>(null);
  const [chartLoading, setChartLoading] = useState(false);

  // Fetch plant list from getCompanyListFitur
  useEffect(() => {
    if (!token) return;
    apiJson<PlantOption[]>("/api/Company/getCompanyListFitur")
      .then((data) => {
        if (data && data.length > 0) {
          setPlants(data);
          const existsPKG = data.some((p) => p.company_code === "PKG");
          if (!existsPKG) {
            setTempCompany(data[0].company_code);
            setAppliedCompany(data[0].company_code);
          }
        }
      })
      .catch(console.error);
  }, [apiJson, token]);

  // Fetch product list specifically from ProdukMappingList (tabel produk mapping) when tempCompany changes
  useEffect(() => {
    if (!tempCompany) return;
    apiJson<any[]>(`/api/ProdukMapping/ProdukMappingList?company_code=${tempCompany}`)
      .then((data) => {
        if (data && data.length > 0) {
          const mapped = data.map((item) => ({
            ID: item.ID,
            Nama: `${item.Kode} - ${item.Nama}`,
          }));
          setProducts(mapped);
        } else {
          setProducts([]);
        }
      })
      .catch(() => setProducts([]));
    
    setTempProduct("all");
    setSelectedProductChart("all");
  }, [tempCompany, apiJson]);

  // Fetch chart statistics from filterChartDashboard
  const fetchChartData = useCallback(async (companyCode: string, productId: string) => {
    if (!companyCode) return;
    setChartLoading(true);
    try {
      const res = await apiTable("/api/Home/filterChartDashboard", {
        company: companyCode,
        idproduk: productId,
      });

      if (res && res.json && res.date) {
        const json = res.json as any[];
        const date = res.date as string[];

        setChartData({
          categories: date,
          kuota: json.map((item) => item.kuota ?? 0),
          shift1: json.map((item) => item.shift1 ?? 0),
          shift2: json.map((item) => item.shift2 ?? 0),
          shift3: json.map((item) => item.shift3 ?? 0),
        });
      } else {
        setChartData(null);
      }
    } catch (err) {
      console.error("Error fetching chart data:", err);
      setChartData(null);
    } finally {
      setChartLoading(false);
    }
  }, [apiTable]);

  // Initial load for chart data
  useEffect(() => {
    if (appliedCompany) {
      fetchChartData(appliedCompany, selectedProductChart);
    }
  }, [appliedCompany, selectedProductChart, fetchChartData]);

  // Handle Search / Filter Submit
  const handleFilter = () => {
    setAppliedCompany(tempCompany);
    setAppliedSD(tempSD);
    setAppliedED(tempED);
    setAppliedProduct(tempProduct);
    setAppliedPosition(tempPosition);
  };

  // Convert plants and products to SearchableSelect options format
  const plantOptions = useMemo(() => {
    return plants.map((p) => ({
      value: p.company_code,
      label: `${p.company_code} - ${p.company}`,
    }));
  }, [plants]);

  const productOptions = useMemo(() => {
    const list = products.map((p) => ({
      value: p.ID,
      label: p.Nama,
    }));
    return [{ value: "all", label: "All Produk" }, ...list];
  }, [products]);

  // DataTable custom fetcher
  const tableFetcher = useCallback(async (params: DataTableParams) => {
    const res = await apiTable("/api/Tiket/DataTableFilterLegacy", {
      draw: params.draw,
      start: params.start,
      length: params.length,
      search: { value: params.search, regex: false },
      SD: appliedSD,
      ED: appliedED,
      companyCode: appliedCompany,
      produk: appliedProduct === "all" ? "" : appliedProduct,
      position: appliedPosition === "all" ? "" : appliedPosition,
      order: params.order?.length ? params.order : [{ column: 10, dir: "desc" }],
      columns: [
        { data: "bookingno", name: "bookingno", searchable: true, orderable: true },
        { data: "posto", name: "posto", searchable: true, orderable: true },
        { data: "tanggalString", name: "tanggal", searchable: true, orderable: true },
        { data: "nopol", name: "nopol", searchable: true, orderable: true },
        { data: "driver", name: "driver", searchable: true, orderable: true },
        { data: "produkString", name: "idproduk", searchable: true, orderable: true },
        { data: "transportString", name: "idtransport", searchable: true, orderable: true },
        { data: "tujuan", name: "tujuan", searchable: true, orderable: true },
        { data: "positionString", name: "positionString", searchable: true, orderable: true },
        { data: "position", name: "position", searchable: true, orderable: true },
        { data: "updatedon", name: "updatedon", searchable: true, orderable: true },
      ],
    });

    return {
      data: res?.data ?? [],
      recordsTotal: res?.recordsTotal ?? 0,
      recordsFiltered: res?.recordsFiltered ?? 0,
    };
  }, [apiTable, appliedSD, appliedED, appliedCompany, appliedProduct, appliedPosition]);

  // DataTable Columns configuration matching IndexPi.cshtml
  const columns: DataTableColumn<TiketRow>[] = [
    {
      key: "number",
      header: "No.",
      render: (_, idx) => idx + 1,
      headerClassName: "w-[50px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "posto",
      header: "POSTO",
      className: "font-semibold text-gray-800 dark:text-gray-200",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 1,
    },
    {
      key: "tanggalPOSTO",
      header: "Tanggal POSTO",
      className: "text-slate-500",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "qtyPOSTO",
      header: "Tonase POSTO",
      render: (row) => row.qtyPOSTO ? `${row.qtyPOSTO.toLocaleString()} Ton` : "-",
      headerClassName: "w-[120px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "qty",
      header: "Tonase",
      render: (row) => row.qty ? `${row.qty.toLocaleString()} Ton` : "-",
      className: "font-semibold text-blue-600 dark:text-blue-400",
      headerClassName: "w-[120px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "tanggalString",
      header: "Tanggal",
      className: "text-slate-500",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 2,
    },
    {
      key: "shift",
      header: "Shift",
      render: (row) => row.shift ? (
        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-[11px]">
          {row.shift}
        </span>
      ) : "-",
      headerClassName: "w-[80px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "produkString",
      header: "Produk",
      headerClassName: "w-[220px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 5,
    },
    {
      key: "transportString",
      header: "Transportir",
      headerClassName: "w-[200px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 6,
    },
    {
      key: "asal",
      header: "Asal",
      headerClassName: "w-[180px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "tujuan",
      header: "Tujuan",
      headerClassName: "w-[180px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 7,
    },
    {
      key: "Kabupaten",
      header: "Kabupaten Tujuan",
      headerClassName: "w-[180px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "nopol",
      header: "Nopol",
      className: "font-bold text-gray-800 dark:text-gray-200",
      headerClassName: "w-[120px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 3,
    },
    {
      key: "driver",
      header: "Driver",
      headerClassName: "w-[120px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 4,
    },
    {
      key: "statuspemuatan",
      header: "Status Pemuatan",
      headerClassName: "w-[120px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "positionString",
      header: "Posisi",
      render: (row) => row.positionString ? (
        <Badge
          color={POSITION_BADGE[row.position ?? ""] ?? "default"}
          size="sm"
          variant="light"
        >
          {row.positionString}
        </Badge>
      ) : "-",
      headerClassName: "w-[180px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 8,
    },
    {
      key: "string_timesec",
      header: "Security In",
      className: "font-mono text-slate-500",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "string_timekosong",
      header: "Timbangan Kosong",
      className: "font-mono text-slate-500",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "string_timegudang",
      header: "Tiba Digudang",
      className: "font-mono text-slate-500",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "string_timemuat",
      header: "Pemuatan",
      className: "font-mono text-slate-500",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "string_timeisi",
      header: "Timbangan Isi",
      className: "font-mono text-slate-500",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "string_timeout",
      header: "Security Out",
      className: "font-mono text-slate-500",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "updatedonString",
      header: "Tanggal Pemuatan",
      className: "text-slate-500",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
    {
      key: "bookingno",
      header: "Kode SISTRO",
      className: "font-bold text-blue-600 dark:text-blue-400 font-mono",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
      sortColumn: 0,
    },
    {
      key: "donumber",
      header: "Nomor DO",
      headerClassName: "w-[150px] py-3 text-left font-black uppercase text-gray-400 text-[10px] tracking-wider",
    },
  ];

  // Chart configuration for ApexCharts
  const chartSeries = chartData ? [
    {
      name: "Kuota",
      type: "area",
      data: chartData.kuota
    },
    {
      name: "Shift 1",
      type: "column",
      data: chartData.shift1
    },
    {
      name: "Shift 2",
      type: "column",
      data: chartData.shift2
    },
    {
      name: "Shift 3",
      type: "column",
      data: chartData.shift3
    }
  ] : [];

  const chartOptions = {
    chart: {
      fontFamily: "inherit",
      toolbar: { show: false },
      stacked: false,
    },
    stroke: {
      width: [2, 0, 0, 0],
      curve: "smooth" as const
    },
    plotOptions: {
      bar: {
        columnWidth: "60%",
        borderRadius: 4
      }
    },
    fill: {
      opacity: [0.15, 0.85, 0.85, 0.85],
    },
    colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"],
    xaxis: {
      categories: chartData?.categories || [],
      labels: {
        style: {
          fontSize: "11px",
          colors: "#64748b"
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          fontSize: "11px",
          colors: "#64748b"
        }
      }
    },
    legend: {
      position: "top" as const,
      fontSize: "12px",
      fontWeight: 500,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (v: number) => `${v.toLocaleString()} tiket`
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard Tiket</h1>
          <p className="text-sm text-muted-foreground">Monitor realisasi tiket &amp; kuota produk secara real-time</p>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border shadow-sm space-y-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <Filter className="h-3 w-3" /> Form Pencarian / Filter
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
          {/* Company / Plant Selector with Searchable Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Company / Plant</label>
            <SearchableSelect
              options={plantOptions}
              value={tempCompany}
              onChange={(val) => setTempCompany(val)}
              placeholder="Pilih Plant..."
              searchPlaceholder="Cari berdasarkan kode/nama plant..."
            />
          </div>

          {/* Date range - Start Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Tanggal Mulai</label>
            <Input
              type="date"
              value={tempSD}
              onChange={(e) => setTempSD(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Date range - End Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Tanggal Selesai</label>
            <Input
              type="date"
              value={tempED}
              onChange={(e) => setTempED(e.target.value)}
              className="h-10"
            />
          </div>

          {/* Product Filter with Searchable Dropdown (ambil dari tabel produk mapping) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Produk</label>
            <SearchableSelect
              options={productOptions}
              value={tempProduct}
              onChange={(val) => setTempProduct(val)}
              placeholder="Pilih Produk..."
              searchPlaceholder="Cari berdasarkan kode/nama produk..."
            />
          </div>

          {/* Position Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Posisi Tiket</label>
            <select
              value={tempPosition}
              onChange={(e) => setTempPosition(e.target.value)}
              className="w-full h-10 border rounded-lg px-3 text-sm bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Posisi</option>
              <option value="01">Armada sampai di Security Pass</option>
              <option value="02">Armada sampai di Timbang Kosong</option>
              <option value="03">Armada tiba di Gudang</option>
              <option value="04">Checkout Gudang Pemuatan</option>
              <option value="06">Armada telah melewati Timbang Isi</option>
              <option value="07">Armada telah melewati Security Out</option>
            </select>
          </div>
        </div>

        {/* Filter Action Button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleFilter} className="w-full sm:w-auto h-10 px-6 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm">
            <Search className="h-4 w-4 mr-2" />
            Cari / Filter Laporan
          </Button>
        </div>
      </div>

      {/* 📋 DATATABLE DI ATAS (TABLE REALISASI TIKET) */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Realisasi Tiket</h2>
            </div>
            {/* Standard label requested by the user: *Tahun 2026 */}
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-400 font-medium">
              <Calendar className="h-3 w-3" />
              <span>*Tahun 2026</span>
            </div>
          </div>
        </div>

        {/* Reusable robust DataTable component with built-in paging/column filter/global search */}
        <div className="rounded-lg border overflow-hidden">
          <DataTable
            columns={columns}
            queryKey={["tiket-dashboard", appliedCompany, appliedSD, appliedED, appliedProduct, appliedPosition]}
            fetcher={tableFetcher}
            rowKey={(row) => row.bookingno}
            searchPlaceholder="Cari berdasarkan POSTO, booking no, nopol, driver..."
            emptyText="Tidak ada data realisasi tiket."
          />
        </div>
      </div>

      {/* 📊 GRAFIK DI BAWAH (STATISTIK REALISASI PRODUK & SHIFT) */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                  Grafik Realisasi Tiket 30 Hari Terakhir
                </h2>
                <p className="text-xs text-muted-foreground">Kuota harian (Area) vs Tiket Terpesan per Shift (Bar)</p>
              </div>
            </div>

            {/* Product Mapping Dropdown Selector specifically for the Chart */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Filter Produk Chart:</label>
              <SearchableSelect
                options={productOptions}
                value={selectedProductChart}
                onChange={(val) => setSelectedProductChart(val)}
                placeholder="Pilih Produk..."
                searchPlaceholder="Cari produk chart..."
                className="w-56"
              />
            </div>
            
            {/* Dynamic plant label */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Plant: {plants.find((p) => p.company_code === appliedCompany)?.company || appliedCompany}
              </span>
            </div>
          </div>

          <div className="relative min-h-[300px] flex items-center justify-center">
            {chartLoading ? (
              <div className="flex flex-col items-center gap-2 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-xs text-muted-foreground font-medium">Memuat statistik grafik...</span>
              </div>
            ) : chartData ? (
              <div className="w-full h-[320px]">
                <Chart
                  options={chartOptions as any}
                  series={chartSeries}
                  type="line"
                  height="100%"
                />
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Tidak ada data grafik statistik untuk plant ini.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
