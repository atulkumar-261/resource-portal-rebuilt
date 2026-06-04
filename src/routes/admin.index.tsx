import { createFileRoute, Link } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS } from "@/lib/store";
import { Users, Briefcase, FolderKanban, CheckSquare, CalendarOff, Megaphone, FileText, Receipt } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const s = useRMS();
  const cards = [
    { to: "/admin/resources", label: "Resources", value: s.resources.length, icon: Users, color: "from-blue-500 to-blue-700" },
    { to: "/admin/clients", label: "Clients", value: s.clients.length, icon: Briefcase, color: "from-emerald-500 to-emerald-700" },
    { to: "/admin/projects", label: "Projects", value: s.projects.length, icon: FolderKanban, color: "from-violet-500 to-violet-700" },
    { to: "/admin/tasks", label: "Task Updates", value: s.tasks.length, icon: CheckSquare, color: "from-amber-500 to-amber-700" },
    { to: "/admin/leaves", label: "Leaves", value: s.leaves.length, icon: CalendarOff, color: "from-rose-500 to-rose-700" },
    { to: "/admin/announcements", label: "Announcements", value: s.announcements.length, icon: Megaphone, color: "from-sky-500 to-sky-700" },
    { to: "/admin/payslips", label: "Payslips", value: s.payslips.length, icon: Receipt, color: "from-indigo-500 to-indigo-700" },
    { to: "/admin/reports", label: "Reports", value: 4, icon: FileText, color: "from-slate-500 to-slate-700" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="block">
            <div className="bg-white rounded-md border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className={`bg-gradient-to-br ${c.color} text-white p-4 flex items-center justify-between`}>
                <c.icon className="w-8 h-8" />
                <div className="text-3xl font-bold">{c.value}</div>
              </div>
              <div className="p-3 text-sm font-medium text-slate-700">{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <PageCard title="Recent Task Updates">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr><th className="text-left px-3 py-2">Subject</th><th className="text-left px-3 py-2">Resource</th><th className="text-left px-3 py-2">Project</th><th className="text-left px-3 py-2">Status</th></tr>
          </thead>
          <tbody>
            {s.tasks.slice(0, 5).map((t) => (
              <tr key={t.id} className="border-t border-slate-100"><td className="px-3 py-2 truncate max-w-md">{t.subject}</td><td className="px-3 py-2">{t.resourceName}</td><td className="px-3 py-2">{t.project}</td><td className="px-3 py-2 capitalize">{t.status}</td></tr>
            ))}
          </tbody>
        </table>
      </PageCard>
    </div>
  );
}
