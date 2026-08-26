import type { Metadata } from "next";
import { AuthProvider } from "@/context/auth_context";
import "./globals.css";

export const metadata: Metadata = {
  title: "TariffGuard",
  description: "AI-Powered Energy & Production Optimization Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="fabric-background antialiased min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
