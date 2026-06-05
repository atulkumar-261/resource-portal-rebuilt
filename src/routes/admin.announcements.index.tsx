import { createFileRoute, Link } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useRMS } from "@/lib/store";
import { Plus, Trash2, Search, User } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/announcements/")({
  component: AdminannouncementsPage,
});

function AdminannouncementsPage() {
  const list = useRMS((s) => s.announcements);
  const del = useRMS((s) => s.deleteAnnouncement);
  const resources = useRMS((s) => s.resources);

  // Sidebar search state
  const [searchQuery, setSearchQuery] = useState("");

  // Sidebar active resources filter
  const activeResources = resources.filter((r) => r.status === "active");
  const filteredActive = activeResources.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      {/* Left Column: Announcements Table */}
      <div className="lg:col-span-8">
        <PageCard
          title="Announcements"
          actions={
            <Button size="sm" asChild>
              <Link to="/admin/announcements/new">
                <Plus className="w-4 h-4" /> New
              </Link>
            </Button>
          }
        >
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm border-collapse text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-medium">
                  <th className="px-4 py-2 border-b border-slate-200">Subject</th>
                  <th className="px-4 py-2 border-b border-slate-200">Message</th>
                  <th className="px-4 py-2 border-b border-slate-200">Date</th>
                  <th className="px-4 py-2 border-b border-slate-200 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {list.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-slate-500 py-6 font-medium">
                      No announcement found
                    </td>
                  </tr>
                )}
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{a.subject}</td>
                    <td className="px-4 py-3 text-slate-600">{a.message}</td>
                    <td className="px-4 py-3 text-slate-500">{a.date}</td>
                    <td className="px-4 py-3 text-right">
                      <ConfirmDialog
                        trigger={
                          <Button size="sm" variant="ghost" className="text-rose-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        }
                        onConfirm={() => del(a.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>
      </div>

      {/* Sidebar Column: Active Resources */}
      <div className="lg:col-span-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
          <h2 className="text-lg font-bold text-teal-800 mb-4 tracking-wide">ACTIVE RESOURCES</h2>

          {/* Search Box */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-16 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <button className="absolute right-1 top-1 bottom-1 bg-stone-700 hover:bg-stone-800 text-white px-3 py-1 rounded text-xs font-semibold transition-colors">
              Search
            </button>
          </div>

          {/* Resources List (scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {filteredActive.length > 0 ? (
              filteredActive.map((r) => (
                <Link
                  key={r.id}
                  to="/admin/resources/$id"
                  params={{ id: r.id }}
                  className="flex gap-4 p-3 bg-stone-50 hover:bg-teal-50/40 rounded-lg border border-slate-100 hover:border-teal-100 transition-all group block text-left"
                >
                  {/* Avatar Circle */}
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-bold text-sm flex-shrink-0 overflow-hidden group-hover:bg-teal-200 transition-colors">
                    {r.avatarUrl ? (
                      <img
                        src={r.avatarUrl}
                        alt={r.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      r.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || <User className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                      {r.fullName}
                    </div>
                    <div className="text-xs text-slate-700 font-semibold truncate mb-0.5">
                      {r.jobTitle}
                    </div>
                    <div className="text-xs text-slate-600 truncate">{r.skillset}</div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 font-medium text-sm">
                No active resources found
              </div>
            )}
          </div>

          {/* View All footer link */}
          <div className="pt-4 border-t border-slate-100 mt-4 text-right">
            <Link
              to="/admin/resources"
              className="text-sm font-semibold text-teal-600 hover:text-teal-800 hover:underline inline-flex items-center gap-1"
            >
              View all &gt;&gt;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
