"use client";

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_BUCKET } from "@/lib/inspection/form-schema";

const TEMPLATE_URL = "/report-templates/thiet-bi-nang-cau-truc.docx";
// Ảnh chụp hiện trường tỷ lệ khác nhau -- scale-down giữ đúng tỷ lệ trong
// khung tối đa này (px), không hardcode 1 kích thước cố định.
const IMAGE_MAX_WIDTH_PX = 420;
const IMAGE_MAX_HEIGHT_PX = 320;
const SIGNED_URL_TTL_SECONDS = 60 * 5;

function scaleToFit(width: number, height: number): [number, number] {
  // Math.min(...,1) -- không phóng to ảnh nhỏ hơn khung.
  const ratio = Math.min(IMAGE_MAX_WIDTH_PX / width, IMAGE_MAX_HEIGHT_PX / height, 1);
  return [Math.round(width * ratio), Math.round(height * ratio)];
}

/**
 * Tải HẾT ảnh trước (Promise.all) rồi mới gọi docxtemplater -- image module
 * bản free không hỗ trợ getImage/getSize async ổn định, nên build sẵn
 * Map<storage_path, ArrayBuffer> + Map<storage_path, [w,h]> để getImage/
 * getSize (đồng bộ, do docxtemplater gọi) chỉ đọc từ map có sẵn.
 */
async function loadPhotoBuffers(storagePaths: string[]): Promise<{
  buffers: Map<string, ArrayBuffer>;
  sizes: Map<string, [number, number]>;
}> {
  const buffers = new Map<string, ArrayBuffer>();
  const sizes = new Map<string, [number, number]>();
  if (storagePaths.length === 0) return { buffers, sizes };

  const supabase = createClient();
  const { data: signedUrls, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS);

  if (error || !signedUrls) {
    throw new Error("Không tạo được signed URL cho ảnh kiểm định.");
  }

  await Promise.all(
    signedUrls.map(async (entry) => {
      if (!entry.signedUrl || !entry.path) {
        throw new Error(`Không lấy được signed URL cho ảnh: ${entry.path ?? "(không rõ)"}`);
      }
      const response = await fetch(entry.signedUrl);
      if (!response.ok) {
        throw new Error(`Không tải được ảnh: ${entry.path}`);
      }
      const buffer = await response.arrayBuffer();
      buffers.set(entry.path, buffer);

      const bitmap = await createImageBitmap(new Blob([buffer]));
      sizes.set(entry.path, scaleToFit(bitmap.width, bitmap.height));
      bitmap.close();
    })
  );

  return { buffers, sizes };
}

export interface GenerateReportResult {
  fileName: string;
}

/**
 * Merge data vào mẫu Word + tải file .docx về máy. Tải template + ảnh song
 * song, build map ảnh trước khi khởi tạo Docxtemplater (xem loadPhotoBuffers).
 */
export async function generateThietBiNangCauTrucReport(
  data: Record<string, unknown>,
  photoStoragePaths: string[],
  fileName: string
): Promise<GenerateReportResult> {
  const [templateResponse, { buffers, sizes }] = await Promise.all([
    fetch(TEMPLATE_URL),
    loadPhotoBuffers(photoStoragePaths),
  ]);

  if (!templateResponse.ok) {
    throw new Error("Không tải được file mẫu Word.");
  }
  const templateArrayBuffer = await templateResponse.arrayBuffer();

  const imageModule = new ImageModule({
    getImage: (tagValue: string) => {
      const buffer = buffers.get(tagValue);
      if (!buffer) throw new Error(`Thiếu dữ liệu ảnh cho: ${tagValue}`);
      return buffer;
    },
    getSize: (_imgBuffer: ArrayBuffer, tagValue: string) => {
      return sizes.get(tagValue) ?? [IMAGE_MAX_WIDTH_PX, IMAGE_MAX_HEIGHT_PX];
    },
  });

  const zip = new PizZip(templateArrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Không crash nếu lỡ sót tag nào chưa map -- thà in ô trống còn hơn
    // văng lỗi trắng trang cho người dùng cuối.
    nullGetter: () => "",
    modules: [imageModule],
  });

  doc.render(data);

  const blob: Blob = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { fileName };
}
