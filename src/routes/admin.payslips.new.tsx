import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useForm } from "react-hook-form";
import { useRMS } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/admin/payslips/new")({ component: () => {
  const add = useRMS((s) => s.addPayslip);
  const resources = useRMS((s) => s.resources);
  const router = useRouter();
  const { register, handleSubmit, watch, setValue } = useForm({ defaultValues: { resourceId: "", month: "", days: 22, amount: 0, notes: "" }});
  return (
    <PageCard title="Create Payslip">
      <form onSubmit={handleSubmit((v) => {
        const r = resources.find((x) => x.id === v.resourceId);
        add({ id: "", resourceId: v.resourceId, resourceName: r?.fullName ?? "", month: v.month, days: Number(v.days), amount: Number(v.amount), notes: v.notes });
        router.navigate({ to: "/admin/payslips" });
      })} className="grid md:grid-cols-2 gap-4 max-w-3xl">
        <div>
          <Label>Resource</Label>
          <Select value={watch("resourceId")} onValueChange={(v) => setValue("resourceId", v)}>
            <SelectTrigger><SelectValue placeholder="Select Resource" /></SelectTrigger>
            <SelectContent>{resources.map((r) => <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Payslip Month</Label><Input placeholder="e.g. April 2026" {...register("month")} /></div>
        <div><Label>Number of Days</Label><Input type="number" {...register("days")} /></div>
        <div><Label>Amount (£)</Label><Input type="number" {...register("amount")} /></div>
        <div className="md:col-span-2"><Label>Notes</Label><Textarea {...register("notes")} /></div>
        <div className="md:col-span-2 flex gap-2"><Button type="submit">Send</Button><Button type="button" variant="outline" onClick={() => router.history.back()}>Cancel</Button></div>
      </form>
    </PageCard>
  );
}});
