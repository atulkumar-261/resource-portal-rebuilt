import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/user")({
  component: () => (
    <AppShell role="user">
      <Outlet />
    </AppShell>
  ),
});
