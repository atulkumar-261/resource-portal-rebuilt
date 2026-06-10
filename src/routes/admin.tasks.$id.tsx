import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useRMS } from "@/lib/store";
import { PageCard } from "@/components/layout/AppShell";

export const Route = createFileRoute("/admin/tasks/$id")({ component: ViewTask });

function ViewTask() {
  const { id } = Route.useParams();
  const router = useRouter();
  const tasks = useRMS((s) => s.tasks);
  const resources = useRMS((s) => s.resources);
  const projects = useRMS((s) => s.projects);
  const updateTask = useRMS((s) => s.updateTask);

  const task = tasks.find((t) => t.id === id);

  // Form States
  const [subject, setSubject] = useState("");
  const [startDate, setStartDate] = useState("");
  const [resourceName, setResourceName] = useState("");
  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<
    "pending" | "in-progress" | "completed" | "wanting-requirements"
  >("pending");

  useEffect(() => {
    if (task) {
      setSubject(task.subject || "");
      setStartDate(task.startDate || "");
      setResourceName(task.resourceName || "");
      setProject(task.project || "");
      setNotes(task.notes || "");
      setStatus(task.status || "pending");
    }
  }, [task]);

  if (!task) {
    return (
      <PageCard title="Task">
        <p className="text-red-500 font-medium">Task not found.</p>
        <button
          onClick={() => router.navigate({ to: "/admin/tasks" })}
          className="text-teal-600 underline mt-2 inline-block focus:outline-none"
        >
          Back to Tasks
        </button>
      </PageCard>
    );
  }

  // Project Option List: include standard leaves and projects from store
  const projectOptions = Array.from(
    new Set(["Annual Leave", "Sick Leave", ...projects.map((p) => p.name)]),
  );

  const handleUpdate = async () => {
    // Find matching resourceId for the chosen resourceName
    const matchedResource = resources.find((r) => r.fullName === resourceName);
    const resourceId = matchedResource ? matchedResource.id : task.resourceId;

    try {
      await updateTask(task.id, {
        subject,
        startDate,
        resourceName,
        resourceId,
        project,
        notes,
        status,
      });
      router.navigate({ to: "/admin/tasks" });
    } catch (e) {
      // Error toast is handled by store action
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-300 p-8 max-w-3xl shadow-sm">
      <h2 className="text-[28px] text-[#0d7a70] font-normal mb-8 border-b pb-4">View Task</h2>

      <div className="grid grid-cols-[140px_1fr] gap-x-6 gap-y-5 items-start max-w-2xl text-sm">
        {/* Subject */}
        <div className="text-stone-600 pt-1.5">Subject :</div>
        <div>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Start Date */}
        <div className="text-stone-600 pt-1.5">Start date :</div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <span className="text-stone-400 text-xs">(DD-MM-YYYY)</span>
        </div>

        {/* Resource Dropdown */}
        <div className="text-stone-600 pt-1.5">Resource :</div>
        <div>
          <select
            value={resourceName}
            onChange={(e) => setResourceName(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Select Resource</option>
            {resources.map((r) => (
              <option key={r.id} value={r.fullName}>
                {r.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* Project Dropdown */}
        <div className="text-stone-600 pt-1.5">Project :</div>
        <div>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Select Project</option>
            {projectOptions.map((pName) => (
              <option key={pName} value={pName}>
                {pName}
              </option>
            ))}
          </select>
        </div>

        {/* Task Notes */}
        <div className="text-stone-600 flex flex-col pt-1.5">
          <span>Task Notes:</span>
          <span className="text-[11px] text-stone-400 leading-normal mt-1 max-w-[130px]">
            (Append notes on top to existing notes with a date, do not over write)
          </span>
        </div>
        <div>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] h-32 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Task Update */}
        <div className="text-stone-600 pt-1.5">Task Update:</div>
        <div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="wanting-requirements">Wanting Requirements</option>
          </select>
        </div>

        {/* Buttons */}
        <div></div>
        <div className="flex gap-2.5 pt-4">
          <button
            onClick={handleUpdate}
            className="bg-[#0d7a70] text-white hover:bg-[#0b665d] px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors focus:outline-none"
          >
            Update
          </button>
          <button
            onClick={() => router.navigate({ to: "/admin/tasks" })}
            className="bg-[#0d7a70] text-white hover:bg-[#0b665d] px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
