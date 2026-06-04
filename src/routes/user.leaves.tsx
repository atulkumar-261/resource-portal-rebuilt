import { createFileRoute, Link } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, useRMS } from "@/lib/store";

export const Route = createFileRoute("/user/leaves")({ component: () => {
  const resourceId = useAuth((s) => s.resourceId) ?? "177";
  const leaves = useRMS((s) => s.leaves.filter((l) => l.resourceId === resourceId));
  return (
    <PageCard title="Manage Leaves" actions={<Link to="/user/leaves/apply"><Button size="sm">Apply For Leave</Button></Link>}>
      <div className="grid sm:grid-cols-5 gap-3 mb-4 text-sm">
        {[
          ["Total Leaves (2026)", 20],
          ["Used Leaves", leaves.filter((l) => l.status === "approved").reduce((a, b) => a + b.totalDays, 0)],
          ["Balance Leaves", 20 - leaves.filter((l) => l.status === "approved").reduce((a, b) => a + b.totalDays, 0)],
          ["Unpaid Leaves", 0],
          ["Absent", 0],
        ].map(([k, v]) => (
          <div key={k as string} className="border border-slate-200 rounded p-3 bg-slate-50"><div className="text-xs text-slate-500">{k}</div><div className="text-xl font-bold">{v}</div></div>
        ))}
      </div>
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-100"><tr><th className="text-left px-3 py-2">From</th><th className="text-left px-3 py-2">To</th><th className="text-left px-3 py-2">Days</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Reason</th><th className="text-left px-3 py-2">Status</th></tr></thead>
        <tbody>
          {leaves.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-500">No leaves applied</td></tr>}
          {leaves.map((l) => (
            <tr key={l.id} className="border-t border-slate-100"><td className="px-3 py-2">{l.fromDate}</td><td className="px-3 py-2">{l.toDate}</td><td className="px-3 py-2">{l.totalDays}</td><td className="px-3 py-2">{l.type}</td><td className="px-3 py-2">{l.reason}</td><td className="px-3 py-2"><Badge variant="secondary" className="capitalize">{l.status}</Badge></td></tr>
          ))}
        </tbody>
      </table>
    </PageCard>
  );
}});
