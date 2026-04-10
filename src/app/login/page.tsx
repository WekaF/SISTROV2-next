import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Login | SISTRO",
  description: "Sign in to SISTRO Logistics Management System",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full bg-white dark:bg-gray-900">
      {/* Sign In Form */}
      <div className="flex flex-col justify-center w-full p-6 lg:w-1/2 sm:p-10">
        <SignInForm />
      </div>

      {/* Side Image / Illustration Area */}
      <div className="relative hidden w-1/2 lg:block bg-gray-50 dark:bg-dark-900 overflow-hidden">
        <div className="absolute inset-0 bg-brand-600/5 dark:bg-brand-600/10 z-10"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center z-20">
          <div className="max-w-md">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              Logistics Reimagined
            </h2>
            <p className="mb-10 text-gray-500 dark:text-gray-400">
              Manage your fleet, tickets, and stock with the most advanced logistics platform. Built for efficiency, scale, and performance.
            </p>
            <div className="relative w-full aspect-square max-w-sm mx-auto">
               <Image 
                src="/images/logo/logo-icon.svg" 
                alt="Illustration" 
                fill 
                className="object-contain opacity-20 grayscale"
              />
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
