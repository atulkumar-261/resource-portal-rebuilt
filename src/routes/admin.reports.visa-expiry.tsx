import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/reports/visa-expiry")({
  component: AdminreportsvisaexpiryPage,
});

function AdminreportsvisaexpiryPage() {
  const resources = useRMS((s) => s.resources.filter((r) => r.visaExpiry));
  return (
    <PageCard title="Visa Expiry Report">
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-3 py-2">Resource</th>
            <th className="text-left px-3 py-2">Visa Number</th>
            <th className="text-left px-3 py-2">Visa Expiry</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-3 py-2">{r.fullName}</td>
              <td className="px-3 py-2">{r.visaNumber || "—"}</td>
              <td className="px-3 py-2">{r.visaExpiry}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageCard>
  );
}
