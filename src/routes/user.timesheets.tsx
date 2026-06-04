import { createFileRoute, Link } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRMS, useAuth } from "@/lib/store";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/user/timesheets")({ component: () => {
  const resourceId = useAuth((s) => s.resourceId);
  const all = useRMS((s) => s.timesheets);
  const ts = all.filter((t) => !resourceId || t.resourceId === resourceId || t.resourceId === "177");
  return (
    <PageCard title="Current Timesheets" actions={<Link to="/user/timesheets/new"><Button size="sm"><Plus className="w-4 h-4" /> Add Timesheet</Button></Link>}>
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-100"><tr><th className="text-left px-3 py-2">Week Number</th><th className="text-left px-3 py-2">Week End Date</th><th className="text-left px-3 py-2">Resource</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Total Hours</th><th className="text-left px-3 py-2">Action</th></tr></thead>
        <tbody>
          {ts.map((t) => (
            <tr key={t.id} className="border-t border-slate-100">
              <td className="px-3 py-2">{t.weekNumber}</td>
              <td className="px-3 py-2">{t.weekEndDate}</td>
              <td className="px-3 py-2">{t.resourceName}</td>
              <td className="px-3 py-2"><Badge variant="secondary" className="capitalize">{t.status}</Badge></td>
              <td className="px-3 py-2">{t.totalHours}</td>
              <td className="px-3 py-2"><Button size="sm" variant="link">View</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500 mt-3">1 to {ts.length} of {ts.length}</p>
    </PageCard>
  );
}});
