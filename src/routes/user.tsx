import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/user")({
  component: UserLayout,
});

function UserLayout() {
  const role = useAuth((s) => s.role);
  if (typeof window !== "undefined" && role !== "user") {
    setTimeout(() => { window.location.href = "/login"; }, 0);
  }
  return (
    <AppShell role="user">
      <Outlet />
    </AppShell>
  );
}
