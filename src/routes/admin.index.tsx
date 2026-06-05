import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRMS } from "@/lib/store";
import { Search, MapPin, FileWarning, Plane, ShieldAlert, User } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const resources = useRMS((s) => s.resources);
  const [searchQuery, setSearchQuery] = useState("");

  // Helper to parse DD-MM-YYYY dates
  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  };

  // Helper to calculate days remaining from a fixed reference date (June 5, 2026)
  const calculateDays = (dateStr: string) => {
    const exp = parseDate(dateStr);
    if (!exp) return 0;
    const ref = new Date("2026-06-05");
    const diffTime = exp.getTime() - ref.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 1. Visa Expiry Alerts (filtered to resources with visaExpiry & sorted by days remaining)
  const visaAlerts = resources
    .filter((r) => r.visaExpiry)
    .map((r) => ({
      ...r,
      daysLeft: calculateDays(r.visaExpiry),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // 2. Passport Expiry Alerts (filtered to resources with passportExpiry & sorted)
  const passportAlerts = resources
    .filter((r) => r.passportExpiry)
    .map((r) => ({
      ...r,
      daysLeft: calculateDays(r.passportExpiry),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // 3. Address Change Log (Mocked history linked to actual resource profiles)
  const addressChanges = [
    {
      resourceId: "179",
      resourceName: "Jimy Shine",
      currentAddress: "28 Pipistrelle Place, Littleover, Derby UK, DE23 4DA",
      oldAddress: "5 Oak Lane, Birmingham, B1 1AA",
    },
    {
      resourceId: "177",
      resourceName: "Asra Ghafoor",
      currentAddress: "09, Park View, Dewsbury, West Yorkshire, WF12 9DT",
      oldAddress: "12 Valley Road, Dewsbury, WF12 9XX",
    },
    {
      resourceId: "181",
      resourceName: "Gouthami Masam",
      currentAddress: "21 Duett Court St Giles Close, Hounslow TW5 0AF",
      oldAddress: "21 Elm Street, Leeds, LS1 4AB",
    },
  ];

  // 4. Sidebar: Active Resources (searchable)
  const activeResources = resources.filter((r) => r.status === "active");

  const filteredActive = activeResources.filter((r) => {
    const query = searchQuery.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(query) ||
      r.jobTitle.toLowerCase().includes(query) ||
      r.skillset.toLowerCase().includes(query)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 max-w-7xl mx-auto">
      {/* Main Column */}
      <div className="lg:col-span-8 space-y-8 min-w-0">
        {/* Visa Expiry Alerts */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-teal-700/5 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Plane className="w-5 h-5 text-teal-700" />
            <h2 className="text-lg font-bold text-teal-800">Visa Expiry Alerts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-600 text-stone-100 uppercase tracking-wider text-xs">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Resource Name</th>
                  <th className="text-left px-6 py-3 font-semibold">Visa Ex. Date</th>
                  <th className="text-left px-6 py-3 font-semibold">Visa Number</th>
                  <th className="text-left px-6 py-3 font-semibold">Days to Expire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-stone-50/50">
                {visaAlerts.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link
                        to="/admin/resources/$id"
                        params={{ id: r.id }}
                        className="font-bold text-teal-700 hover:text-teal-900 hover:underline"
                      >
                        {r.fullName}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium">{r.visaExpiry}</td>
                    <td className="px-6 py-3.5 text-slate-600 font-mono">{r.visaNumber || "N/A"}</td>
                    <td className="px-6 py-3.5 font-bold">
                      <span className={r.daysLeft < 365 ? "text-rose-600" : "text-slate-800"}>
                        {r.daysLeft}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Passport Expiry Alerts */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-teal-700/5 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-teal-700" />
            <h2 className="text-lg font-bold text-teal-800">Passport Expiry Alerts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-600 text-stone-100 uppercase tracking-wider text-xs">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Resource Name</th>
                  <th className="text-left px-6 py-3 font-semibold">Passport Ex. Date</th>
                  <th className="text-left px-6 py-3 font-semibold">Passport Number</th>
                  <th className="text-left px-6 py-3 font-semibold">Days to Expire</th>
                  <th className="text-left px-6 py-3 font-semibold">Citizen Ship</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-stone-50/50">
                {passportAlerts.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link
                        to="/admin/resources/$id"
                        params={{ id: r.id }}
                        className="font-bold text-teal-700 hover:text-teal-900 hover:underline"
                      >
                        {r.fullName}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium">{r.passportExpiry}</td>
                    <td className="px-6 py-3.5 text-slate-600 font-mono">{r.passportNumber}</td>
                    <td className="px-6 py-3.5 font-bold">
                      <span className={r.daysLeft < 365 ? "text-rose-600" : "text-slate-800"}>
                        {r.daysLeft}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium">{r.citizenOf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Address Change Log */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-teal-700/5 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-700" />
            <h2 className="text-lg font-bold text-teal-800">Address Change Log</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-600 text-stone-100 uppercase tracking-wider text-xs">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Resource Name</th>
                  <th className="text-left px-6 py-3 font-semibold">Current Address</th>
                  <th className="text-left px-6 py-3 font-semibold">Old Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-stone-50/50">
                {addressChanges.map((log) => (
                  <tr key={log.resourceId} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <Link
                        to="/admin/resources/$id"
                        params={{ id: log.resourceId }}
                        className="font-bold text-teal-700 hover:text-teal-900 hover:underline"
                      >
                        {log.resourceName}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium max-w-xs truncate">
                      {log.currentAddress}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 max-w-xs truncate">
                      {log.oldAddress || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Sidebar Column */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
          <h2 className="text-lg font-bold text-teal-800 mb-4 tracking-wide">Active Resources</h2>

          {/* Search Box */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search active resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-shadow"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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
                      <img src={r.avatarUrl} alt={r.fullName} className="w-full h-full object-cover" />
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
