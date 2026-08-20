import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ToolForm } from "../../tool-form";
import type { ProfileOption, ToolRecord } from "../../types";

export default async function EditToolPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  await requireRole(["admin", "inspector"]);

  const supabase = await createClient();
  const [{ data: tool, error }, { data: profilesData }] = await Promise.all([
    supabase
      .from("inspection_tools")
      .select(
        "id, code, name, model, serial_number, ownership_doc, calibration_due_date, calibration_not_applicable, calibration_cert_no, custodian_id, default_location, status, note"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase.from("profiles").select("id, full_name, email").order("full_name", { ascending: true }),
  ]);

  if (error || !tool) {
    notFound();
  }

  const custodianOptions: ProfileOption[] = (profilesData ?? []).map((p) => ({
    id: p.id,
    label: p.full_name || p.email,
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Sửa dụng cụ</h1>
        <p className="text-sm text-muted-foreground">{tool.name}</p>
      </div>
      <ToolForm mode="edit" tool={tool as unknown as ToolRecord} custodianOptions={custodianOptions} />
    </div>
  );
}
