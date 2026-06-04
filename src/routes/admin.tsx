import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const role = useAuth((s) => s.role);
  if (typeof window !== "undefined" && role !== "admin") {
    // soft redirect
    setTimeout(() => {
      window.location.href = "/login";
    }, 0);
  }
  return (
    <AppShell role="admin">
      <Outlet />
    </AppShell>
  );
}
