import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ClientForm } from "@/components/shared/ClientForm";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/clients/new")({ component: NewClient });

function NewClient() {
  const addClient = useRMS((s) => s.addClient);
  const router = useRouter();
  return <ClientForm title="Create Client" onSubmit={(v) => { addClient({ ...v, id: "" }); router.navigate({ to: "/admin/clients" }); }} />;
}
