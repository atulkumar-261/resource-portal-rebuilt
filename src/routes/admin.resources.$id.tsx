import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRMS } from "@/lib/store";
import { User as UserIcon, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/resources/$id")({
  component: ResourceDetail,
});

function ResourceDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const resources = useRMS((s) => s.resources);
  const projects = useRMS((s) => s.projects);
  const updateResource = useRMS((s) => s.updateResource);

  const r = resources.find((x) => x.id === id);

  // Form States
  const [skillset, setSkillset] = useState("");
  const [status, setStatus] = useState<"active" | "pending" | "resigned" | "terminated">("active");
  const [totalLeaves, setTotalLeaves] = useState("20");
  const [weeklyHours, setWeeklyHours] = useState("40");
  const [addressLog, setAddressLog] = useState("");
  const [performanceNotes, setPerformanceNotes] = useState("");
  const [assignedProjects, setAssignedProjects] = useState<string[]>([]);

  useEffect(() => {
    if (r) {
      setSkillset(r.skillset || "");
      setStatus(r.status || "active");
      setTotalLeaves(String(r.totalLeaves ?? "20"));
      setWeeklyHours(String(r.weeklyAllowedHours ?? "40"));
      setAddressLog(r.oldAddressLog || "");
      setPerformanceNotes(r.performanceNotes || "");
      setAssignedProjects(r.assignedProjects || []);
    }
  }, [r]);

  if (!r) {
    return (
      <div className="bg-white rounded-lg border border-slate-300 p-8 max-w-4xl shadow-sm">
        <h2 className="text-red-500 font-medium">Resource not found.</h2>
        <button
          onClick={() => router.navigate({ to: "/admin/resources" })}
          className="text-teal-600 underline mt-2 inline-block focus:outline-none"
        >
          Back to Resources
        </button>
      </div>
    );
  }

  // Handle saving the edits
  const handleSave = () => {
    updateResource(r.id, {
      skillset,
      status,
      totalLeaves: Number(totalLeaves) || 0,
      weeklyAllowedHours: Number(weeklyHours) || 0,
      oldAddressLog: addressLog,
      performanceNotes,
      assignedProjects,
    });
    router.navigate({ to: "/admin/resources" });
  };

  // Assign a new project from dropdown selection
  const handleAssignProject = (projectName: string) => {
    if (projectName && projectName !== "None") {
      if (!assignedProjects.includes(projectName)) {
        setAssignedProjects([...assignedProjects, projectName]);
      }
    }
  };

  // Unassign project
  const handleUnassignProject = (projectName: string) => {
    setAssignedProjects(assignedProjects.filter((p) => p !== projectName));
  };

  // Utility to display values or "Not Entered"
  const valOrEmpty = (val?: string) => val?.trim() || "Not Entered";

  return (
    <div className="bg-white rounded-lg border border-slate-300 p-8 max-w-5xl shadow-sm">
      <h2 className="text-[28px] text-[#0d7a70] font-normal mb-8 border-b pb-4">Resource view</h2>

      <div className="grid md:grid-cols-12 gap-8 items-start text-sm">
        {/* Left Column: Avatar, read-only stats & form fields */}
        <div className="md:col-span-8 space-y-6">
          {/* Avatar and name */}
          <div className="flex gap-4 items-start">
            <div className="w-24 h-28 border border-slate-300 bg-stone-100 flex items-center justify-center flex-shrink-0 text-stone-400 overflow-hidden">
              {r.avatarUrl ? (
                <img src={r.avatarUrl} alt={r.fullName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-12 h-12 text-stone-500" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-800">{r.fullName}</h3>
              <p className="text-stone-500 font-semibold">CV Not Uploaded</p>
            </div>
          </div>

          {/* Key-Value Details */}
          <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-stone-600 border-b border-dashed pb-6">
            <div className="font-bold">Notes:</div>
            <div>{valOrEmpty(r.skillset ? "" : "Not Entered")}</div>

            <div className="font-bold">Account #:</div>
            <div>{valOrEmpty(r.bankAccount)}</div>

            <div className="font-bold">Sort Code:</div>
            <div>{valOrEmpty(r.sortCode)}</div>

            <div className="font-bold">Bank:</div>
            <div>{valOrEmpty(r.bankName)}</div>

            <div className="font-bold">Date of Birth:</div>
            <div>{valOrEmpty(r.dob)}</div>

            <div className="font-bold">Passport Number:</div>
            <div>{valOrEmpty(r.passportNumber)}</div>

            <div className="font-bold">Visa Number:</div>
            <div>{valOrEmpty(r.visaNumber)}</div>

            <div className="font-bold">NI Number:</div>
            <div>{valOrEmpty(r.niNumber)}</div>

            <div className="font-bold">Nationality:</div>
            <div>{valOrEmpty(r.citizenOf)}</div>

            <div className="font-bold">Contact Phone:</div>
            <div>{valOrEmpty(r.phone)}</div>

            <div className="font-bold">Contact Address:</div>
            <div>{valOrEmpty(r.address)}</div>

            <div className="font-bold">Email Address:</div>
            <div className="text-sky-700 underline break-all">{r.email}</div>

            {/* Emergency Details */}
            <div className="col-span-2 font-bold text-slate-800 pt-3 text-base">
              Emergency Contact Details:
            </div>

            <div className="font-bold pl-2">Name:</div>
            <div>{valOrEmpty(r.emergencyName)}</div>

            <div className="font-bold pl-2">Phone:</div>
            <div>{valOrEmpty(r.emergencyPhone)}</div>

            <div className="font-bold pl-2">Mail Address:</div>
            <div>{valOrEmpty(r.emergencyEmail)}</div>

            <div className="font-bold pl-2">Address:</div>
            <div>{valOrEmpty(r.emergencyAddress)}</div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 max-w-xl">
            {/* Skillset */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <span className="text-stone-700 font-semibold">Skillset:</span>
              <input
                type="text"
                value={skillset}
                onChange={(e) => setSkillset(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Status */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <span className="text-stone-700 font-semibold">Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="resigned">Resigned</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>

            {/* Assign a project */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <span className="text-stone-700 font-semibold">Assign a project:</span>
              <select
                value="None"
                onChange={(e) => handleAssignProject(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="None">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Total Leaves */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <span className="text-stone-700 font-semibold">Total Leaves:</span>
              <input
                type="text"
                value={totalLeaves}
                onChange={(e) => setTotalLeaves(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Weekly Allowed Hours */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <span className="text-stone-700 font-semibold">Weekly Allowed Hours:</span>
              <input
                type="text"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Old Address Log */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
              <span className="text-stone-700 font-semibold pt-1.5">Old Address Log</span>
              <textarea
                rows={3}
                value={addressLog}
                onChange={(e) => setAddressLog(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full h-24 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Performance Review Notes */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-start">
              <span className="text-stone-700 font-semibold pt-1.5">Performance Review Notes:</span>
              <textarea
                rows={3}
                value={performanceNotes}
                onChange={(e) => setPerformanceNotes(e.target.value)}
                className="border border-black rounded px-3 py-1.5 text-sm w-full h-24 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Save / Cancel buttons */}
            <div className="grid grid-cols-[160px_1fr] gap-4 items-center">
              <div></div>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={handleSave}
                  className="bg-[#0d7a70] text-white hover:bg-[#0b665d] px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors focus:outline-none"
                >
                  Save
                </button>
                <button
                  onClick={() => router.navigate({ to: "/admin/resources" })}
                  className="bg-[#0d7a70] text-white hover:bg-[#0b665d] px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors focus:outline-none"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Status info, redirect links, assigned projects list and documents upload panel */}
        <div className="md:col-span-4 space-y-6">
          {/* Status badge */}
          <div className="text-right">
            <span className="text-xs font-semibold text-stone-600 bg-stone-100 rounded px-2.5 py-1 border border-stone-200 uppercase">
              Status: {status}
            </span>
          </div>

          {/* Quick redirect links */}
          <div className="flex flex-col gap-2 pt-2">
            <Link
              to="/admin/timesheets"
              className="text-[#0d7a70] hover:underline font-semibold text-base block text-left"
            >
              Timesheet Management
            </Link>
            <Link
              to="/admin/leaves"
              className="text-[#0d7a70] hover:underline font-semibold text-base block text-left"
            >
              Leave management
            </Link>
          </div>

          {/* Project Assigned container */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-700">project assigned</h4>
            <div className="border border-slate-400 bg-white p-4 min-h-[160px] w-full rounded shadow-inner space-y-2">
              {assignedProjects.length > 0 ? (
                assignedProjects.map((pName) => (
                  <div
                    key={pName}
                    className="flex justify-between items-center bg-stone-50 border border-stone-200 rounded px-2.5 py-1 text-stone-800"
                  >
                    <span className="font-medium text-xs truncate max-w-[180px]">{pName}</span>
                    <button
                      onClick={() => handleUnassignProject(pName)}
                      className="text-rose-600 hover:text-rose-800 transition-colors focus:outline-none"
                      title="Unassign Project"
                    >
                      <XCircle className="w-4 h-4 fill-current text-white stroke-rose-600" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-stone-400 italic">No project assigned</div>
              )}
            </div>
          </div>

          {/* Documents status */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <div className="font-bold text-stone-800">Passport Copy:</div>
              <div className="text-xs text-stone-500 mt-0.5">Not Uploaded</div>
            </div>
            <div>
              <div className="font-bold text-stone-800">Visa Copy:</div>
              <div className="text-xs text-stone-500 mt-0.5">Not Uploaded</div>
            </div>
            <div>
              <div className="font-bold text-stone-800">Holdiay Sheet:</div>
              <div className="text-xs text-stone-500 mt-0.5">Not Uploaded</div>
            </div>
            <div>
              <div className="font-bold text-stone-800">Other Documents:</div>
              <div className="text-xs text-stone-500 mt-0.5">Not uploaded</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
