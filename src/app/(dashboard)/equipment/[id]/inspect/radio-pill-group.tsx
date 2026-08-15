"use client";

import { cn } from "@/lib/utils";

export interface RadioPillOption<T extends string> {
  value: T;
  label: string;
  activeClassName: string;
}

/**
 * Radio "dạng nút" -- input radio thật (giữ hành vi/keyboard native) ẩn qua
 * sr-only, hiển thị bằng label bấm được, cao 44px cho vừa ngón tay trên
 * mobile (đúng chuẩn ~44px đã dùng ở PROMPT-14 cho nút icon-only).
 */
export function RadioPillGroup<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T | null;
  onChange: (value: T) => void;
  options: readonly RadioPillOption<T>[];
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "flex h-11 min-w-[92px] cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
            value === opt.value
              ? opt.activeClassName
              : "border-input bg-transparent text-muted-foreground hover:bg-accent"
          )}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
