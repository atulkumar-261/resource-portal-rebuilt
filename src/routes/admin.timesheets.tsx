import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/timesheets")({
  component: () => <Outlet />,
});
