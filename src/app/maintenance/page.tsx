import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sistem dalam Pemeliharaan | SISTRO",
  description: "Sistem SISTRO sedang dalam pemeliharaan rutin.",
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#050b14] px-4 relative overflow-hidden">
      {/* Visual background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="max-w-lg w-full bg-white dark:bg-[#151f32] p-10 rounded-2xl shadow-2xl text-center border border-gray-100 dark:border-gray-800 relative z-10">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">Sistem Sedang Pemeliharaan</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Kami sedang melakukan peningkatan performa dan pembaruan sistem secara rutin untuk memberikan pengalaman terbaik kepada Anda. Silakan kembali beberapa saat lagi.
        </p>
        
        <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-semibold">
            Sistem Scheduling Truck Online (SISTRO)
          </p>
        </div>
      </div>
    </div>
  );
}
