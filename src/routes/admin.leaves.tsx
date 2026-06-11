import { createFileRoute, Link } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRMS } from "@/lib/store";
import { downloadCsv } from "@/lib/utils/csv";
import type { ColumnDef } from "@tanstack/react-table";
import type { Leave } from "@/lib/types";
import { isResourceAssignable } from "@/lib/types";
import { useState } from "react";
import { Search, User } from "lucide-react";

export const Route = createFileRoute("/admin/leaves")({ component: LeavesPage });

function LeavesPage() {
  const leaves = useRMS((s) => s.leaves);
  const updateLeave = useRMS((s) => s.updateLeave);
  const del = useRMS((s) => s.deleteLeave);
  const resources = useRMS((s) => s.resources);

  // Track processing ID for mutations
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Sidebar search state
  const [searchQuery, setSearchQuery] = useState("");

  // Select Resource filter state
  const [selectedResource, setSelectedResource] = useState("ALL");

  // Filter leaves based on selected resource dropdown
  const filteredLeaves =
    selectedResource === "ALL" ? leaves : leaves.filter((l) => l.resourceName === selectedResource);

  const columns: ColumnDef<Leave, any>[] = [
    { header: "Resource", accessorKey: "resourceName" },
    { header: "From", accessorKey: "fromDate" },
    { header: "To", accessorKey: "toDate" },
    { header: "Days", accessorKey: "totalDays" },
    { header: "Type", accessorKey: "type" },
    { header: "Reason", accessorKey: "reason" },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ getValue }) => {
        const v = String(getValue());
        const color =
          v === "approved"
            ? "bg-emerald-100 text-emerald-700"
            : v === "rejected"
              ? "bg-rose-100 text-rose-700"
              : "bg-amber-100 text-amber-700";
        return <Badge className={`${color} capitalize`}>{v}</Badge>;
      },
    },
    {
      header: "Actions",
      id: "a",
      cell: ({ row }) => {
        const isProcessing = processingId === row.original.id;
        return (
          <div className="flex gap-1">
            {row.original.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-emerald-700 border-emerald-300"
                  disabled={isProcessing}
                  onClick={async () => {
                    setProcessingId(row.original.id);
                    try {
                      await updateLeave(row.original.id, { status: "approved" });
                    } finally {
                      setProcessingId(null);
                    }
                  }}
                >
                  {isProcessing ? "..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-700 border-rose-300"
                  disabled={isProcessing}
                  onClick={async () => {
                    setProcessingId(row.original.id);
                    try {
                      await updateLeave(row.original.id, { status: "rejected" });
                    } finally {
                      setProcessingId(null);
                    }
                  }}
                >
                  {isProcessing ? "..." : "Reject"}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-rose-600"
              disabled={isProcessing}
              onClick={async () => {
                setProcessingId(row.original.id);
                try {
                  await del(row.original.id);
                } finally {
                  setProcessingId(null);
                }
              }}
            >
              {isProcessing ? "..." : "Delete"}
            </Button>
          </div>
        );
      },
    },
  ];

  // Sidebar active resources filter
  const activeResources = resources.filter(isResourceAssignable);
  const filteredActive = activeResources.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Excel Export Handler
  const handleExportExcel = () => {
    const headers = [
      "Resource Name",
      "From Date",
      "To Date",
      "Total Days",
      "Leave Type",
      "Reason",
      "Status",
    ];
    const rows = filteredLeaves.map((l) => [
      l.resourceName,
      l.fromDate,
      l.toDate,
      String(l.totalDays),
      l.type,
      l.reason,
      l.status,
    ]);

    const resourceSuffix =
      selectedResource === "ALL"
        ? "ALL"
        : selectedResource
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "_");

    downloadCsv(
      `leaves_report_${resourceSuffix}`,
      headers,
      rows
    );
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      {/* Left Column: Leave Manager Table & Filter */}
      <div className="lg:col-span-8">
        <PageCard title="Leave Manager">
          {/* Select Resource & Excel Export header */}
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-stone-700">Select Resource:</span>
              <select
                value={selectedResource}
                onChange={(e) => setSelectedResource(e.target.value)}
                className="border border-black rounded px-3 py-1 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="ALL">ALL</option>
                {activeResources.map((r) => (
                  <option key={r.id} value={r.fullName}>
                    {r.fullName}
                  </option>
                ))}
              </select>
            </div>
            {/* Excel Export Button */}
            <button
              onClick={handleExportExcel}
              className="p-1 hover:opacity-80 transition-opacity focus:outline-none"
              title="Export to Excel"
            >
              <img
                src="https://img.icons8.com/color/48/microsoft-excel-2019.png"
                alt="Excel"
                className="w-6 h-6"
              />
            </button>
          </div>

          <DataTable data={filteredLeaves} columns={columns} searchPlaceholder="Search leaves..." />
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
