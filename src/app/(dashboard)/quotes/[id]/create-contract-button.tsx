import Link from "next/link";
import { Button } from "@/components/ui/button";

// PROMPT-60 mục 7: chỉ bật khi báo giá đã gắn 1 customer_id thật -- hợp đồng
// bắt buộc phải có khách hàng thật trong /customers, báo giá cho khách chưa
// tồn tại phải được gán vào 1 customer thật trước (sửa lại báo giá) mới tạo
// hợp đồng được. Không cho tạo lại lần 2 -- converted_contract_id chỉ set 1
// lần, có giá trị thì hiện link tới hợp đồng đã tạo thay vào đó.
export function CreateContractButton({
  quoteId,
  hasCustomer,
  convertedContractId,
  convertedContractCode,
}: {
  quoteId: string;
  hasCustomer: boolean;
  convertedContractId: string | null;
  convertedContractCode: string | null;
}) {
  if (convertedContractId) {
    return (
      <Button asChild variant="outline">
        <Link href={`/contracts/${convertedContractId}`}>
          Đã tạo hợp đồng: {convertedContractCode ?? convertedContractId}
        </Link>
      </Button>
    );
  }

  if (!hasCustomer) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button disabled>Tạo hợp đồng</Button>
        <p className="max-w-xs text-right text-xs text-muted-foreground">
          Báo giá chưa gắn khách hàng có sẵn trong hệ thống -- sửa báo giá để chọn khách hàng trước
          khi tạo hợp đồng.
        </p>
      </div>
    );
  }

  return (
    <Button asChild>
      <Link href={`/contracts/new?fromQuote=${quoteId}`}>Tạo hợp đồng</Link>
    </Button>
  );
}
