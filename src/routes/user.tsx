import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/user")({
  beforeLoad: () => {
    const { token, role } = useAuth.getState();
    if (!token || role !== "user") {
      throw redirect({ to: "/login" });
    }
  },
  component: () => (
    <AppShell role="user">
      <Outlet />
    </AppShell>
  ),
});
