import { requireRole } from "@/lib/auth/require-role";
import { CustomerForm } from "../customer-form";

export default async function NewCustomerPage() {
  await requireRole(["admin"]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Thêm khách hàng</h1>
        <p className="text-sm text-muted-foreground">
          Mã khách hàng sẽ được tự động tạo sau khi lưu.
        </p>
      </div>
      <CustomerForm mode="create" />
    </div>
  );
}
