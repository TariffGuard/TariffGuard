import { AppShell } from "@/components/layout/app_shell";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
