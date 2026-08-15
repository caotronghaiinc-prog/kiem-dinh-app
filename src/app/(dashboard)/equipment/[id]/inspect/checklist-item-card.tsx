"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioPillGroup, type RadioPillOption } from "./radio-pill-group";
import type { ChecklistItem, ChecklistResult, PresenceValue } from "./types";

export interface ChecklistItemState {
  result: ChecklistResult | null;
  presence_value: PresenceValue | null;
  values: Record<string, string>;
  note: string;
}

export const RESULT_OPTIONS: readonly RadioPillOption<ChecklistResult>[] = [
  { value: "dat", label: "Đạt", activeClassName: "border-green-600 bg-green-100 text-green-800" },
  {
    value: "khong_dat",
    label: "Không đạt",
    activeClassName: "border-red-600 bg-red-100 text-red-800",
  },
  {
    value: "khong_danh_gia",
    label: "Không đánh giá",
    activeClassName: "border-gray-500 bg-gray-100 text-gray-800",
  },
];

export const PRESENCE_OPTIONS: readonly RadioPillOption<PresenceValue>[] = [
  { value: "co", label: "Có", activeClassName: "border-blue-600 bg-blue-100 text-blue-800" },
  {
    value: "khong_co",
    label: "Không có",
    activeClassName: "border-gray-500 bg-gray-100 text-gray-800",
  },
];

export function ChecklistItemCard({
  item,
  state,
  onChange,
  showMissing,
}: {
  item: ChecklistItem;
  state: ChecklistItemState;
  onChange: (next: ChecklistItemState) => void;
  showMissing: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-b pb-4 last:border-b-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">
          {item.item_code && <span className="text-muted-foreground">{item.item_code}. </span>}
          {item.title}
        </p>
        {item.technical_requirement && (
          <p className="mt-1 text-xs text-muted-foreground">{item.technical_requirement}</p>
        )}
      </div>

      <RadioPillGroup
        name={`result-${item.id}`}
        value={state.result}
        onChange={(result) => onChange({ ...state, result })}
        options={RESULT_OPTIONS}
      />
      {showMissing && !state.result && (
        <p className="text-xs font-medium text-destructive">Chưa chọn kết quả</p>
      )}

      {item.has_presence_flag && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Ghi chú: Có/không có</span>
          <RadioPillGroup
            name={`presence-${item.id}`}
            value={state.presence_value}
            onChange={(presence_value) => onChange({ ...state, presence_value })}
            options={PRESENCE_OPTIONS}
          />
          {showMissing && !state.presence_value && (
            <p className="text-xs font-medium text-destructive">Chưa chọn Có/không có</p>
          )}
        </div>
      )}

      {item.value_fields.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {item.value_fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                {f.label}
                {f.unit ? ` (${f.unit})` : ""}
              </label>
              <Input
                value={state.values[f.key] ?? ""}
                onChange={(e) =>
                  onChange({ ...state, values: { ...state.values, [f.key]: e.target.value } })
                }
              />
            </div>
          ))}
        </div>
      )}

      <Textarea
        placeholder="Ghi chú (không bắt buộc)"
        className="min-h-[60px]"
        value={state.note}
        onChange={(e) => onChange({ ...state, note: e.target.value })}
      />
    </div>
  );
}
