import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useRMS } from "@/lib/store";
import { Search, User } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export const Route = createFileRoute("/admin/projects/")({ component: ProjectsPage });

function ProjectsPage() {
  const projects = useRMS((s) => s.projects);
  const del = useRMS((s) => s.deleteProject);
  const resources = useRMS((s) => s.resources);
  const router = useRouter();

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
      {/* Left Column: Current Projects Grid */}
      <div className="lg:col-span-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-teal-800">Current Project</h2>
          <div className="flex gap-2">
            <button
              onClick={() => router.navigate({ to: "/admin/projects/new" })}
              className="bg-stone-600 hover:bg-stone-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors shadow-sm"
            >
              Create Project
            </button>
            <button
              onClick={() => router.navigate({ to: "/admin/projects/new-ai" })}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors shadow-sm"
            >
              Create with AI
            </button>
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white p-6 rounded-lg border border-slate-300 relative flex flex-col justify-between min-h-[220px] shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Delete trigger circular red cross button */}
              <ConfirmDialog
                trigger={
                  <button className="w-5 h-5 rounded-full bg-[#cc0000] text-white flex items-center justify-center font-bold text-[10px] cursor-pointer absolute top-2.5 right-2.5 shadow hover:bg-red-700 transition-colors focus:outline-none">
                    X
                  </button>
                }
                onConfirm={() => del(p.id)}
              />

              {/* Title & Description */}
              <div>
                <h3 className="text-teal-700 font-bold text-base pr-6">{p.name}</h3>
                <p className="text-sm text-slate-600 mt-4 leading-relaxed line-clamp-3">
                  {p.description || "No description provided."}
                </p>
              </div>

              {/* Footer info: Status & Details Link */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-semibold">
                  Status: <span className="capitalize">{p.status}</span>
                </span>
                <div className="flex gap-3">
                  <Link
                    to="/admin/projects/$id/edit"
                    params={{ id: p.id }}
                    className="text-xs text-slate-500 hover:text-slate-700 font-semibold hover:underline"
                  >
                    Edit &gt;
                  </Link>
                  <Link
                    to="/admin/projects/$id/execution"
                    params={{ id: p.id }}
                    className="text-xs text-teal-600 hover:text-teal-800 font-semibold hover:underline"
                  >
                    Execution &gt;
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {projects.length === 0 && (
            <div className="col-span-2 text-center py-12 text-slate-500 font-medium bg-white border border-dashed rounded-lg">
              No projects found. Click "Create Project" to get started.
            </div>
          )}
        </div>
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
