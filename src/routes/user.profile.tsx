import { createFileRoute } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth, useRMS } from "@/lib/store";
import { useForm } from "react-hook-form";

export const Route = createFileRoute("/user/profile")({ component: MyProfile });

function MyProfile() {
  const resourceId = useAuth((s) => s.resourceId);
  const resource = useRMS((s) => s.resources.find((r) => r.id === resourceId)) ?? useRMS.getState().resources[0];
  const update = useRMS((s) => s.updateResource);
  const { register, handleSubmit } = useForm({ defaultValues: resource });

  return (
    <PageCard title="My Profile">
      <form onSubmit={handleSubmit((v) => update(resource.id, v))} className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-2xl flex items-center justify-center">{resource.fullName.charAt(0)}</div>
          <div>
            <div className="text-lg font-semibold">{resource.fullName}</div>
            <div className="text-sm text-slate-500">{resource.jobTitle}</div>
            <div className="text-xs text-slate-500">Employee ID: {resource.employeeId}</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Full Name</Label><Input {...register("fullName")} /></div>
          <div><Label>Job Title</Label><Input {...register("jobTitle")} /></div>
          <div><Label>Email Address</Label><Input {...register("email")} /></div>
          <div><Label>Phone</Label><Input {...register("phone")} /></div>
          <div className="md:col-span-2"><Label>Skillset / Notes</Label><Textarea rows={3} {...register("skillset")} /></div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Documents</h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div><Label>Profile Picture</Label><Input type="file" accept="image/*" /></div>
            <div><Label>Upload CV</Label><Input type="file" accept=".pdf,.doc,.docx" /></div>
            <div><Label>Passport Copy</Label><Input type="file" /></div>
            <div><Label>Visa Copy</Label><Input type="file" /></div>
            <div><Label>Holiday Sheet</Label><Input type="file" /></div>
            <div><Label>Other Documents</Label><Input type="file" /></div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Personal Details</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Date of Birth (DD-MM-YYYY)</Label><Input {...register("dob")} /></div>
            <div><Label>Passport Number</Label><Input {...register("passportNumber")} /></div>
            <div><Label>Passport Expiry</Label><Input {...register("passportExpiry")} /></div>
            <div><Label>Visa Number</Label><Input {...register("visaNumber")} /></div>
            <div><Label>Visa Expiry</Label><Input {...register("visaExpiry")} /></div>
            <div><Label>NI Number</Label><Input {...register("niNumber")} /></div>
            <div><Label>Citizen of</Label><Input {...register("citizenOf")} /></div>
            <div className="md:col-span-2"><Label>Contact Address</Label><Input {...register("address")} /></div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Bank Details</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Account No.</Label><Input {...register("bankAccount")} /></div>
            <div><Label>Sort Code</Label><Input {...register("sortCode")} /></div>
            <div><Label>Bank Name & Address</Label><Input {...register("bankName")} /></div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Emergency Contact Details</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Contact Person</Label><Input {...register("emergencyName")} /></div>
            <div><Label>Contact Phone</Label><Input {...register("emergencyPhone")} /></div>
            <div><Label>Contact Email</Label><Input {...register("emergencyEmail")} /></div>
            <div><Label>Contact Address</Label><Input {...register("emergencyAddress")} /></div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Change Password</h3>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Current Password</Label><Input type="password" /></div>
            <div><Label>New Password</Label><Input type="password" /></div>
            <div><Label>Confirm Password</Label><Input type="password" /></div>
          </div>
        </div>

        <div className="flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="outline">Cancel</Button></div>
      </form>
    </PageCard>
  );
}
