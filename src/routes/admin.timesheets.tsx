import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRMS } from "@/lib/store";
import type { ColumnDef } from "@tanstack/react-table";
import type { Timesheet } from "@/lib/types";

export const Route = createFileRoute("/admin/timesheets")({ component: AdminTimesheets });

function AdminTimesheets() {
  const timesheets = useRMS((s) => s.timesheets);
  const columns: ColumnDef<Timesheet, any>[] = [
    { header: "Week #", accessorKey: "weekNumber" },
    { header: "Week End Date", accessorKey: "weekEndDate" },
    { header: "Resource", accessorKey: "resourceName" },
    { header: "Total Hours", accessorKey: "totalHours" },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <Badge variant="secondary" className="capitalize">{String(getValue())}</Badge> },
    { header: "Action", id: "action", cell: () => <Button size="sm" variant="link">View</Button> },
  ];
  return (
    <PageCard title="All Timesheets">
      <DataTable data={timesheets} columns={columns} searchPlaceholder="Search timesheets..." />
    </PageCard>
  );
}
