"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackageOpen } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/role-gate";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import { LoanDialog } from "./loan-dialog";
import type { CustomerOption, LoanRow, ProfileOption } from "../types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LoanHistorySection({
  toolId,
  loans,
  canEdit,
  hasActiveLoan,
  borrowerOptions,
  customerOptions,
}: {
  toolId: string;
  loans: LoanRow[];
  canEdit: boolean;
  hasActiveLoan: boolean;
  borrowerOptions: ProfileOption[];
  customerOptions: CustomerOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [returningId, setReturningId] = useState<string | null>(null);

  async function handleReturn(loanId: string) {
    setReturningId(loanId);
    const supabase = createClient();
    const { error } = await supabase
      .from("inspection_tool_loans")
      .update({ returned_at: todayIso() })
      .eq("id", loanId);

    setReturningId(null);

    if (error) {
      toast({
        variant: "destructive",
        title: "Trả dụng cụ thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: "Đã ghi nhận trả dụng cụ" });
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Lịch sử mượn/trả</h2>
        {canEdit && !hasActiveLoan && (
          <LoanDialog
            toolId={toolId}
            borrowerOptions={borrowerOptions}
            customerOptions={customerOptions}
          />
        )}
      </div>

      {loans.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-muted-foreground">
          <PackageOpen className="h-8 w-8" />
          <p>Chưa có lượt mượn nào.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người mượn</TableHead>
                  <TableHead>Ngày mượn</TableHead>
                  <TableHead>Đang làm ở đâu</TableHead>
                  <TableHead>Ngày trả</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  {canEdit && <TableHead>Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => {
                  const isActive = loan.returned_at === null;
                  return (
                    <TableRow key={loan.id}>
                      <TableCell>{loan.borrower?.full_name || "—"}</TableCell>
                      <TableCell>{formatDate(loan.borrowed_at)}</TableCell>
                      <TableCell>{loan.work_location || "—"}</TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                            Đang mượn
                          </Badge>
                        ) : (
                          formatDate(loan.returned_at)
                        )}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate" title={loan.note ?? undefined}>
                        {loan.note || "—"}
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          {isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={returningId === loan.id}
                              onClick={() => handleReturn(loan.id)}
                            >
                              {returningId === loan.id && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Trả dụng cụ
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {loans.map((loan) => {
              const isActive = loan.returned_at === null;
              return (
                <Card key={loan.id}>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{loan.borrower?.full_name || "—"}</p>
                      {isActive && (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                          Đang mượn
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <span>Ngày mượn: {formatDate(loan.borrowed_at)}</span>
                      <span>Nơi làm việc: {loan.work_location || "—"}</span>
                      <span>Ngày trả: {formatDate(loan.returned_at)}</span>
                      {loan.customer && <span>Khách hàng: {loan.customer.company_name}</span>}
                      {loan.note && <span>Ghi chú: {loan.note}</span>}
                    </div>
                    {canEdit && isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        disabled={returningId === loan.id}
                        onClick={() => handleReturn(loan.id)}
                      >
                        {returningId === loan.id && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Trả dụng cụ
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
