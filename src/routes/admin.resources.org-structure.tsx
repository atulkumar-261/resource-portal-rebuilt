import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, CheckCircle2, XCircle, Search } from "lucide-react";

import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchDepartments,
  fetchDesignations,
  createDepartment,
  updateDepartment,
  updateDepartmentStatus,
  createDesignation,
  updateDesignation,
  updateDesignationStatus,
  type Department,
  type Designation,
} from "@/lib/api/resources";

export const Route = createFileRoute("/admin/resources/org-structure")({
  component: OrgStructurePage,
});

function OrgStructurePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"departments" | "designations">("departments");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");

  const [desigModalOpen, setDesigModalOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  const [desigTitle, setDesigTitle] = useState("");
  const [desigDesc, setDesigDesc] = useState("");

  // Fetching (include inactive)
  const deptsQuery = useQuery({
    queryKey: ["meta-departments", true],
    queryFn: () => fetchDepartments(true),
  });

  const desigsQuery = useQuery({
    queryKey: ["meta-designations", true],
    queryFn: () => fetchDesignations(true),
  });

  // Department Mutations
  const createDeptMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      toast.success("Department created successfully.");
      setDeptModalOpen(false);
      invalidateDeptQueries();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create department.");
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateDepartment(id, payload),
    onSuccess: () => {
      toast.success("Department updated successfully.");
      setDeptModalOpen(false);
      invalidateDeptQueries();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update department.");
    },
  });

  const toggleDeptStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateDepartmentStatus(id, is_active),
    onSuccess: (data) => {
      const statusText = data.is_active ? "activated" : "deactivated";
      toast.success(`Department successfully ${statusText}.`);
      invalidateDeptQueries();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update department status.");
    },
  });

  // Designation Mutations
  const createDesigMutation = useMutation({
    mutationFn: createDesignation,
    onSuccess: () => {
      toast.success("Designation created successfully.");
      setDesigModalOpen(false);
      invalidateDesigQueries();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create designation.");
    },
  });

  const updateDesigMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateDesignation(id, payload),
    onSuccess: () => {
      toast.success("Designation updated successfully.");
      setDesigModalOpen(false);
      invalidateDesigQueries();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update designation.");
    },
  });

  const toggleDesigStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateDesignationStatus(id, is_active),
    onSuccess: (data) => {
      const statusText = data.is_active ? "activated" : "deactivated";
      toast.success(`Designation successfully ${statusText}.`);
      invalidateDesigQueries();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update designation status.");
    },
  });

  const invalidateDeptQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["meta-departments"] });
    queryClient.invalidateQueries({ queryKey: ["meta-departments", true] });
  };

  const invalidateDesigQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["meta-designations"] });
    queryClient.invalidateQueries({ queryKey: ["meta-designations", true] });
  };

  // Open Handlers
  const handleOpenDeptCreate = () => {
    setEditingDept(null);
    setDeptName("");
    setDeptDesc("");
    setDeptModalOpen(true);
  };

  const handleOpenDeptEdit = (dept: Department) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptDesc(dept.description || "");
    setDeptModalOpen(true);
  };

  const handleOpenDesigCreate = () => {
    setEditingDesig(null);
    setDesigTitle("");
    setDesigDesc("");
    setDesigModalOpen(true);
  };

  const handleOpenDesigEdit = (desig: Designation) => {
    setEditingDesig(desig);
    setDesigTitle(desig.title);
    setDesigDesc(desig.description || "");
    setDesigModalOpen(true);
  };

  // Submit Handlers
  const handleDeptSubmit = () => {
    if (!deptName.trim()) {
      toast.error("Department Name is required.");
      return;
    }
    const payload = {
      name: deptName.trim(),
      description: deptDesc.trim() || undefined,
    };
    if (editingDept) {
      updateDeptMutation.mutate({ id: editingDept.id, payload });
    } else {
      createDeptMutation.mutate(payload);
    }
  };

  const handleDesigSubmit = () => {
    if (!desigTitle.trim()) {
      toast.error("Designation Title is required.");
      return;
    }
    const payload = {
      title: desigTitle.trim(),
      description: desigDesc.trim() || undefined,
    };
    if (editingDesig) {
      updateDesigMutation.mutate({ id: editingDesig.id, payload });
    } else {
      createDesigMutation.mutate(payload);
    }
  };

  const departments = deptsQuery.data ?? [];
  const designations = desigsQuery.data ?? [];

  const filteredDepts = departments.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDesigs = designations.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab("departments");
            setSearchQuery("");
          }}
          className={`py-2 px-5 font-semibold text-sm transition-all focus:outline-none border-b-2 -mb-px ${
            activeTab === "departments"
              ? "border-[#2a8f8f] text-[#2a8f8f]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Departments
        </button>
        <button
          onClick={() => {
            setActiveTab("designations");
            setSearchQuery("");
          }}
          className={`py-2 px-5 font-semibold text-sm transition-all focus:outline-none border-b-2 -mb-px ${
            activeTab === "designations"
              ? "border-[#2a8f8f] text-[#2a8f8f]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Designations
        </button>
      </div>

      {activeTab === "departments" ? (
        <PageCard
          title="Departments Management"
          actions={
            <Button
              size="sm"
              onClick={handleOpenDeptCreate}
              className="gap-2 bg-[#2a8f8f] hover:bg-[#206e6e] text-white font-semibold"
            >
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
          }
        >
          <div className="flex items-center gap-2 mb-4 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 max-w-md">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Search departments..."
              className="border-0 shadow-none bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-6 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {deptsQuery.isLoading && <div className="text-center py-8 text-slate-500">Loading departments...</div>}

          {!deptsQuery.isLoading && filteredDepts.length === 0 && (
            <div className="text-center py-8 text-slate-400 border border-dashed rounded bg-slate-50">
              No departments found.
            </div>
          )}

          {!deptsQuery.isLoading && filteredDepts.length > 0 && (
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <th className="p-3 w-1/3">Name</th>
                    <th className="p-3 w-5/12">Description</th>
                    <th className="p-3 w-2/12">Status</th>
                    <th className="p-3 w-1/12 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepts.map((d) => (
                    <tr
                      key={d.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${
                        !d.is_active ? "opacity-60 bg-slate-50/30" : ""
                      }`}
                    >
                      <td className="p-3 font-semibold text-slate-800">{d.name}</td>
                      <td className="p-3 text-slate-500">{d.description || "—"}</td>
                      <td className="p-3">
                        {d.is_active ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 text-[10px] font-bold">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100 text-[10px] font-bold">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDeptEdit(d)}
                          className="p-1 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                          title="Edit Department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {d.is_active ? (
                          <ConfirmDialog
                            title="Deactivate Department?"
                            description={`Are you sure you want to deactivate department "${d.name}"? Dropdowns will hide it, but historical data remains valid.`}
                            onConfirm={() => toggleDeptStatusMutation.mutate({ id: d.id, is_active: false })}
                            trigger={
                              <button
                                className="p-1 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Deactivate"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            }
                          />
                        ) : (
                          <button
                            onClick={() => toggleDeptStatusMutation.mutate({ id: d.id, is_active: true })}
                            className="p-1 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Activate"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageCard>
      ) : (
        <PageCard
          title="Designations Management"
          actions={
            <Button
              size="sm"
              onClick={handleOpenDesigCreate}
              className="gap-2 bg-[#2a8f8f] hover:bg-[#206e6e] text-white font-semibold"
            >
              <Plus className="h-4 w-4" />
              Add Designation
            </Button>
          }
        >
          <div className="flex items-center gap-2 mb-4 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 max-w-md">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Search designations..."
              className="border-0 shadow-none bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-6 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {desigsQuery.isLoading && <div className="text-center py-8 text-slate-500">Loading designations...</div>}

          {!desigsQuery.isLoading && filteredDesigs.length === 0 && (
            <div className="text-center py-8 text-slate-400 border border-dashed rounded bg-slate-50">
              No designations found.
            </div>
          )}

          {!desigsQuery.isLoading && filteredDesigs.length > 0 && (
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <th className="p-3 w-1/3">Title</th>
                    <th className="p-3 w-5/12">Description</th>
                    <th className="p-3 w-2/12">Status</th>
                    <th className="p-3 w-1/12 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDesigs.map((d) => (
                    <tr
                      key={d.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${
                        !d.is_active ? "opacity-60 bg-slate-50/30" : ""
                      }`}
                    >
                      <td className="p-3 font-semibold text-slate-800">{d.title}</td>
                      <td className="p-3 text-slate-500">{d.description || "—"}</td>
                      <td className="p-3">
                        {d.is_active ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 text-[10px] font-bold">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-100 text-[10px] font-bold">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDesigEdit(d)}
                          className="p-1 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                          title="Edit Designation"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {d.is_active ? (
                          <ConfirmDialog
                            title="Deactivate Designation?"
                            description={`Are you sure you want to deactivate designation "${d.title}"? Dropdowns will hide it, but historical data remains valid.`}
                            onConfirm={() => toggleDesigStatusMutation.mutate({ id: d.id, is_active: false })}
                            trigger={
                              <button
                                className="p-1 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Deactivate"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            }
                          />
                        ) : (
                          <button
                            onClick={() => toggleDesigStatusMutation.mutate({ id: d.id, is_active: true })}
                            className="p-1 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Activate"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageCard>
      )}

      {/* Department creation/edit modal */}
      <Dialog open={deptModalOpen} onOpenChange={setDeptModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDept ? "Edit Department" : "Create Department"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 text-sm">
            <div className="grid gap-1.5">
              <Label htmlFor="deptName">Department Name</Label>
              <Input
                id="deptName"
                placeholder="e.g. Sales, Marketing, IT"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                className="border-slate-300"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deptDesc">Description (Optional)</Label>
              <textarea
                id="deptDesc"
                placeholder="Brief summary of department responsibilities..."
                value={deptDesc}
                onChange={(e) => setDeptDesc(e.target.value)}
                rows={3}
                className="border border-slate-300 rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeptSubmit}
              disabled={createDeptMutation.isPending || updateDeptMutation.isPending}
              className="bg-[#2a8f8f] hover:bg-[#206e6e] text-white"
            >
              {editingDept ? "Save Changes" : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Designation creation/edit modal */}
      <Dialog open={desigModalOpen} onOpenChange={setDesigModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDesig ? "Edit Designation" : "Create Designation"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 text-sm">
            <div className="grid gap-1.5">
              <Label htmlFor="desigTitle">Designation Title</Label>
              <Input
                id="desigTitle"
                placeholder="e.g. Senior Software Engineer"
                value={desigTitle}
                onChange={(e) => setDesigTitle(e.target.value)}
                className="border-slate-300"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="desigDesc">Description (Optional)</Label>
              <textarea
                id="desigDesc"
                placeholder="Brief summary of designation scope and guidelines..."
                value={desigDesc}
                onChange={(e) => setDesigDesc(e.target.value)}
                rows={3}
                className="border border-slate-300 rounded-md p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesigModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDesigSubmit}
              disabled={createDesigMutation.isPending || updateDesigMutation.isPending}
              className="bg-[#2a8f8f] hover:bg-[#206e6e] text-white"
            >
              {editingDesig ? "Save Changes" : "Create Designation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
