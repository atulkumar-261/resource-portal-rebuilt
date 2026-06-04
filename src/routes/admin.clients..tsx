import { createFileRoute, Link } from "@tanstack/react-router";
import { PageCard } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useRMS } from "@/lib/store";

export const Route = createFileRoute("/admin/clients/")({ component: ViewClient });

function ViewClient() {
  const { id } = Route.useParams();
  const client = useRMS((s) => s.clients.find((c) => c.id === id));
  if (!client) return <PageCard title="Client"><p>Not found.</p></PageCard>;
  return (
    <PageCard title={`Client — ${client.name}`} actions={<Link to="/admin/clients/$id/edit" params={{ id }}><Button size="sm">Edit</Button></Link>}>
      <dl className="grid md:grid-cols-2 gap-4 text-sm">
        <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{client.name}</dd></div>
        <div><dt className="text-slate-500">Contact Person</dt><dd className="font-medium">{client.contactPerson}</dd></div>
        <div><dt className="text-slate-500">Email</dt><dd className="font-medium">{client.email}</dd></div>
        <div><dt className="text-slate-500">Phone</dt><dd className="font-medium">{client.phone}</dd></div>
        <div className="md:col-span-2"><dt className="text-slate-500">Address</dt><dd className="font-medium">{client.address}</dd></div>
      </dl>
    </PageCard>
  );
}
