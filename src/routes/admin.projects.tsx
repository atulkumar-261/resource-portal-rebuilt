import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useRMS } from "@/lib/store";
import { Pencil, Trash2, Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Project } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/projects")({ component: ProjectsPage });

function ProjectsPage() {
  const projects = useRMS((s) => s.projects);
  const del = useRMS((s) => s.deleteProject);
  const router = useRouter();
  const columns: ColumnDef<Project, any>[] = [
    { header: "Project", accessorKey: "name" },
    { header: "Client", accessorKey: "client" },
    { header: "Start", accessorKey: "startDate" },
    { header: "End", accessorKey: "endDate" },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <Badge variant="secondary" className="capitalize">{String(getValue())}</Badge> },
    { header: "Actions", id: "a", cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => router.navigate({ to: "/admin/projects/$id/edit", params: { id: row.original.id } })}><Pencil className="w-4 h-4" /></Button>
        <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-rose-600"><Trash2 className="w-4 h-4" /></Button>} onConfirm={() => del(row.original.id)} />
      </div>
    )},
  ];
  return (
    <PageCard title="Projects" actions={<Link to="/admin/projects/new"><Button size="sm"><Plus className="w-4 h-4" /> New Project</Button></Link>}>
      <DataTable data={projects} columns={columns} />
    </PageCard>
  );
}
