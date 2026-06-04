import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRMS } from "@/lib/store";
import { useState } from "react";

export const Route = createFileRoute("/user/tasks/$id")({ component: () => {
  const { id } = Route.useParams();
  const task = useRMS((s) => s.tasks.find((t) => t.id === id));
  const update = useRMS((s) => s.updateTask);
  const router = useRouter();
  const [status, setStatus] = useState(task?.status ?? "pending");
  const [notes, setNotes] = useState(task?.notes ?? "");
  if (!task) return <PageCard title="Task"><p>Not found.</p></PageCard>;
  return (
    <PageCard title="View Task">
      <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
        <div className="md:col-span-2"><Label>Task Description</Label><Input defaultValue={task.subject} readOnly /></div>
        <div><Label>Start Date</Label><Input defaultValue={task.startDate} readOnly /></div>
        <div><Label>Project</Label><Input defaultValue={task.project} readOnly /></div>
        <div className="md:col-span-2"><Label>Task Notes (Append on top)</Label><Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <div>
          <Label>Task Update</Label>
          <Select value={status} onValueChange={(v: any) => setStatus(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 flex gap-2">
          <Button onClick={() => { update(id, { status, notes }); router.navigate({ to: "/user/tasks" }); }}>Update</Button>
          <Button variant="outline" onClick={() => router.history.back()}>Cancel</Button>
        </div>
      </div>
    </PageCard>
  );
}});
