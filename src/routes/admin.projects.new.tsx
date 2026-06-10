import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ProjectForm } from "@/components/shared/ProjectForm";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/projects/new")({
  component: AdminprojectsnewPage,
});

function AdminprojectsnewPage() {
  const add = useRMS((s) => s.addProject);
  const router = useRouter();
  return (
    <ProjectForm
      title="Create Project"
      onSubmit={async (v) => {
        try {
          await add({ ...v, id: "" });
          router.navigate({ to: "/admin/projects" });
        } catch (e) {}
      }}
    />
  );
}
