import { createFileRoute, Link } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useRMS } from "@/lib/store";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/announcements")({ component: () => {
  const list = useRMS((s) => s.announcements);
  const del = useRMS((s) => s.deleteAnnouncement);
  return (
    <PageCard title="Announcements" actions={<Link to="/admin/announcements/new"><Button size="sm"><Plus className="w-4 h-4" /> New</Button></Link>}>
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-100"><tr><th className="text-left px-3 py-2">Subject</th><th className="text-left px-3 py-2">Message</th><th className="text-left px-3 py-2">Date</th><th className="px-3 py-2"></th></tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={4} className="text-center text-slate-500 px-3 py-4">No announcement found</td></tr>}
          {list.map((a) => (
            <tr key={a.id} className="border-t border-slate-100">
              <td className="px-3 py-2 font-medium">{a.subject}</td>
              <td className="px-3 py-2">{a.message}</td>
              <td className="px-3 py-2">{a.date}</td>
              <td className="px-3 py-2 text-right">
                <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-rose-600"><Trash2 className="w-4 h-4" /></Button>} onConfirm={() => del(a.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageCard>
  );
}});
