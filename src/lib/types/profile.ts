export type UserRole = "admin" | "inspector" | "accountant" | "office";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  active: boolean;
  created_at: string;
}
