import { createFileRoute, Link } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useRMS } from "@/lib/store";
import type { ColumnDef } from "@tanstack/react-table";
import type { Payslip } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/payslips")({ component: PayslipsPage });

function PayslipsPage() {
  const payslips = useRMS((s) => s.payslips);
  const del = useRMS((s) => s.deletePayslip);
  const columns: ColumnDef<Payslip, any>[] = [
    { header: "User", accessorKey: "resourceName" },
    { header: "Payslip Month", accessorKey: "month" },
    { header: "Number of Days", accessorKey: "days" },
    { header: "Amount", accessorKey: "amount", cell: ({ getValue }) => `£${Number(getValue()).toLocaleString()}` },
    { header: "Notes", accessorKey: "notes" },
    { header: "Actions", id: "a", cell: ({ row }) => (
      <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-rose-600"><Trash2 className="w-4 h-4" /></Button>} onConfirm={() => del(row.original.id)} />
    )},
  ];
  return (
    <PageCard title="Pay Slips List" actions={<Link to="/admin/payslips/new"><Button size="sm"><Plus className="w-4 h-4" /> Create Payslip</Button></Link>}>
      <DataTable data={payslips} columns={columns} />
    </PageCard>
  );
}
