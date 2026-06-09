import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/profile")({
  component: () => (
    <PageCard title="Admin Profile">
      <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
        <div>
          <Label>Full Name</Label>
          <Input defaultValue="Admin" />
        </div>
      </div>
      <h2 className="font-semibold text-slate-800 mt-6 mb-2">Change Password</h2>
      <div className="grid md:grid-cols-3 gap-4 max-w-3xl">
        <div>
          <Label>Current Password</Label>
          <Input type="password" />
        </div>
        <div>
          <Label>New Password</Label>
          <Input type="password" />
        </div>
        <div>
          <Label>Confirm Password</Label>
          <Input type="password" />
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <Button>Save</Button>
        <Button variant="outline">Cancel</Button>
      </div>
    </PageCard>
  ),
});
