import OpenAI from "openai";

export interface DraftZaloMessageEquipmentItem {
  name: string;
  code: string;
  expiryDate: string | null;
  /** Nhãn trạng thái hạn, lấy thẳng từ getExpiryStatus(expiryDate).label (vd "Quá hạn 5 ngày" / "Còn 20 ngày") -- không tính lại ngày ở đây. */
  statusLabel: string;
}

export interface DraftZaloMessageContext {
  companyName: string;
  contactName: string | null;
  phone: string | null;
  equipment: DraftZaloMessageEquipmentItem[];
}

/**
 * PROMPT-12: soạn tin nhắn Zalo bằng AI cho trang chi tiết khách hàng.
 *
 * Đây là NGOẠI LỆ duy nhất trong dự án dùng OpenAI thay vì Claude API (bản
 * mua tạm để test, xem PROGRESS.md) -- mọi tính năng AI khác (M3 soạn biên
 * bản, Phase 2...) vẫn dùng Claude API theo kế hoạch gốc.
 *
 * Đây là điểm DUY NHẤT trong tính năng này gọi thẳng SDK của provider AI.
 * Route API (/api/customers/[id]/draft-zalo-message) và UI chỉ gọi hàm
 * draftZaloMessage() này, không biết/không quan tâm đang dùng provider
 * nào -- khi chuyển sang Claude API sau này, chỉ cần sửa NỘI DUNG BÊN
 * TRONG file này (đổi sang @anthropic-ai/sdk, giữ nguyên chữ ký hàm), không
 * đụng route hay UI.
 */
export async function draftZaloMessage(context: DraftZaloMessageContext): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Thiếu OPENAI_API_KEY trong biến môi trường.");
  }

  const openai = new OpenAI({ apiKey });

  const equipmentLines = context.equipment
    .map((item) => `- ${item.name} (mã ${item.code}), hạn kiểm định: ${item.expiryDate ?? "chưa có"} — ${item.statusLabel}`)
    .join("\n");

  const userPrompt = `Khách hàng: ${context.companyName}
Người liên hệ: ${context.contactName ?? "không rõ"}
Số điện thoại: ${context.phone ?? "không rõ"}

Danh sách thiết bị sắp/đã hết hạn kiểm định:
${equipmentLines}

Viết 1 tin nhắn Zalo bằng tiếng Việt để gửi cho khách hàng trên. Yêu cầu:
- Giọng văn thân thiện, chuyên nghiệp, ngắn gọn, phù hợp gửi Zalo (không dài dòng).
- Nhắc khách hàng về (các) thiết bị sắp/đã hết hạn kiểm định ở trên.
- Nếu có nhiều thiết bị, liệt kê gọn dạng danh sách trong tin nhắn.
- Đề nghị khách hàng liên hệ lại để sắp xếp lịch tái kiểm định.
- Chỉ trả về đúng nội dung tin nhắn, không thêm giải thích hay tiêu đề.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          "Bạn là trợ lý soạn thảo tin nhắn chăm sóc khách hàng cho một công ty kiểm định kỹ thuật an toàn thiết bị. Luôn trả lời bằng tiếng Việt.",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const message = completion.choices[0]?.message?.content?.trim();
  if (!message) {
    throw new Error("OpenAI không trả về nội dung tin nhắn.");
  }
  return message;
}
