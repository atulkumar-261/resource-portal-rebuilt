import { useForm } from "react-hook-form";
import { PageCard } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "@tanstack/react-router";
import { useRMS } from "@/lib/store";
import type { Project } from "@/lib/types";

type V = Omit<Project, "id">;

export function ProjectForm({ title, defaults, onSubmit }: { title: string; defaults?: Partial<Project>; onSubmit: (v: V) => void }) {
  const { register, handleSubmit, setValue, watch } = useForm<V>({ defaultValues: { name: "", client: "", startDate: "", endDate: "", status: "active", description: "", ...defaults } });
  const clients = useRMS((s) => s.clients);
  const router = useRouter();
  return (
    <PageCard title={title}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-4 max-w-3xl">
        <div><Label>Project Name</Label><Input {...register("name", { required: true })} /></div>
        <div>
          <Label>Client</Label>
          <Select value={watch("client")} onValueChange={(v) => setValue("client", v)}>
            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Start Date</Label><Input placeholder="DD-MM-YYYY" {...register("startDate")} /></div>
        <div><Label>End Date</Label><Input placeholder="DD-MM-YYYY" {...register("endDate")} /></div>
        <div>
          <Label>Status</Label>
          <Select value={watch("status")} onValueChange={(v: any) => setValue("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2"><Label>Description</Label><Textarea {...register("description")} /></div>
        <div className="md:col-span-2 flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => router.history.back()}>Cancel</Button></div>
      </form>
    </PageCard>
  );
}
