"use client";

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_BUCKET } from "@/lib/inspection/form-schema";

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
 *
 * docxtemplater-image-module-free LUÔN đặt tên file nhúng là
 * "image_generated_N.png" bất kể định dạng gốc (xem node_modules/
 * docxtemplater-image-module-free/js/index.js, getNextImageName()) -- ảnh
 * chụp hiện trường thường là JPEG (điện thoại), nếu đưa thẳng byte JPEG vào
 * thì file .docx sẽ khai JPEG dưới đuôi .png, Word có thể không mở được.
 * Vẽ lại ảnh (đã resize) lên OffscreenCanvas rồi xuất PNG thật qua
 * convertToBlob({type:"image/png"}) để khớp đúng đuôi thư viện luôn gán --
 * tận dụng luôn bước resize sẵn có, ảnh nhúng cũng nhẹ hơn vì đã downscale.
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
      const originalBuffer = await response.arrayBuffer();
      const bitmap = await createImageBitmap(new Blob([originalBuffer]));
      const [width, height] = scaleToFit(bitmap.width, bitmap.height);

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không tạo được canvas để chuẩn hoá ảnh.");
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      const pngBlob = await canvas.convertToBlob({ type: "image/png" });
      const pngBuffer = await pngBlob.arrayBuffer();

      buffers.set(entry.path, pngBuffer);
      sizes.set(entry.path, [width, height]);
    })
  );

  return { buffers, sizes };
}

export interface GenerateReportResult {
  fileName: string;
}

/**
 * Merge data vào mẫu Word (bất kỳ loại thiết bị nào, templateUrl truyền
 * vào từ registry.ts theo equipment.type) + tải file .docx về máy. Tải
 * template + ảnh song song, build map ảnh trước khi khởi tạo Docxtemplater
 * (xem loadPhotoBuffers).
 */
export async function generateReport(
  templateUrl: string,
  data: Record<string, unknown>,
  photoStoragePaths: string[],
  fileName: string
): Promise<GenerateReportResult> {
  const [templateResponse, { buffers, sizes }] = await Promise.all([
    fetch(templateUrl),
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
