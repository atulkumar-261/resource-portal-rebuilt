import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRMS } from "@/lib/store";
import type { ColumnDef } from "@tanstack/react-table";
import type { Leave } from "@/lib/types";

export const Route = createFileRoute("/admin/leaves")({ component: LeavesPage });

function LeavesPage() {
  const leaves = useRMS((s) => s.leaves);
  const updateLeave = useRMS((s) => s.updateLeave);
  const del = useRMS((s) => s.deleteLeave);
  const columns: ColumnDef<Leave, any>[] = [
    { header: "Resource", accessorKey: "resourceName" },
    { header: "From", accessorKey: "fromDate" },
    { header: "To", accessorKey: "toDate" },
    { header: "Days", accessorKey: "totalDays" },
    { header: "Type", accessorKey: "type" },
    { header: "Reason", accessorKey: "reason" },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => {
      const v = String(getValue());
      const color = v === "approved" ? "bg-emerald-100 text-emerald-700" : v === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700";
      return <Badge className={`${color} capitalize`}>{v}</Badge>;
    }},
    { header: "Actions", id: "a", cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.status === "pending" && (
          <>
            <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300" onClick={() => updateLeave(row.original.id, { status: "approved" })}>Approve</Button>
            <Button size="sm" variant="outline" className="text-rose-700 border-rose-300" onClick={() => updateLeave(row.original.id, { status: "rejected" })}>Reject</Button>
          </>
        )}
        <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => del(row.original.id)}>Delete</Button>
      </div>
    )},
  ];
  return (
    <PageCard title="Leave Manager">
      <DataTable data={leaves} columns={columns} searchPlaceholder="Search leaves..." />
    </PageCard>
  );
}
