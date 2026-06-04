import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, useRMS } from "@/lib/store";

export const Route = createFileRoute("/user/tasks")({ component: () => {
  const resourceId = useAuth((s) => s.resourceId) ?? "177";
  const tasks = useRMS((s) => s.tasks.filter((t) => t.resourceId === resourceId));
  const router = useRouter();
  return (
    <PageCard title="Task Updates">
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-100"><tr><th className="text-left px-3 py-2">Subject</th><th className="text-left px-3 py-2">Resource</th><th className="text-left px-3 py-2">Project</th><th className="text-left px-3 py-2">Start Date</th><th className="text-left px-3 py-2">Status</th><th className="px-3 py-2"></th></tr></thead>
        <tbody>
          {tasks.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-500">No tasks</td></tr>}
          {tasks.map((t) => (
            <tr key={t.id} className="border-t border-slate-100">
              <td className="px-3 py-2 max-w-md truncate">{t.subject}</td>
              <td className="px-3 py-2">{t.resourceName}</td>
              <td className="px-3 py-2">{t.project}</td>
              <td className="px-3 py-2">{t.startDate}</td>
              <td className="px-3 py-2"><Badge variant="secondary" className="capitalize">{t.status}</Badge></td>
              <td className="px-3 py-2"><Button size="sm" variant="link" onClick={() => router.navigate({ to: "/user/tasks/$id", params: { id: t.id } })}>View</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageCard>
  );
}});
