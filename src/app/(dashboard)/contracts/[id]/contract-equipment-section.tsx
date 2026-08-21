"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Wrench } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils/currency";
import { getEquipmentModelCode } from "@/lib/equipment/spec-fields";
import { AddEquipmentDialog } from "./add-equipment-dialog";
import { EditContractEquipmentDialog } from "./edit-contract-equipment-dialog";
import { ExportEquipmentListButton } from "./export-equipment-list-button";
import type { ContractEquipmentRow } from "../types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

export function ContractEquipmentSection({
  contractId,
  contractCode,
  contractNo,
  customerName,
  equipment,
  canEdit,
}: {
  contractId: string;
  contractCode: string;
  contractNo: string;
  customerName: string | null;
  equipment: ContractEquipmentRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const totalAmount = equipment.reduce((sum, row) => sum + row.quantity * row.unit_price, 0);

  async function handleRemove(rowId: string) {
    setRemovingId(rowId);
    const supabase = createClient();
    const { error } = await supabase.from("contract_equipment").delete().eq("id", rowId);
    setRemovingId(null);

    if (error) {
      toast({
        variant: "destructive",
        title: "Gỡ thiết bị thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: "Đã gỡ thiết bị khỏi hợp đồng" });
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Thiết bị trong hợp đồng</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ExportEquipmentListButton
            contract={{ code: contractCode, contract_no: contractNo, customer_name: customerName }}
            equipment={equipment}
          />
          {canEdit && (
            <AddEquipmentDialog
              contractId={contractId}
              existingEquipmentIds={equipment.map((e) => e.equipment_id)}
            />
          )}
        </div>
      </div>

      {equipment.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-muted-foreground">
          <Wrench className="h-8 w-8" />
          <p>Chưa có thiết bị nào trong hợp đồng này.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã TB</TableHead>
                  <TableHead>Tên thiết bị</TableHead>
                  <TableHead>Mã hiệu</TableHead>
                  <TableHead>Số chế tạo</TableHead>
                  <TableHead>SL</TableHead>
                  <TableHead>Số tem</TableHead>
                  <TableHead>Ngày kiểm định</TableHead>
                  <TableHead>Đơn giá</TableHead>
                  <TableHead>Thành tiền</TableHead>
                  {canEdit && <TableHead>Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.equipment?.code || "—"}</TableCell>
                    <TableCell>
                      <Link href={`/equipment/${row.equipment_id}`} className="hover:underline">
                        {row.equipment?.name || "—"}
                      </Link>
                    </TableCell>
                    <TableCell>{getEquipmentModelCode(row.equipment?.spec_values) || "—"}</TableCell>
                    <TableCell>{row.equipment?.serial_number || "—"}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{row.so_tem || "—"}</TableCell>
                    <TableCell>{formatDate(row.ngay_kiem_dinh)}</TableCell>
                    <TableCell>{formatCurrency(row.unit_price)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(row.quantity * row.unit_price)}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EditContractEquipmentDialog row={row} />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={removingId === row.id}
                            onClick={() => handleRemove(row.id)}
                          >
                            {removingId === row.id && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Gỡ
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={8} className="text-right font-semibold">
                    Tổng cộng
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(totalAmount)}</TableCell>
                  {canEdit && <TableCell />}
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {equipment.map((row) => (
              <Card key={row.id}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/equipment/${row.equipment_id}`}
                        className="font-medium hover:underline"
                      >
                        {row.equipment?.name || "—"}
                      </Link>
                      <p className="text-xs text-muted-foreground">{row.equipment?.code || "—"}</p>
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      {row.quantity} × {formatCurrency(row.unit_price)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    Thành tiền: {formatCurrency(row.quantity * row.unit_price)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mã hiệu: {getEquipmentModelCode(row.equipment?.spec_values) || "—"} · Số chế
                    tạo: {row.equipment?.serial_number || "—"} · Số tem: {row.so_tem || "—"} · Ngày
                    KĐ: {formatDate(row.ngay_kiem_dinh)}
                  </p>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <EditContractEquipmentDialog row={row} />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={removingId === row.id}
                        onClick={() => handleRemove(row.id)}
                      >
                        {removingId === row.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Gỡ
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            <div className="flex items-center justify-between rounded-md border p-3 text-sm font-semibold">
              <span>Tổng cộng</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
