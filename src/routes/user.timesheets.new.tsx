import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth, useRMS } from "@/lib/store";
import { useState } from "react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const Route = createFileRoute("/user/timesheets/new")({
  component: UsertimesheetsnewPage,
});

function UsertimesheetsnewPage() {
  const router = useRouter();
  const addTs = useRMS((s) => s.addTimesheet);
  const resourceId = useAuth((s) => s.resourceId) ?? "177";
  const resourceName = useAuth((s) => s.userName) || "Asra Ghafoor";
  const [hours, setHours] = useState<number[]>(Array(7).fill(7));
  const total = hours.reduce((a, b) => a + (Number(b) || 0), 0);

  return (
    <PageCard title="Submit Timesheet">
      <div className="grid md:grid-cols-3 gap-4 max-w-3xl mb-4">
        <div>
          <Label>Select Year</Label>
          <Input defaultValue="2026" />
        </div>
        <div>
          <Label>Select Week (W/e)</Label>
          <Input defaultValue="07 Jun, 2026" />
        </div>
        <div>
          <Label>Max Hours Allowed</Label>
          <Input defaultValue="35" readOnly />
        </div>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              {days.map((d, i) => (
                <th key={i} className="px-3 py-2 text-left border-r border-slate-200">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {hours.map((h, i) => (
                <td key={i} className="px-3 py-2 border-r border-slate-100">
                  <Input
                    type="number"
                    value={h}
                    onChange={(e) =>
                      setHours((p) => p.map((x, j) => (j === i ? Number(e.target.value) : x)))
                    }
                    className="w-20"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm">
        Total Hours: <strong>{total}</strong>
      </p>
      <div className="mt-4 flex gap-2">
        <Button
          onClick={() => {
            addTs({
              id: "",
              resourceId,
              resourceName,
              weekNumber: 23,
              weekEndDate: "07/Jun/2026",
              totalHours: total,
              status: "pending",
              projectName: "LMS",
              dailyHours: hours,
            });
            router.navigate({ to: "/user/timesheets" });
          }}
        >
          Submit to Admin
        </Button>
        <Button variant="outline" onClick={() => router.history.back()}>
          Cancel
        </Button>
      </div>
    </PageCard>
  );
}
