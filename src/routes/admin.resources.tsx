import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Trash2, Eye, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/resources")({ component: ResourcesPage });

function ResourcesPage() {
  const resources = useRMS((s) => s.resources);
  const del = useRMS((s) => s.deleteResource);
  const router = useRouter();
  const [q, setQ] = useState("");
  const filtered = resources.filter((r) => r.status === "active" && (r.fullName.toLowerCase().includes(q.toLowerCase()) || r.jobTitle.toLowerCase().includes(q.toLowerCase())));
  return (
    <PageCard title="Resources" actions={
      <>
        <Link to="/admin/resources/pending"><Button size="sm" variant="outline">Pending Resources</Button></Link>
      </>
    }>
      <div className="flex items-center justify-between mb-4 gap-3">
        <Input placeholder="Search resources..." className="max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((r) => (
          <div key={r.id} className="border border-slate-200 bg-white rounded-md p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center">{r.fullName.charAt(0)}</div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{r.fullName}</div>
                <div className="text-xs text-slate-500 truncate">{r.jobTitle}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-600 truncate">{r.email}</div>
            <div className="mt-1 text-xs text-slate-500">ID: {r.employeeId}</div>
            <div className="mt-3 flex justify-between gap-2">
              <Button size="sm" variant="outline" onClick={() => router.navigate({ to: "/admin/resources/$id", params: { id: r.id } })}><Eye className="w-4 h-4" /> View</Button>
              <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-rose-600"><Trash2 className="w-4 h-4" /></Button>} onConfirm={() => del(r.id)} />
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-slate-500">No records found</p>}
      </div>
    </PageCard>
  );
}
