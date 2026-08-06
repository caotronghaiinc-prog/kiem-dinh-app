import type { CustomerStatus } from "@/lib/customers/status";

export interface CustomerListItem {
  id: string;
  code: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  status: CustomerStatus;
  // Supabase embeds an aggregate as `[{ count }]` (sometimes a bare object
  // depending on the query shape) — keep both possibilities and normalize
  // via getEquipmentCount().
  equipment: { count: number }[] | { count: number } | null;
}

export function getEquipmentCount(customer: CustomerListItem): number {
  const rel = customer.equipment;
  if (!rel) return 0;
  if (Array.isArray(rel)) return rel[0]?.count ?? 0;
  return rel.count ?? 0;
}

/** Full row shape used by the add/edit customer form. */
export interface CustomerRecord {
  id: string;
  code: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_code: string | null;
  type: string | null;
  industry: string | null;
  source: string | null;
  status: CustomerStatus;
  notes: string | null;
}
