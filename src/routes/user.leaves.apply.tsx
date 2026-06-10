import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useAuth, useRMS } from "@/lib/store";
import { useState } from "react";

export const Route = createFileRoute("/user/leaves/apply")({
  component: UserleavesapplyPage,
});

function UserleavesapplyPage() {
  const router = useRouter();
  const addLeave = useRMS((s) => s.addLeave);
  const resourceId = useAuth((s) => s.resourceId) ?? "";
  const resourceName = useAuth((s) => s.userName) || "";
  const [mode, setMode] = useState<"single" | "multi">("single");
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      fromDate: "",
      toDate: "",
      totalDays: 1,
      type: "Annual" as const,
      reason: "",
    },
  });

  return (
    <PageCard title="Apply For Leave">
      <div className="grid sm:grid-cols-5 gap-3 mb-4 text-sm">
        {[
          ["Total Leaves (2026)", 20],
          ["Used Leaves", 0],
          ["Balance Leaves", 20],
          ["Unpaid Leaves", 0],
          ["Absent", 0],
        ].map(([k, v]) => (
          <div key={k as string} className="border border-slate-200 rounded p-3 bg-slate-50">
            <div className="text-xs text-slate-500">{k}</div>
            <div className="text-xl font-bold">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 mb-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "single"} onChange={() => setMode("single")} />{" "}
          Single Day
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "multi"} onChange={() => setMode("multi")} /> Multi
          Days
        </label>
      </div>

      <form
        onSubmit={handleSubmit(async (v) => {
          try {
            await addLeave({
              id: "",
              resourceId,
              resourceName,
              fromDate: v.fromDate,
              toDate: mode === "single" ? v.fromDate : v.toDate,
              totalDays: Number(v.totalDays),
              type: v.type as any,
              reason: v.reason,
              status: "pending",
            });
            router.navigate({ to: "/user/leaves" });
          } catch (e) {
            // Error toast is handled by store action
          }
        })}
        className="grid md:grid-cols-2 gap-4 max-w-3xl"
      >
        <div>
          <Label>From Date</Label>
          <Input placeholder="DD-MM-YYYY" {...register("fromDate", { required: true })} />
        </div>
        {mode === "multi" && (
          <div>
            <Label>To Date</Label>
            <Input placeholder="DD-MM-YYYY" {...register("toDate")} />
          </div>
        )}
        <div>
          <Label>Total Days</Label>
          <Input type="number" {...register("totalDays")} />
        </div>
        <div>
          <Label>Leave Type</Label>
          <Select value={watch("type")} onValueChange={(v: any) => setValue("type", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Annual">Annual</SelectItem>
              <SelectItem value="Sick">Sick</SelectItem>
              <SelectItem value="Casual">Casual</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Reason</Label>
          <Textarea {...register("reason")} />
        </div>
        <div className="md:col-span-2 flex gap-2">
          <Button type="submit">Apply</Button>
          <Button type="button" variant="outline" onClick={() => router.history.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </PageCard>
  );
}
