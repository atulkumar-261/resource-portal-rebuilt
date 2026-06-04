import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/tasks/new")({ component: NewTask });

function NewTask() {
  const add = useRMS((s) => s.addTask);
  const resources = useRMS((s) => s.resources);
  const projects = useRMS((s) => s.projects);
  const router = useRouter();
  const { register, handleSubmit, watch, setValue } = useForm({ defaultValues: { subject: "", startDate: "", resourceId: "", project: "", notes: "" }});

  return (
    <PageCard title="Create Task">
      <form onSubmit={handleSubmit((v) => {
        const r = resources.find((x) => x.id === v.resourceId);
        add({ id: "", subject: v.subject, startDate: v.startDate, resourceId: v.resourceId, resourceName: r?.fullName ?? "", project: v.project, notes: v.notes, status: "pending" });
        router.navigate({ to: "/admin/tasks" });
      })} className="grid md:grid-cols-2 gap-4 max-w-3xl">
        <div className="md:col-span-2"><Label>Task Title</Label><Input {...register("subject", { required: true })} /></div>
        <div><Label>Start Date</Label><Input placeholder="DD-MM-YYYY" {...register("startDate")} /></div>
        <div>
          <Label>Resource</Label>
          <Select value={watch("resourceId")} onValueChange={(v) => setValue("resourceId", v)}>
            <SelectTrigger><SelectValue placeholder="Select Resource" /></SelectTrigger>
            <SelectContent>{resources.map((r) => <SelectItem key={r.id} value={r.id}>{r.fullName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Project</Label>
          <Select value={watch("project")} onValueChange={(v) => setValue("project", v)}>
            <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
            <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Label>Task Notes</Label><Textarea rows={5} {...register("notes")} /></div>
        <div className="md:col-span-2 flex gap-2"><Button type="submit">Send</Button><Button type="button" variant="outline" onClick={() => router.history.back()}>Cancel</Button></div>
      </form>
    </PageCard>
  );
}
