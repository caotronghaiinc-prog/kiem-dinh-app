"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_BUCKET } from "@/lib/inspection/form-schema";
import type { InspectionPhotoRow } from "./types";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

const CATEGORY_LABELS: Record<InspectionPhotoRow["category"], string> = {
  tong_the: "Ảnh tổng thể",
  chi_tiet_khong_dat: "Ảnh chi tiết không đạt",
};

/**
 * Bucket "inspection-files" private -- tạo signed URL cho từng ảnh ngay khi
 * component mount (batch qua createSignedUrls), hết hạn sau 10 phút, đúng
 * cơ chế đang dùng cho attachment_url (AttachmentLink) -- khác ở chỗ hiện
 * thumbnail luôn thay vì phải bấm mới xem, đơn giản không cần lightbox.
 */
export function InspectionPhotoThumbnails({ photos }: { photos: InspectionPhotoRow[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (photos.length === 0) return;
    const supabase = createClient();
    supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrls(
        photos.map((p) => p.storage_path),
        SIGNED_URL_TTL_SECONDS
      )
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        for (const d of data) {
          if (d.signedUrl && d.path) map[d.path] = d.signedUrl;
        }
        setUrls(map);
      });
  }, [photos]);

  if (photos.length === 0) return null;

  const groups: Record<InspectionPhotoRow["category"], InspectionPhotoRow[]> = {
    tong_the: [],
    chi_tiet_khong_dat: [],
  };
  for (const p of photos) groups[p.category].push(p);

  return (
    <div className="flex flex-col gap-2">
      {(Object.keys(groups) as InspectionPhotoRow["category"][]).map((category) => {
        const group = groups[category];
        if (group.length === 0) return null;
        return (
          <div key={category} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[category]}</span>
            <div className="flex flex-wrap gap-2">
              {group.map((photo) =>
                urls[photo.storage_path] ? (
                  <a
                    key={photo.id}
                    href={urls[photo.storage_path]}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed URL động, không cấu hình được domain cho next/image */}
                    <img
                      src={urls[photo.storage_path]}
                      alt=""
                      className="h-12 w-12 rounded-md border object-cover"
                    />
                  </a>
                ) : (
                  <div key={photo.id} className="h-12 w-12 animate-pulse rounded-md border bg-muted" />
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
