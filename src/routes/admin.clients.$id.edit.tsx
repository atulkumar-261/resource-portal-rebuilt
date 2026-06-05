import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ClientForm } from "@/components/shared/ClientForm";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/clients/$id/edit")({ component: EditClient });

function EditClient() {
  const { id } = Route.useParams();
  const client = useRMS((s) => s.clients.find((c) => c.id === id));
  const updateClient = useRMS((s) => s.updateClient);
  const router = useRouter();
  if (!client) return <p>Not found.</p>;
  return (
    <ClientForm
      title="Edit Client"
      defaults={client}
      onSubmit={(v) => {
        updateClient(id, v);
        router.navigate({ to: "/admin/clients" });
      }}
    />
  );
}
