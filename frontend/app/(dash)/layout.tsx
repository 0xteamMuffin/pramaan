import { AppShell } from "@/components/layout/AppShell";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
