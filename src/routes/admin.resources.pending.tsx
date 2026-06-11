import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { useRMS } from "@/lib/store";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Trash2, User, ArrowLeft, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveResourceOnboarding } from "@/lib/api/resources";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/resources/pending")({
  component: AdminresourcespendingPage,
});

function AdminresourcespendingPage() {
  const resources = useRMS((s) => s.resources);
  const pending = resources.filter((r) => r.status === "pending");
  const updateResource = useRMS((s) => s.updateResource);
  const del = useRMS((s) => s.deleteResource);
  const router = useRouter();

  const queryClient = useQueryClient();
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveResourceOnboarding(id),
    onSuccess: (_, id) => {
      toast.success("Resource approved!");
      updateResource(id, {
        status: "active",
        approvalStatus: "approved",
        onboardingStatus: "completed"
      });
      queryClient.invalidateQueries({ queryKey: ["resources-dashboard"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve onboarding.");
    }
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  return (
    <PageCard
      title="Pending Resources"
      actions={
        <Link
          to="/admin/resources"
          className="text-sm font-semibold text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Resources
        </Link>
      }
    >
      {pending.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 border border-dashed border-slate-300 rounded-lg">
          <p className="text-sm text-slate-500 font-medium">No pending resources found.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pending.map((r) => (
            <div
              key={r.id}
              className="border border-slate-300 bg-white p-4 relative flex min-h-[180px] shadow-sm hover:shadow-md transition-shadow text-left"
            >
              {/* Left Column: Avatar inside a simple square box */}
              <div className="w-20 h-24 border border-slate-300 bg-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0 mr-4">
                {r.avatarUrl ? (
                  <img src={r.avatarUrl} alt={r.fullName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-stone-400" />
                )}
              </div>

              {/* Right Column: Name, Job Title, Skillset */}
              <div className="flex-1 min-w-0 pr-12 pb-8">
                <h3 className="font-bold text-slate-800 text-[15px] truncate">{r.fullName}</h3>
                <p className="text-xs text-slate-600 font-semibold truncate mt-0.5">{r.jobTitle}</p>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-snug">
                  {r.skillset || "No description provided."}
                </p>
                <div className="mt-3">
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                    Pending Approval
                  </span>
                </div>
              </div>

              {/* Actions: Approve, Delete, Edit */}
              <div className="absolute bottom-3 right-3 flex gap-2 items-center">
                {/* Approve Button */}
                <button
                  onClick={() => handleApprove(r.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-1.5 rounded shadow-sm focus:outline-none transition-colors flex items-center gap-1"
                  title="Approve Resource"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </button>

                {/* Delete Button */}
                <ConfirmDialog
                  trigger={
                    <button
                      className="w-8 h-8 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded flex items-center justify-center transition-colors focus:outline-none"
                      title="Delete Resource"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  }
                  onConfirm={() => del(r.id)}
                />

                {/* Edit Button */}
                <button
                  onClick={() =>
                    router.navigate({ to: "/admin/resources/$id", params: { id: r.id } })
                  }
                  className="w-8 h-8 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded flex items-center justify-center transition-colors focus:outline-none"
                  title="Edit Details"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageCard>
  );
}
