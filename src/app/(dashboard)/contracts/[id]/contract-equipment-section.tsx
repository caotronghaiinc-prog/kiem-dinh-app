"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Wrench } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import { AddEquipmentDialog } from "./add-equipment-dialog";
import type { ContractEquipmentRow } from "../types";

export function ContractEquipmentSection({
  contractId,
  equipment,
  canEdit,
}: {
  contractId: string;
  equipment: ContractEquipmentRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);

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
        {canEdit && (
          <AddEquipmentDialog
            contractId={contractId}
            existingEquipmentIds={equipment.map((e) => e.equipment_id)}
          />
        )}
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
                  <TableHead>Loại</TableHead>
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
                    <TableCell>{row.equipment?.type || "—"}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={removingId === row.id}
                          onClick={() => handleRemove(row.id)}
                        >
                          {removingId === row.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Gỡ
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {equipment.map((row) => (
              <Card key={row.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <Link href={`/equipment/${row.equipment_id}`} className="font-medium hover:underline">
                      {row.equipment?.name || "—"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {row.equipment?.code || "—"} · {row.equipment?.type || "—"}
                    </p>
                  </div>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removingId === row.id}
                      onClick={() => handleRemove(row.id)}
                    >
                      {removingId === row.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Gỡ
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
