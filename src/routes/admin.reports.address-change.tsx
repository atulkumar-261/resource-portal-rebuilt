import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/reports/address-change")({
  component: AdminreportsaddresschangePage,
});

function AdminreportsaddresschangePage() {
  const resources = useRMS((s) => s.resources);
  return (
    <PageCard title="Address Change Log">
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-100">
          <tr>
            <th className="text-left px-3 py-2">Resource</th>
            <th className="text-left px-3 py-2">Address</th>
            <th className="text-left px-3 py-2">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-3 py-2">{r.fullName}</td>
              <td className="px-3 py-2">{r.address}</td>
              <td className="px-3 py-2 text-slate-500">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageCard>
  );
}
