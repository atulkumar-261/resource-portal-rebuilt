import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/user/announcements")({ component: () => {
  const list = useRMS((s) => s.announcements);
  return (
    <PageCard title="Current Announcements">
      <table className="w-full text-sm border border-slate-200">
        <thead className="bg-slate-100"><tr><th className="text-left px-3 py-2">Subject</th><th className="text-left px-3 py-2">Message</th><th className="text-left px-3 py-2">Date</th></tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-500">No announcement found</td></tr>}
          {list.map((a) => (
            <tr key={a.id} className="border-t border-slate-100"><td className="px-3 py-2 font-medium">{a.subject}</td><td className="px-3 py-2">{a.message}</td><td className="px-3 py-2">{a.date}</td></tr>
          ))}
        </tbody>
      </table>
    </PageCard>
  );
}});
