import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/resources/pending")({ component: () => {
  const pending = useRMS((s) => s.resources.filter((r) => r.status === "pending"));
  return (
    <PageCard title="All Pending Resources">
      {pending.length === 0 ? <p className="text-sm text-slate-500">No records found</p> : <ul className="text-sm">{pending.map((r) => <li key={r.id}>{r.fullName}</li>)}</ul>}
    </PageCard>
  );
}});
