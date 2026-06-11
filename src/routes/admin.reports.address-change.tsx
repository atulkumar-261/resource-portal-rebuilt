import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useQuery } from "@tanstack/react-query";
import { fetchAddressChanges } from "@/lib/api/resources";

export const Route = createFileRoute("/admin/reports/address-change")({
  component: AdminreportsaddresschangePage,
});

function AdminreportsaddresschangePage() {
  const addressChangesQuery = useQuery({
    queryKey: ["address-changes-report"],
    queryFn: fetchAddressChanges,
  });

  const logs = addressChangesQuery.data || [];

  return (
    <PageCard title="Address Change Log">
      {addressChangesQuery.isLoading ? (
        <div className="p-4 text-slate-500">Loading address change history...</div>
      ) : logs.length === 0 ? (
        <div className="p-4 text-slate-500">No address changes recorded.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200">
            <thead className="bg-slate-100 uppercase tracking-wider text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Resource Name</th>
                <th className="text-left px-4 py-2 font-semibold">Previous Address</th>
                <th className="text-left px-4 py-2 font-semibold">Current Address</th>
                <th className="text-left px-4 py-2 font-semibold">Changed By</th>
                <th className="text-left px-4 py-2 font-semibold">Changed On</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{log.resource_name}</td>
                  <td className="px-4 py-3 text-slate-600">{log.old_address || "—"}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{log.current_address}</td>
                  <td className="px-4 py-3 text-slate-600">{log.changed_by || "System"}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageCard>
  );
}
