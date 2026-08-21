import { Receipt } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { PaymentDialog } from "./payment-dialog";
import type { ContractPaymentRow } from "../types";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("vi-VN");
}

export function ContractPaymentsSection({
  contractId,
  payments,
  totalValue,
  paidTotal,
  canEdit,
}: {
  contractId: string;
  payments: ContractPaymentRow[];
  totalValue: number;
  paidTotal: number;
  canEdit: boolean;
}) {
  const debt = totalValue - paidTotal;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Lịch sử thanh toán</h2>
        {canEdit && <PaymentDialog contractId={contractId} />}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1 rounded-md border p-3">
          <span className="text-xs text-muted-foreground">Giá trị hợp đồng</span>
          <span className="text-sm font-bold">{formatCurrency(totalValue)}</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-md border p-3">
          <span className="text-xs text-muted-foreground">Đã thu</span>
          <span className="text-sm font-bold text-green-600">{formatCurrency(paidTotal)}</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-md border p-3">
          <span className="text-xs text-muted-foreground">Còn nợ</span>
          <span className={`text-sm font-bold ${debt > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatCurrency(debt)}
          </span>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-muted-foreground">
          <Receipt className="h-8 w-8" />
          <p>Chưa có đợt thanh toán nào được ghi nhận.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày thu</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Hình thức</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead>Người tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paid_date)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.method || "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={payment.note ?? undefined}>
                      {payment.note || "—"}
                    </TableCell>
                    <TableCell>{payment.created_by?.full_name || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {payments.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="flex flex-col gap-1 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <span className="text-sm text-muted-foreground">{formatDate(payment.paid_date)}</span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span>Hình thức: {payment.method || "—"}</span>
                    <span>Người tạo: {payment.created_by?.full_name || "—"}</span>
                    {payment.note && <span>Ghi chú: {payment.note}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
