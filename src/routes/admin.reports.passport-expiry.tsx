import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/reports/passport-expiry")({ component: () => {
  const resources = useRMS((s) => s.resources);
  return (
    <PageCard title="Passport Expiry Report">
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-100"><tr><th className="text-left px-3 py-2">Resource</th><th className="text-left px-3 py-2">Passport Number</th><th className="text-left px-3 py-2">Passport Expiry</th></tr></thead>
        <tbody>
          {resources.map((r) => (
            <tr key={r.id} className="border-t border-slate-100"><td className="px-3 py-2">{r.fullName}</td><td className="px-3 py-2">{r.passportNumber}</td><td className="px-3 py-2">{r.passportExpiry}</td></tr>
          ))}
        </tbody>
      </table>
    </PageCard>
  );
}});
