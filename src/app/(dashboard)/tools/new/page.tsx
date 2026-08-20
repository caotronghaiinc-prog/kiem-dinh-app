import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ToolForm } from "../tool-form";
import type { ProfileOption } from "../types";

export default async function NewToolPage() {
  await requireRole(["admin", "inspector"]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  const custodianOptions: ProfileOption[] = (data ?? []).map((p) => ({
    id: p.id,
    label: p.full_name || p.email,
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Thêm dụng cụ</h1>
      </div>
      <ToolForm mode="create" custodianOptions={custodianOptions} />
    </div>
  );
}
