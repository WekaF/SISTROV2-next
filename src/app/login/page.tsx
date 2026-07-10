import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Login | SISTRO",
  description: "Sign in to SISTRO (Sistem Scheduling Truk Online)",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-white dark:bg-[#151f32]">
      {/* Left Column: Visual Area with the Image */}
      <div className="relative hidden w-full lg:flex lg:w-[55%] flex-col justify-between p-12 text-white">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://storage.googleapis.com/pkg-portal-bucket/images/slideshow-home/pg_kantorpusat_kawasanhijau.jpg')" }}
        />
        {/* Overlays to make text readable while keeping image bright */}
        <div className="absolute inset-0 z-10 bg-blue-900/40 mix-blend-multiply" />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />

        {/* Content over image */}
        <div className="relative z-20 flex items-center gap-4"></div>
        <div className="relative z-20 max-w-2xl mt-auto pb-8">
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white drop-shadow-md leading-tight">
            Sistem Scheduling Truck Online
          </h1>
          <p className="text-lg text-blue-50 font-medium max-w-lg leading-relaxed drop-shadow-sm">
            Pupuk Indonesia Group.
          </p>
        </div>
      </div>

      {/* Right Column: Auth Form Area (Light/Dark Theme) */}
      <div className="flex flex-col justify-center w-full lg:w-[45%] p-6 sm:p-12 relative z-20 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] border-l border-white/20 dark:border-white/5">

        {/* Soft background glow effects */}
        <div className="absolute top-0 right-0 -mt-32 -mr-32 w-96 h-96 rounded-full bg-brand-400/10 dark:bg-brand-500/10 blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 -mb-32 -ml-32 w-96 h-96 rounded-full bg-indigo-400/10 dark:bg-indigo-500/10 blur-3xl pointer-events-none animate-pulse-glow" style={{ animationDelay: '1s' }} />

        <div className="w-full max-w-[420px] mx-auto relative z-30 p-4 sm:p-8 bg-transparent sm:bg-white/40 sm:dark:bg-white/[0.02] sm:backdrop-blur-xl sm:border border-white/30 dark:border-white/5 rounded-3xl sm:shadow-xl">
          <Suspense>
            <SignInForm />
          </Suspense>
        </div>

        {/* Version Tag */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 z-20">
          <div className="px-3 py-1 text-[11px] text-gray-400 dark:text-gray-500 font-mono tracking-wider">
            Versi 2.0.0
          </div>
        </div>
      </div>
    </div>
  );
}
