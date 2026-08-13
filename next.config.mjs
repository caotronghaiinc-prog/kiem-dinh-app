/** @type {import('next').NextConfig} */

// CSP cần whitelist đúng domain Supabase project (browser gọi thẳng
// REST/Auth/Storage API của Supabase từ client) -- lấy từ env thay vì
// hardcode để không lệch giữa các môi trường (project Supabase khác nhau
// giữa local/preview/production nếu có).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";

// OWASP RULE-10 (CSP) + RULE-19 (HSTS/security headers).
//
// script-src cần 'unsafe-inline': đã thử nonce-based CSP (per-request nonce
// qua middleware) nhưng KHÔNG khả thi với các trang được Next.js static-cache
// lúc build (/login, /, /unauthorized...) -- HTML của các trang này được
// render 1 lần và cache lại (x-nextjs-cache: HIT), nên <script> tag bên
// trong không thể mang nonce khớp với CSP header sinh mới mỗi request. Cách
// khắc phục đúng là ép toàn bộ route render động (mất tối ưu static
// caching/performance) -- đã hỏi và được xác nhận chọn phương án
// 'unsafe-inline' để giữ static caching, chấp nhận đánh đổi: CSP không chặn
// được inline script nếu có XSS, nhưng vẫn chặn external script domain lạ,
// object-src, frame-ancestors, và giới hạn connect-src/img-src -- vẫn là 1
// lớp phòng thủ có giá trị. Rủi ro thực tế thấp vì RULE-09 đã xác nhận không
// có dangerouslySetInnerHTML/innerHTML nào trong codebase (không có lỗ hổng
// tiêm inline script đã biết).
//
// style-src cần 'unsafe-inline' vì Radix UI (Dialog/Select...) set style
// attribute inline qua JS để định vị popup/overlay.
//
// 'unsafe-eval' CHỈ thêm ở dev (next dev): Fast Refresh/HMR của Next.js
// dùng eval() để hot-swap module, không liên quan gì tới code của app --
// thiếu directive này thì mọi Client Component sẽ crash ngay khi hydrate
// trong lúc chạy `next dev` (đã tự kiểm chứng bằng cách chạy Playwright
// suite: dropdown tìm kiếm, dialog... đều không hoạt động do lỗi
// EvalError chặn hydration). Production (`next start`, Vercel) không dùng
// eval() nên không cần và không nên nới lỏng thêm ở đó.
const scriptSrc = process.env.NODE_ENV === "development"
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
  : "script-src 'self' 'unsafe-inline';";

const cspHeader = `
  default-src 'self';
  ${scriptSrc}
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: ${supabaseOrigin};
  font-src 'self';
  connect-src 'self' ${supabaseOrigin};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
