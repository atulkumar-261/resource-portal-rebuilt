import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useRMS } from "@/lib/store";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, Plus, Download } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Task } from "@/lib/types";

export const Route = createFileRoute("/admin/tasks")({ component: TasksPage });

function TasksPage() {
  const tasks = useRMS((s) => s.tasks);
  const resources = useRMS((s) => s.resources);
  const del = useRMS((s) => s.deleteTask);
  const router = useRouter();
  const [resourceFilter, setResourceFilter] = useState<string>("ALL");
  const filtered = resourceFilter === "ALL" ? tasks : tasks.filter((t) => t.resourceId === resourceFilter);

  const columns: ColumnDef<Task, any>[] = [
    { header: "Subject", accessorKey: "subject", cell: ({ getValue }) => <span className="line-clamp-1 max-w-md inline-block">{String(getValue())}</span> },
    { header: "Resource", accessorKey: "resourceName" },
    { header: "Project", accessorKey: "project" },
    { header: "Date", accessorKey: "startDate" },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <Badge variant="secondary" className="capitalize">{String(getValue())}</Badge> },
    { header: "Actions", id: "a", cell: ({ row }) => (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => router.navigate({ to: "/admin/tasks/$id", params: { id: row.original.id } })}><Eye className="w-4 h-4" /></Button>
        <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-rose-600"><Trash2 className="w-4 h-4" /></Button>} onConfirm={() => del(row.original.id)} />
      </div>
    )},
  ];

  return (
    <PageCard title="Task Updates" actions={
      <>
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Select Resource" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ALL</SelectItem>
            {resources.map((r) => <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline"><Download className="w-4 h-4" /> Download CSV</Button>
        <Link to="/admin/tasks/new"><Button size="sm"><Plus className="w-4 h-4" /> Create Task</Button></Link>
      </>
    }>
      <DataTable data={filtered} columns={columns} searchPlaceholder="Search tasks..." />
    </PageCard>
  );
}
