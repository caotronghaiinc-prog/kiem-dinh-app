"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { EquipmentOption } from "../types";

// Postgrest .or()/.in() dùng dấu phẩy/ngoặc làm ký tự cú pháp -- loại bỏ
// khỏi input người dùng để tránh phá vỡ filter.
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, " ").trim();
}

export function AddEquipmentDialog({
  contractId,
  existingEquipmentIds,
}: {
  contractId: string;
  existingEquipmentIds: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EquipmentOption[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingResults(true);

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
      // Loại trừ thiết bị đã có trong hợp đồng này -- .not("id","in",...)
      // cần ít nhất 1 phần tử, bỏ qua filter này nếu chưa có thiết bị nào.
      if (existingEquipmentIds.length > 0) {
        dbQuery = dbQuery.not("id", "in", `(${existingEquipmentIds.join(",")})`);
      }

      const { data } = await dbQuery;
      if (!cancelled) {
        setResults((data ?? []) as EquipmentOption[]);
        setLoadingResults(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, open, existingEquipmentIds]);

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) {
      setQuery("");
      setResults([]);
      setSelectedIds(new Set());
    }
    setOpen(next);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("contract_equipment").insert(
      Array.from(selectedIds).map((equipmentId) => ({
        contract_id: contractId,
        equipment_id: equipmentId,
      }))
    );

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Thêm thiết bị vào hợp đồng thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: `Đã thêm ${selectedIds.size} thiết bị vào hợp đồng` });
    handleOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          + Thêm thiết bị
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm thiết bị vào hợp đồng</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input
            placeholder="Tìm theo mã TB, tên thiết bị..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto rounded-md border p-2">
            {loadingResults ? (
              <p className="p-2 text-sm text-muted-foreground">Đang tải...</p>
            ) : results.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">
                Không tìm thấy thiết bị phù hợp (hoặc đã có sẵn trong hợp đồng).
              </p>
            ) : (
              results.map((eq) => (
                <label
                  key={eq.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={selectedIds.has(eq.id)}
                    onChange={() => toggleSelected(eq.id)}
                  />
                  <span className="flex-1">
                    <span className="font-medium">{eq.code}</span> — {eq.name}
                    {eq.type && <span className="text-muted-foreground"> ({eq.type})</span>}
                  </span>
                </label>
              ))
            )}
          </div>

          {selectedIds.size > 0 && (
            <p className="text-xs text-muted-foreground">Đã chọn {selectedIds.size} thiết bị.</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => handleOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="button" disabled={submitting || selectedIds.size === 0} onClick={handleSubmit}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Thêm vào hợp đồng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
