"use client";

import { useState, type ChangeEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

const ALLOWED_PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
const PHOTO_COUNT_WARNING_THRESHOLD = 5;

export function validatePhotoFile(file: File): string | null {
  const dotIndex = file.name.lastIndexOf(".");
  const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : "";
  if (!ALLOWED_PHOTO_EXTENSIONS.includes(ext)) {
    return "Chỉ chấp nhận ảnh JPG hoặc PNG.";
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return "Dung lượng ảnh tối đa 10MB.";
  }
  return null;
}

export function PhotoUploadField({
  label,
  files,
  onChange,
  required,
}: {
  label: string;
  files: File[];
  onChange: (files: File[]) => void;
  required: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setInputKey((k) => k + 1);
    if (selected.length === 0) return;

    const rejected: string[] = [];
    const valid: File[] = [];
    for (const file of selected) {
      const err = validatePhotoFile(file);
      if (err) rejected.push(`${file.name}: ${err}`);
      else valid.push(file);
    }
    setError(rejected.length > 0 ? rejected.join(" ") : null);
    if (valid.length > 0) onChange([...files, ...valid]);
  }

  function removeFile(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">
        {label}
        {required ? " *" : ""}
      </label>
      <Input key={inputKey} type="file" accept="image/*" multiple onChange={handleChange} />
      {error && <p className="text-[0.8rem] font-medium text-destructive">{error}</p>}
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="shrink-0 text-destructive"
                aria-label={`Xóa ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length > PHOTO_COUNT_WARNING_THRESHOLD && (
        <p className="text-xs text-amber-600">
          Đã chọn {files.length} ảnh -- nên giữ khoảng {PHOTO_COUNT_WARNING_THRESHOLD} ảnh mỗi mục để biên bản gọn.
        </p>
      )}
    </div>
  );
}
