import type { Metadata } from "next";
import "@fontsource-variable/outfit";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { CompanyProvider } from "@/context/CompanyContext";
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import AuthProvider from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/toast";
import QueryProvider from "@/providers/QueryProvider";

export const metadata: Metadata = {
  title: "SISTRO | Logistics Management System",
  description: "Advanced Logistics and Inventory Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-outfit antialiased" suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider>
            <SidebarProvider>
              <QueryProvider>
                <CompanyProvider>
                  <ToastProvider>
                    <LayoutWrapper>
                      {children}
                    </LayoutWrapper>
                  </ToastProvider>
                </CompanyProvider>
              </QueryProvider>
            </SidebarProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
