import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2, Eye, Plus, User, KeyRound, Copy, Check } from "lucide-react";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchResources,
  fetchDepartments,
  fetchDesignations,
  createResource,
  deleteResource,
} from "@/lib/api/resources";

export const Route = createFileRoute("/admin/resources/")({
  component: ResourcesPage,
});

const resourcesQueryKey = ["resources-list"];

function ResourcesPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [showCreds, setShowCreds] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const resourcesQuery = useQuery({
    queryKey: resourcesQueryKey,
    queryFn: fetchResources,
  });

  const deptsQuery = useQuery({
    queryKey: ["meta-departments"],
    queryFn: () => fetchDepartments(),
  });

  const desigsQuery = useQuery({
    queryKey: ["meta-designations"],
    queryFn: () => fetchDesignations(),
  });

  const createMutation = useMutation({
    mutationFn: createResource,
    onSuccess: (data) => {
      toast.success("Resource created successfully.");
      setCreateOpen(false);
      setShowCreds(data);
      queryClient.invalidateQueries({ queryKey: resourcesQueryKey });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create resource.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => {
      toast.success("Resource profile deleted and credentials deactivated.");
      queryClient.invalidateQueries({ queryKey: resourcesQueryKey });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete resource.");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Credentials copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const resources = resourcesQuery.data ?? [];
  const departments = deptsQuery.data ?? [];
  const designations = desigsQuery.data ?? [];

  const getDesignationTitle = (id: string) => {
    return designations.find((d) => d.id === id)?.title || "Resource";
  };

  const getDepartmentName = (id: string) => {
    return departments.find((d) => d.id === id)?.name || "N/A";
  };

  const filtered = resources.filter(
    (r) =>
      r.full_name.toLowerCase().includes(q.toLowerCase()) ||
      getDesignationTitle(r.designation_id).toLowerCase().includes(q.toLowerCase()) ||
      r.employee_id.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <PageCard
        title="Resources"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Create Resource
          </Button>
        }
      >
        <div className="flex items-center justify-between mb-6 gap-3">
          <Input
            placeholder="Search resources by name, designation, or ID..."
            className="max-w-md border-slate-300"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {resourcesQuery.isLoading && (
          <div className="text-center py-12 text-slate-500">Loading resources...</div>
        )}

        {!resourcesQuery.isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-slate-50 border border-dashed rounded-lg">
            No active resources found matching search query.
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="border border-slate-200 bg-white p-5 relative flex min-h-[200px] rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
            >
              {/* Left Column: Avatar inside a simple square box */}
              <div className="w-20 h-24 border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden rounded flex-shrink-0 mr-4">
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt={r.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>

              {/* Right Column: Name, Job Title, Description, and Details */}
              <div className="flex-1 min-w-0 pr-12 pb-6">
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-bold text-slate-800 text-[15px] truncate">{r.full_name}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-slate-600 font-semibold truncate">
                      {getDesignationTitle(r.designation_id)}
                    </span>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-slate-100 text-slate-700">
                      {r.employee_id}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                  {r.skillset || "No skillset provided."}
                </p>

                <div className="mt-3 text-[11px] text-slate-600 space-y-0.5">
                  <div>
                    <span className="font-medium text-slate-500">Department:</span>{" "}
                    {getDepartmentName(r.department_id)}
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-slate-500">Email:</span> {r.email}
                  </div>
                </div>
              </div>

              {/* Actions: Delete & Edit */}
              <div className="absolute bottom-3 right-3 flex gap-2">
                <ConfirmDialog
                  title="Delete Resource?"
                  description={`Are you sure you want to delete ${r.full_name}? This will mark their profile as deleted and deactivate their user account login.`}
                  onConfirm={() => deleteMutation.mutate(r.id)}
                  trigger={
                    <button
                      className="w-8 h-8 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded flex items-center justify-center transition-colors focus:outline-none disabled:opacity-50"
                      title="Delete Resource"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  }
                />
                <button
                  onClick={() =>
                    router.navigate({ to: "/admin/resources/$id", params: { id: r.id } })
                  }
                  className="w-8 h-8 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded flex items-center justify-center transition-colors focus:outline-none"
                  title="View / Edit Resource"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </PageCard>

      {/* Resource Creation Dialog */}
      <CreateResourceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        departments={departments}
        designations={designations}
        onSubmit={(payload) => createMutation.mutate(payload)}
        loading={createMutation.isPending}
      />

      {/* Credentials display modal */}
      <Dialog open={!!showCreds} onOpenChange={(open) => !open && setShowCreds(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-700">Resource Created Successfully</DialogTitle>
          </DialogHeader>
          <div className="bg-slate-50 border rounded-lg p-5 space-y-4 font-mono text-sm">
            <div>
              <span className="font-bold text-slate-500 text-xs block uppercase tracking-wider mb-0.5">Full Name:</span>
              <span className="text-slate-800 font-semibold text-base font-sans">{showCreds?.resource?.full_name}</span>
            </div>
            <div className="border-t pt-3">
              <span className="font-bold text-slate-500 text-xs block uppercase tracking-wider mb-0.5">Login ID (Username):</span>
              <span className="text-slate-800 font-bold select-all bg-slate-200 px-2 py-1 rounded border border-slate-300 block w-fit">
                {showCreds?.credentials?.username}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 text-xs block uppercase tracking-wider mb-0.5">Email Address:</span>
              <span className="text-slate-800 select-all font-semibold block">{showCreds?.credentials?.email}</span>
            </div>
            <div className="border-t pt-3">
              <span className="font-bold text-slate-500 text-xs block uppercase tracking-wider mb-0.5">Password:</span>
              <span className="text-emerald-800 font-bold select-all bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-300 block w-fit">
                {showCreds?.credentials?.password}
              </span>
              <p className="text-[11px] text-rose-600 mt-2 italic font-sans font-medium">
                * This password will only be displayed ONCE. Please copy it immediately.
              </p>
            </div>
          </div>
          <DialogFooter className="flex sm:justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const text = `Full Name: ${showCreds?.resource?.full_name}\nLogin ID: ${showCreds?.credentials?.username}\nEmail: ${showCreds?.credentials?.email}\nPassword: ${showCreds?.credentials?.password}`;
                copyToClipboard(text);
              }}
              className="gap-2"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              Copy Credentials
            </Button>
            <Button onClick={() => setShowCreds(null)} className="bg-slate-800 hover:bg-slate-700">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateResourceDialog({
  open,
  onOpenChange,
  departments,
  designations,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: any[];
  designations: any[];
  onSubmit: (payload: any) => void;
  loading: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [skills, setSkills] = useState("");

  const submit = () => {
    if (!fullName.trim()) {
      toast.error("Full Name is required.");
      return;
    }
    if (!email.trim()) {
      toast.error("Email is required.");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!departmentId) {
      toast.error("Department is required.");
      return;
    }
    if (!designationId) {
      toast.error("Designation is required.");
      return;
    }

    onSubmit({
      full_name: fullName.trim(),
      email: email.trim(),
      department_id: departmentId,
      designation_id: designationId,
      skills: skills.trim() || undefined,
    });
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFullName("");
      setEmail("");
      setDepartmentId("");
      setDesignationId("");
      setSkills("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Resource Profile</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 text-sm">
          <div className="grid gap-1.5">
            <Label htmlFor="fullName">Full Name (Compulsory)</Label>
            <Input
              id="fullName"
              placeholder="e.g. Priya Singh"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border-slate-300"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email (Compulsory)</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. priya.singh@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-slate-300"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="department">Department (Compulsory)</Label>
            <select
              id="department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="border border-slate-300 rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Select Department...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="designation">Designation / Role (Compulsory)</Label>
            <select
              id="designation"
              value={designationId}
              onChange={(e) => setDesignationId(e.target.value)}
              className="border border-slate-300 rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Select Designation...</option>
              {designations.map((desig) => (
                <option key={desig.id} value={desig.id}>
                  {desig.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="skills">Skills / Skillset (Optional)</Label>
            <textarea
              id="skills"
              placeholder="e.g. React, Python, PostgreSQL"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              rows={3}
              className="border border-slate-300 rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            Create Profile & User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
