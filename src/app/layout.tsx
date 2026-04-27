import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import AuthProvider from "@/components/auth/AuthProvider";
import { AuthProvider as LegacyAuthProvider } from "@/context/auth-context";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "SISTRO | Logistics Management System",
  description: "Advanced Logistics and Inventory Management System",
};

import { ToastProvider } from "@/components/ui/toast";
import QueryProvider from "@/providers/QueryProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} font-outfit antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <LegacyAuthProvider>
            <ThemeProvider>
              <SidebarProvider>
                <QueryProvider>
                  <ToastProvider>
                    <LayoutWrapper>
                      {children}
                    </LayoutWrapper>
                  </ToastProvider>
                </QueryProvider>
              </SidebarProvider>
            </ThemeProvider>
          </LegacyAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
