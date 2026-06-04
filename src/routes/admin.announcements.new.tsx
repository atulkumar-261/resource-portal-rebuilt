import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useForm } from "react-hook-form";
import { useRMS } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/announcements/new")({ component: () => {
  const add = useRMS((s) => s.addAnnouncement);
  const router = useRouter();
  const { register, handleSubmit } = useForm({ defaultValues: { subject: "", message: "" }});
  return (
    <PageCard title="Add Announcement">
      <form onSubmit={handleSubmit((v) => {
        add({ id: "", subject: v.subject, message: v.message, date: new Date().toLocaleDateString("en-GB").replace(/\//g, "-") });
        router.navigate({ to: "/admin/announcements" });
      })} className="space-y-4 max-w-2xl">
        <div><Label>Subject</Label><Input {...register("subject", { required: true })} /></div>
        <div><Label>Message</Label><Textarea rows={5} {...register("message", { required: true })} /></div>
        <div className="flex gap-2"><Button type="submit">Send</Button><Button type="button" variant="outline" onClick={() => router.history.back()}>Cancel</Button></div>
      </form>
    </PageCard>
  );
}});
