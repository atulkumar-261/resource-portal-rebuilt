import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ProjectForm } from "@/components/shared/ProjectForm";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/projects/$id/edit")({
  component: AdminprojectsideditPage,
});

function AdminprojectsideditPage() {
  const { id } = Route.useParams();
  const project = useRMS((s) => s.projects.find((p) => p.id === id));
  const update = useRMS((s) => s.updateProject);
  const router = useRouter();
  if (!project) return <p>Not found.</p>;
  return (
    <ProjectForm
      title="Edit Project"
      defaults={project}
      onSubmit={(v) => {
        update(id, v);
        router.navigate({ to: "/admin/projects" });
      }}
    />
  );
}
