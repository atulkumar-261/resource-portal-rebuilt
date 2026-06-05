import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/payslips/new")({
  component: AdminpayslipsnewPage,
});

function AdminpayslipsnewPage() {
  const add = useRMS((s) => s.addPayslip);
  const resources = useRMS((s) => s.resources);
  const router = useRouter();

  // Form states
  const [month, setMonth] = useState("");
  const [days, setDays] = useState("22");
  const [notes, setNotes] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [fileName, setFileName] = useState("No file chosen");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId) {
      alert("Please select a resource");
      return;
    }

    const r = resources.find((x) => x.id === resourceId);
    add({
      id: "",
      resourceId,
      resourceName: r?.fullName ?? "",
      month,
      days: Number(days) || 0,
      amount: 0, // default amount
      notes,
    });
    router.navigate({ to: "/admin/payslips" });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-300 p-8 max-w-3xl shadow-sm">
      <h2 className="text-[28px] text-[#0d7a70] font-normal mb-8 border-b pb-4">Create Payslip</h2>

      <form
        onSubmit={handleSend}
        className="grid grid-cols-[140px_1fr] gap-x-6 gap-y-5 items-start max-w-2xl text-sm"
      >
        {/* Salary Month */}
        <div className="text-stone-600 pt-1.5">Salary Month :</div>
        <div>
          <input
            type="text"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] focus:outline-none focus:ring-1 focus:ring-teal-500"
            required
          />
        </div>

        {/* Number of Days */}
        <div className="text-stone-600 pt-1.5">Number of Days :</div>
        <div>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] focus:outline-none focus:ring-1 focus:ring-teal-500"
            required
          />
        </div>

        {/* Payslip Notes */}
        <div className="text-stone-600 pt-1.5">Payslip Notes :</div>
        <div>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] h-32 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Payslip File */}
        <div className="text-stone-600 pt-1.5">Payslip File :</div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-stone-100 hover:bg-stone-200 border border-black rounded px-4 py-1.5 text-sm font-semibold text-stone-700 transition-colors inline-block focus:outline-none">
            Choose File
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setFileName(file ? file.name : "No file chosen");
              }}
            />
          </label>
          <span className="text-sm text-stone-600">{fileName}</span>
        </div>

        {/* Resource Dropdown */}
        <div className="text-stone-600 pt-1.5">Resource :</div>
        <div>
          <select
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            className="border border-black rounded px-3 py-1.5 text-sm w-full max-w-[380px] bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            required
          >
            <option value="">Select Resource</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div></div>
        <div className="flex gap-2.5 pt-4">
          <button
            type="submit"
            className="bg-[#0d7a70] text-white hover:bg-[#0b665d] px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors focus:outline-none"
          >
            Send
          </button>
          <button
            type="button"
            onClick={() => router.navigate({ to: "/admin/payslips" })}
            className="bg-[#0d7a70] text-white hover:bg-[#0b665d] px-4 py-2 font-semibold text-sm rounded shadow-sm transition-colors focus:outline-none"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
