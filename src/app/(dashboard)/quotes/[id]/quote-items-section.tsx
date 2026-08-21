"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ListChecks } from "lucide-react";
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
import { QuoteItemDialog } from "./quote-item-dialog";
import type { QuoteItemRow } from "../types";

export function QuoteItemsSection({
  quoteId,
  items,
  canEdit,
}: {
  quoteId: string;
  items: QuoteItemRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const totalAmount = items.reduce((sum, row) => sum + row.quantity * row.unit_price, 0);

  async function handleRemove(itemId: string) {
    setRemovingId(itemId);
    const supabase = createClient();
    const { error } = await supabase.from("quote_items").delete().eq("id", itemId);
    setRemovingId(null);

    if (error) {
      toast({
        variant: "destructive",
        title: "Xóa hạng mục thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: "Đã xóa hạng mục" });
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Hạng mục báo giá</h2>
        {canEdit && <QuoteItemDialog quoteId={quoteId} mode="add" />}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-muted-foreground">
          <ListChecks className="h-8 w-8" />
          <p>Chưa có hạng mục nào trong báo giá này.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên hạng mục</TableHead>
                  <TableHead>Thiết bị liên kết</TableHead>
                  <TableHead>ĐVT</TableHead>
                  <TableHead>SL</TableHead>
                  <TableHead>Đơn giá</TableHead>
                  <TableHead>Thành tiền</TableHead>
                  {canEdit && <TableHead>Thao tác</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.item_name}</TableCell>
                    <TableCell>
                      {row.equipment_id && row.equipment ? (
                        <Link href={`/equipment/${row.equipment_id}`} className="hover:underline">
                          {row.equipment.code}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{row.unit || "—"}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{formatCurrency(row.unit_price)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(row.quantity * row.unit_price)}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <QuoteItemDialog quoteId={quoteId} mode="edit" item={row} />
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={removingId === row.id}
                            onClick={() => handleRemove(row.id)}
                          >
                            {removingId === row.id && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Xóa
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-semibold">
                    Tổng cộng
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(totalAmount)}</TableCell>
                  {canEdit && <TableCell />}
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {items.map((row) => (
              <Card key={row.id}>
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.item_name}</p>
                      {row.equipment_id && row.equipment && (
                        <Link
                          href={`/equipment/${row.equipment_id}`}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {row.equipment.code}
                        </Link>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-medium">
                      {row.quantity} × {formatCurrency(row.unit_price)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    Thành tiền: {formatCurrency(row.quantity * row.unit_price)}
                  </p>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <QuoteItemDialog quoteId={quoteId} mode="edit" item={row} />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={removingId === row.id}
                        onClick={() => handleRemove(row.id)}
                      >
                        {removingId === row.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Xóa
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
