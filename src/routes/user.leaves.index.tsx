import { createFileRoute, Link } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth, useRMS } from "@/lib/store";

export const Route = createFileRoute('/user/leaves/')({
  component: UserLeavesPage,
});

function UserLeavesPage() {
  const resourceId = useAuth((s) => s.resourceId) ?? "177";
  const allLeaves = useRMS((s) => s.leaves);
  
  // Sort leaves descending so newest ID (largest suffix) is at the top
  const leaves = allLeaves
    .filter((l) => l.resourceId === resourceId)
    .sort((a, b) => b.id.localeCompare(a.id));

  const getDisplayId = (id: string, index: number, total: number) => {
    const match = id.match(/^l(\d+)$/);
    if (match) return match[1];
    return String(total - index);
  };

  return (
    <PageCard
      title="Manage Leaves"
      actions={
        <Button size="sm" asChild>
          <Link to="/user/leaves/apply">Apply For Leave</Link>
        </Button>
      }
    >
      <div className="grid sm:grid-cols-5 gap-3 mb-4 text-sm">
        {[
          ["Total Leaves (2026)", 20],
          [
            "Used Leaves",
            leaves.filter((l) => l.status === "approved").reduce((a, b) => a + b.totalDays, 0),
          ],
          [
            "Balance Leaves",
            20 - leaves.filter((l) => l.status === "approved").reduce((a, b) => a + b.totalDays, 0),
          ],
          ["Unpaid Leaves", 0],
          ["Absent", 0],
        ].map(([k, v]) => (
          <div key={k as string} className="border border-slate-200 rounded p-3 bg-slate-50">
            <div className="text-xs text-slate-500">{k}</div>
            <div className="text-xl font-bold">{v}</div>
          </div>
        ))}
      </div>
      <div className="border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#7a7672] text-white font-medium text-center">
              <th className="text-left px-3 py-2 border-r border-slate-300/30">Leave Id #</th>
              <th className="text-left px-3 py-2 border-r border-slate-300/30">Start Date</th>
              <th className="text-left px-3 py-2 border-r border-slate-300/30">End Date</th>
              <th className="text-left px-3 py-2 border-r border-slate-300/30">No of Days</th>
              <th className="text-left px-3 py-2 border-r border-slate-300/30">Leave Type</th>
              <th className="text-left px-3 py-2 border-r border-slate-300/30">Reason</th>
              <th className="text-left px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  No leaves applied
                </td>
              </tr>
            )}
            {leaves.map((l, index) => (
              <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5 border-r border-slate-200 font-medium">
                  {getDisplayId(l.id, index, leaves.length)}
                </td>
                <td className="px-3 py-2.5 border-r border-slate-200">{l.fromDate}</td>
                <td className="px-3 py-2.5 border-r border-slate-200">{l.toDate}</td>
                <td className="px-3 py-2.5 border-r border-slate-200 font-medium">{l.totalDays}</td>
                <td className="px-3 py-2.5 border-r border-slate-200">{l.type} Leave</td>
                <td className="px-3 py-2.5 border-r border-slate-200 max-w-xs truncate" title={l.reason}>
                  {l.reason}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                    l.status === 'approved' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : l.status === 'rejected' 
                        ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 mt-3">
        1 to {leaves.length} of {leaves.length}
      </p>
    </PageCard>
  );
}
