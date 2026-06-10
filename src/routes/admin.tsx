import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    const { token, role } = useAuth.getState();
    if (!token || (role !== "admin" && role !== "super_admin")) {
      throw redirect({ to: "/login" });
    }
  },
  component: () => (
    <AppShell role="admin">
      <Outlet />
    </AppShell>
  ),
});
