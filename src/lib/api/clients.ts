import { apiFetch } from "./client";

export interface ClientPayload {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface ClientResponse {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export async function fetchClients(): Promise<ClientResponse[]> {
  return apiFetch<ClientResponse[]>("/clients");
}

export async function createClient(payload: ClientPayload): Promise<ClientResponse> {
  return apiFetch<ClientResponse>("/clients", {
    method: "POST",
    body: JSON.stringify({
      name: payload.name,
      contact_person: payload.contact_person,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
    }),
  });
}

export async function updateClient(id: string, payload: Partial<ClientPayload>): Promise<ClientResponse> {
  return apiFetch<ClientResponse>(`/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteClient(id: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/clients/${id}`, {
    method: "DELETE",
  });
}
