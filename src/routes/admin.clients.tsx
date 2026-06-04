import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useRMS } from "@/lib/store";
import type { ColumnDef } from "@tanstack/react-table";
import type { Client } from "@/lib/types";
import { Eye, Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/clients")({ component: ClientsPage });

function ClientsPage() {
  const clients = useRMS((s) => s.clients);
  const deleteClient = useRMS((s) => s.deleteClient);
  const router = useRouter();
  const columns: ColumnDef<Client, any>[] = [
    { header: "Name", accessorKey: "name" },
    { header: "Contact Person", accessorKey: "contactPerson" },
    { header: "Email", accessorKey: "email" },
    { header: "Phone", accessorKey: "phone" },
    { header: "Actions", id: "actions", cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => router.navigate({ to: "/admin/clients/$id", params: { id: row.original.id } })}><Eye className="w-4 h-4" /></Button>
        <Button size="sm" variant="ghost" onClick={() => router.navigate({ to: "/admin/clients/$id/edit", params: { id: row.original.id } })}><Pencil className="w-4 h-4" /></Button>
        <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-rose-600"><Trash2 className="w-4 h-4" /></Button>} onConfirm={() => deleteClient(row.original.id)} />
      </div>
    )},
  ];
  return (
    <PageCard title="Clients" actions={<Link to="/admin/clients/new"><Button size="sm"><Plus className="w-4 h-4" /> New Client</Button></Link>}>
      <DataTable data={clients} columns={columns} searchPlaceholder="Search clients..." />
    </PageCard>
  );
}
