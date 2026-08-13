// OWASP RULE-16 (Rate Limiting): giới hạn nhẹ theo user, lưu trong bộ nhớ
// process Node.js -- KHÔNG đáng tin cậy tuyệt đối trên Vercel serverless
// (mỗi instance/cold start có bộ đếm riêng, không chia sẻ giữa các instance),
// nhưng vẫn tốt hơn không có gì ở quy mô hiện tại (~10 nhân viên nội bộ đã
// xác thực). Nếu mở rộng ra internet công khai hoặc nhiều người dùng hơn,
// cần chuyển sang giải pháp tập trung (vd Upstash Redis) -- xem PROGRESS.md.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
