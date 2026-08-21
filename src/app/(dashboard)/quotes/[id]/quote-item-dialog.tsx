"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatNumberInput } from "@/lib/utils/currency";
import {
  quoteItemFormSchema,
  QUOTE_ITEM_EMPTY_VALUES,
  type QuoteItemFormValues,
} from "@/lib/quotes/item-form-schema";
import type { EquipmentOption, QuoteItemRow } from "../types";

// Postgrest .or() dùng dấu phẩy/ngoặc làm ký tự cú pháp -- loại bỏ khỏi
// input người dùng để tránh phá vỡ filter.
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, " ").trim();
}

interface LinkedEquipment {
  id: string;
  code: string;
  name: string;
}

function EquipmentLinkPicker({
  linked,
  onLink,
  onUnlink,
}: {
  linked: LinkedEquipment | null;
  onLink: (equipment: LinkedEquipment) => void;
  onUnlink: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EquipmentOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    const handle = setTimeout(async () => {
      const supabase = createClient();
      const term = sanitizeSearchTerm(query);
      let dbQuery = supabase
        .from("equipment")
        .select("id, code, name, type")
        .order("name", { ascending: true })
        .limit(20);
      if (term) {
        dbQuery = dbQuery.or(`code.ilike.%${term}%,name.ilike.%${term}%`);
      }
      const { data } = await dbQuery;
      if (!cancelled) {
        setResults((data ?? []) as EquipmentOption[]);
        setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, open]);

  if (linked) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
        <span>
          Đã liên kết: <span className="font-medium">{linked.code}</span> — {linked.name}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onUnlink}>
          Bỏ liên kết
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Liên kết thiết bị có sẵn
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-2">
      <Input
        placeholder="Tìm theo mã TB, tên thiết bị..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {loading ? (
          <p className="p-2 text-sm text-muted-foreground">Đang tải...</p>
        ) : results.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">Không tìm thấy thiết bị phù hợp.</p>
        ) : (
          results.map((eq) => (
            <button
              type="button"
              key={eq.id}
              className="flex flex-col rounded-md p-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onLink({ id: eq.id, code: eq.code, name: eq.name });
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="font-medium">{eq.code}</span>
              <span className="text-muted-foreground">{eq.name}</span>
            </button>
          ))
        )}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Đóng
      </Button>
    </div>
  );
}

interface QuoteItemDialogProps {
  quoteId: string;
  mode: "add" | "edit";
  item?: QuoteItemRow;
}

export function QuoteItemDialog({ quoteId, mode, item }: QuoteItemDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [linkedEquipment, setLinkedEquipment] = useState<LinkedEquipment | null>(
    item?.equipment_id && item.equipment ? { id: item.equipment_id, ...item.equipment } : null
  );

  const emptyValues: QuoteItemFormValues =
    mode === "edit" && item
      ? {
          item_name: item.item_name,
          unit: item.unit ?? "",
          quantity: String(item.quantity),
          unit_price: String(item.unit_price),
          note: item.note ?? "",
        }
      : QUOTE_ITEM_EMPTY_VALUES;

  const form = useForm<QuoteItemFormValues>({
    resolver: zodResolver(quoteItemFormSchema),
    defaultValues: emptyValues,
  });

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) {
      form.reset(emptyValues);
      setLinkedEquipment(
        item?.equipment_id && item.equipment ? { id: item.equipment_id, ...item.equipment } : null
      );
    }
    setOpen(next);
  }

  async function onSubmit(values: QuoteItemFormValues) {
    setSubmitting(true);
    const supabase = createClient();

    const payload = {
      item_name: values.item_name,
      unit: values.unit || null,
      quantity: Number(values.quantity),
      unit_price: Number(values.unit_price),
      note: values.note || null,
      equipment_id: linkedEquipment?.id ?? null,
    };

    const { error } =
      mode === "add"
        ? await supabase.from("quote_items").insert({ ...payload, quote_id: quoteId })
        : await supabase.from("quote_items").update(payload).eq("id", item!.id);

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: mode === "add" ? "Thêm hạng mục thất bại" : "Cập nhật hạng mục thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: mode === "add" ? "Đã thêm hạng mục" : "Đã cập nhật hạng mục" });
    if (mode === "add") form.reset(QUOTE_ITEM_EMPTY_VALUES);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {mode === "add" ? (
          <Button size="sm">+ Thêm hạng mục</Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" />
            Sửa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Thêm hạng mục báo giá" : "Sửa hạng mục báo giá"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="item_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên hạng mục *</FormLabel>
                  <FormControl>
                    <Input placeholder="Kiểm định cầu trục 5 tấn..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <EquipmentLinkPicker
              linked={linkedEquipment}
              onLink={setLinkedEquipment}
              onUnlink={() => setLinkedEquipment(null)}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn vị tính</FormLabel>
                    <FormControl>
                      <Input placeholder="Cái" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số lượng *</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn giá (đ) *</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        placeholder="5.000.000"
                        value={formatNumberInput(field.value)}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ""))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ghi chú thêm..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
