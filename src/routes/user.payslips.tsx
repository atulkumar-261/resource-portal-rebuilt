import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useAuth, useRMS } from "@/lib/store";

export const Route = createFileRoute("/user/payslips")({ component: () => {
  const resourceId = useAuth((s) => s.resourceId) ?? "177";
  const list = useRMS((s) => s.payslips.filter((p) => p.resourceId === resourceId));
  return (
    <PageCard title="Pay Slips List">
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-100"><tr><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">Payslip Month</th><th className="text-left px-3 py-2">Number of Days</th><th className="text-left px-3 py-2">Amount</th><th className="text-left px-3 py-2">Notes</th></tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-slate-500">No payslips found</td></tr>}
          {list.map((p) => (
            <tr key={p.id} className="border-t border-slate-100"><td className="px-3 py-2">{p.resourceName}</td><td className="px-3 py-2">{p.month}</td><td className="px-3 py-2">{p.days}</td><td className="px-3 py-2">£{p.amount.toLocaleString()}</td><td className="px-3 py-2">{p.notes}</td></tr>
          ))}
        </tbody>
      </table>
    </PageCard>
  );
}});
