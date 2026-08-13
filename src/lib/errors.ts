/**
 * OWASP RULE-20 (Error Handling & Logging): không trả nguyên văn message
 * lỗi từ Postgres/PostgREST/SDK cho người dùng cuối (lộ tên bảng/cột, cấu
 * trúc query, chi tiết provider AI...). Log đầy đủ ở console (server khi
 * gọi từ Route Handler, browser console khi gọi từ Client Component -- cả
 * 2 chỗ đều là nơi hợp lệ để debug) và chỉ hiện message chung, dễ hiểu cho
 * UI.
 */
export function logAndGetSafeMessage(error: unknown, fallback: string): string {
  console.error(error);
  return fallback;
}
