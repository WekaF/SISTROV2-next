import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Halaman Tidak Ditemukan | SISTRO",
  description: "Halaman yang Anda cari tidak tersedia di Sistem SISTRO.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#050b14] px-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-lg w-full bg-white dark:bg-[#151f32] p-10 rounded-2xl shadow-2xl text-center border border-gray-100 dark:border-gray-800 relative z-10">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M12 21a9 9 0 100-18 9 9 0 000 18z" />
            </svg>
          </div>
        </div>

        <p className="text-sm font-bold tracking-widest text-brand-600 dark:text-brand-400 uppercase mb-2">
          Error 404
        </p>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Maaf, halaman yang Anda cari tidak tersedia, sudah dipindahkan, atau URL yang dimasukkan salah.
          Silakan kembali ke beranda atau hubungi admin jika masalah berlanjut.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 bg-brand-600 text-white rounded-md font-medium hover:bg-brand-700 transition-colors shadow-sm"
          >
            Ke Beranda
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            Ke Dashboard
          </Link>
        </div>

        <div className="pt-6 mt-8 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold">
            Sistem Scheduling Truck Online (SISTRO)
          </p>
        </div>
      </div>
    </div>
  );
}
