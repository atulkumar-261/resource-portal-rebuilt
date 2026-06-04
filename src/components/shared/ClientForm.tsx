import { useForm } from "react-hook-form";
import { PageCard } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@tanstack/react-router";
import type { Client } from "@/lib/types";

type Values = Omit<Client, "id">;

export function ClientForm({ title, defaults, onSubmit }: { title: string; defaults?: Partial<Client>; onSubmit: (v: Values) => void }) {
  const { register, handleSubmit } = useForm<Values>({ defaultValues: { name: "", contactPerson: "", email: "", phone: "", address: "", ...defaults } });
  const router = useRouter();
  return (
    <PageCard title={title}>
      <form onSubmit={handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-4 max-w-3xl">
        <div><Label>Name</Label><Input {...register("name", { required: true })} /></div>
        <div><Label>Contact Person</Label><Input {...register("contactPerson")} /></div>
        <div><Label>Email</Label><Input type="email" {...register("email")} /></div>
        <div><Label>Phone</Label><Input {...register("phone")} /></div>
        <div className="md:col-span-2"><Label>Address</Label><Textarea {...register("address")} /></div>
        <div className="md:col-span-2 flex gap-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => router.history.back()}>Cancel</Button></div>
      </form>
    </PageCard>
  );
}
