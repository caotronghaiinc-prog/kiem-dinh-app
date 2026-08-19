"use client";

// PROMPT-37: import Excel hàng loạt -- ÁP DỤNG CHO MỌI LOẠI THIẾT BỊ, chỉ
// nhập field CƠ BẢN (không có spec_values riêng theo loại -- Hải bổ sung
// sau bằng cách sửa từng thiết bị). Toàn bộ thiết bị trong 1 lần import
// thuộc về CÙNG 1 khách hàng chọn ở bước 1.
//
// Dùng exceljs (không dùng xlsx/SheetJS) -- bản mới nhất của xlsx trên npm
// registry công khai (0.18.5) có 2 lỗ hổng HIGH severity chưa vá (Prototype
// Pollution, ReDoS), bản vá chỉ phát hành qua CDN riêng của SheetJS, không
// đẩy lên npm nữa. Hải đã xác nhận dùng exceljs thay thế.
import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Workbook, type CellValue } from "exceljs";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EQUIPMENT_TYPE_OPTIONS } from "@/lib/equipment/form-schema";
import type { CustomerOption } from "../types";

const REQUIRED_HEADER = "Tên thiết bị";
// Đúng thứ tự cột trong file mẫu -- nhưng đọc file tải lên THEO TÊN CỘT ở
// header (không theo vị trí cứng), để người dùng lỡ đổi thứ tự cột vẫn đọc
// đúng (yêu cầu PROMPT-37).
const COLUMNS = [
  "Tên thiết bị",
  "Loại thiết bị",
  "Hãng sản xuất",
  "Năm sản xuất",
  "Số chế tạo",
  "Vị trí lắp đặt",
  "Chu kỳ kiểm định (tháng)",
  "Hạn kiểm định",
  "Ghi chú",
] as const;
type ColumnName = (typeof COLUMNS)[number];

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_INSPECTION_CYCLE = 12;
const TEMPLATE_FILE_NAME = "mau-import-thiet-bi.xlsx";

interface ParsedRow {
  rowNumber: number; // số dòng thật trong file Excel (để đối chiếu khi sửa)
  name: string;
  type: string | null;
  manufacturer: string | null;
  manufacture_year: number | null;
  serial_number: string | null;
  location: string | null;
  inspection_cycle: number | null;
  expiry_date: string | null; // yyyy-mm-dd
  notes: string | null;
  error: string | null;
}

function isCellEmpty(value: CellValue): boolean {
  if (value === null || value === undefined) return true;
  if (value instanceof Date) return false;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

/** exceljs trả CellValue có thể là string/number/Date/null hoặc object
 * (richText, hyperlink, formula result...) -- quy hết về text thường để
 * đọc cột text tự do (Hãng sản xuất, Số chế tạo, Ghi chú...). */
function cellToPlainString(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((t) => t.text).join("");
    }
    if ("text" in value && value.text != null) return String(value.text);
    if ("result" in value && value.result != null) return String(value.result);
    return "";
  }
  return String(value);
}

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Excel lưu ngày dạng số serial (số ngày kể từ 30/12/1899) khi cell được
 * định dạng ngày nhưng vì lý do nào đó exceljs không tự trả về Date --
 * phòng hờ, không phải đường đi chính. */
function excelSerialToDate(serial: number): Date {
  const utcMs = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(utcMs);
}

/** "Hạn kiểm định": chấp nhận cả Date object (cell định dạng ngày trong
 * Excel) lẫn chuỗi text "dd/mm/yyyy" (người dùng gõ tay không định dạng
 * ngày) -- để trống thì null, KHÔNG bắt buộc như equipmentFormSchema.expiry_date
 * (form thêm thủ công bắt buộc, nhưng import không dùng lại schema đó --
 * tự validate riêng đơn giản hơn, phù hợp việc nhập hàng loạt từ dữ liệu
 * có sẵn có thể chưa đầy đủ). */
function parseExpiryDateCell(value: CellValue): { value: string | null; error: string | null } {
  if (isCellEmpty(value)) return { value: null, error: null };
  if (value instanceof Date) {
    return { value: formatDateYMD(value), error: null };
  }
  if (typeof value === "number") {
    return { value: formatDateYMD(excelSerialToDate(value)), error: null };
  }
  const text = cellToPlainString(value).trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) {
    return { value: null, error: `Hạn kiểm định không hợp lệ (dùng định dạng dd/mm/yyyy): "${text}"` };
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const d = new Date(year, month - 1, day);
  // new Date tự tràn ngày/tháng sai (vd 31/02 -> 03/03) thay vì báo lỗi --
  // đối chiếu lại đúng 3 phần mới xác nhận là ngày có thật.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return { value: null, error: `Hạn kiểm định không phải ngày hợp lệ: "${text}"` };
  }
  return { value: formatDateYMD(d), error: null };
}

function parseManufactureYear(value: CellValue): { value: number | null; error: string | null } {
  if (isCellEmpty(value)) return { value: null, error: null };
  const text = cellToPlainString(value).trim();
  const num = Number(text);
  if (!/^\d+$/.test(text) || num < 1900 || num > CURRENT_YEAR) {
    return {
      value: null,
      error: `Năm sản xuất không hợp lệ (phải từ 1900 đến ${CURRENT_YEAR}): "${text}"`,
    };
  }
  return { value: num, error: null };
}

function parseInspectionCycle(value: CellValue): { value: number | null; error: string | null } {
  if (isCellEmpty(value)) return { value: DEFAULT_INSPECTION_CYCLE, error: null };
  const text = cellToPlainString(value).trim();
  const num = Number(text);
  if (!/^\d+$/.test(text) || num <= 0) {
    return {
      value: null,
      error: `Chu kỳ kiểm định không hợp lệ (phải là số nguyên dương): "${text}"`,
    };
  }
  return { value: num, error: null };
}

function parseType(value: CellValue): { value: string | null; error: string | null } {
  if (isCellEmpty(value)) return { value: null, error: null };
  const text = cellToPlainString(value).trim();
  if (!(EQUIPMENT_TYPE_OPTIONS as readonly string[]).includes(text)) {
    return {
      value: null,
      error: `Loại thiết bị không hợp lệ, xem sheet "Danh sách loại thiết bị hợp lệ": "${text}"`,
    };
  }
  return { value: text, error: null };
}

function validateRow(rowNumber: number, raw: Record<ColumnName, CellValue>): ParsedRow {
  const errors: string[] = [];

  const name = cellToPlainString(raw["Tên thiết bị"]).trim();
  if (!name) errors.push("Thiếu tên thiết bị");

  const typeResult = parseType(raw["Loại thiết bị"]);
  if (typeResult.error) errors.push(typeResult.error);

  const yearResult = parseManufactureYear(raw["Năm sản xuất"]);
  if (yearResult.error) errors.push(yearResult.error);

  const cycleResult = parseInspectionCycle(raw["Chu kỳ kiểm định (tháng)"]);
  if (cycleResult.error) errors.push(cycleResult.error);

  const expiryResult = parseExpiryDateCell(raw["Hạn kiểm định"]);
  if (expiryResult.error) errors.push(expiryResult.error);

  return {
    rowNumber,
    name,
    type: typeResult.value,
    manufacturer: cellToPlainString(raw["Hãng sản xuất"]).trim() || null,
    manufacture_year: yearResult.value,
    serial_number: cellToPlainString(raw["Số chế tạo"]).trim() || null,
    location: cellToPlainString(raw["Vị trí lắp đặt"]).trim() || null,
    inspection_cycle: cycleResult.value,
    expiry_date: expiryResult.value,
    notes: cellToPlainString(raw["Ghi chú"]).trim() || null,
    error: errors.length > 0 ? errors.join("; ") : null,
  };
}

function downloadBlob(buffer: ArrayBuffer | Buffer, fileName: string) {
  const blob = new Blob([buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function generateTemplateFile(): Promise<void> {
  const workbook = new Workbook();

  const sheet = workbook.addWorksheet("Danh sách thiết bị");
  sheet.columns = COLUMNS.map((header) => ({ header, key: header, width: 24 }));
  sheet.addRow({
    "Tên thiết bị": "Cầu trục 10 tấn",
    "Loại thiết bị": "Thiết bị nâng - Cầu trục",
    "Hãng sản xuất": "Demag",
    "Năm sản xuất": 2020,
    "Số chế tạo": "SN-0001",
    "Vị trí lắp đặt": "Xưởng A",
    "Chu kỳ kiểm định (tháng)": 12,
    "Hạn kiểm định": "31/12/2026",
    "Ghi chú": "Dòng ví dụ -- xoá trước khi điền dữ liệu thật",
  } satisfies Record<ColumnName, string | number>);

  // Sheet phụ liệt kê nguyên văn EQUIPMENT_TYPE_OPTIONS để copy đúng chính
  // tả -- validate cột "Loại thiết bị" đòi khớp CHÍNH XÁC 1 trong các giá
  // trị này.
  const typeSheet = workbook.addWorksheet("Danh sách loại thiết bị hợp lệ");
  typeSheet.columns = [{ header: "Loại thiết bị hợp lệ", key: "type", width: 40 }];
  for (const type of EQUIPMENT_TYPE_OPTIONS) {
    typeSheet.addRow({ type });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(buffer, TEMPLATE_FILE_NAME);
}

export function ImportEquipmentForm({ customerOptions }: { customerOptions: CustomerOption[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customerId, setCustomerId] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = customerOptions.find((c) => c.id === customerId) ?? null;

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        setFileError("File Excel không có sheet dữ liệu nào.");
        return;
      }

      const headerRow = worksheet.getRow(1);
      const headerIndex = new Map<string, number>();
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const text = cellToPlainString(cell.value).trim();
        if (text) headerIndex.set(text, colNumber);
      });

      if (!headerIndex.has(REQUIRED_HEADER)) {
        setFileError(
          `File thiếu cột bắt buộc "${REQUIRED_HEADER}". Vui lòng tải lại file mẫu và điền đúng tên cột.`
        );
        return;
      }

      const parsedRows: ParsedRow[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const raw = {} as Record<ColumnName, CellValue>;
        for (const col of COLUMNS) {
          const idx = headerIndex.get(col);
          raw[col] = idx ? row.getCell(idx).value : null;
        }
        const rowIsEmpty = COLUMNS.every((col) => isCellEmpty(raw[col]));
        if (rowIsEmpty) return;
        parsedRows.push(validateRow(rowNumber, raw));
      });

      if (parsedRows.length === 0) {
        setFileError("File không có dòng dữ liệu nào (ngoài dòng tiêu đề).");
        return;
      }

      setRows(parsedRows);
      setStep(3);
    } catch (error) {
      setFileError(
        logAndGetSafeMessage(error, "Không đọc được file Excel. Vui lòng kiểm tra lại file rồi thử lại.")
      );
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleImport() {
    setSubmitting(true);
    const supabase = createClient();

    // 1 lệnh insert nhiều dòng -- để trigger sinh equipment.code tính đúng
    // thứ tự liên tục trong cùng 1 câu lệnh, và để Postgres tự rollback
    // toàn bộ nếu có lỗi (không cần code xử lý "thành công 1 phần").
    const payload = rows.map((r) => ({
      customer_id: customerId,
      name: r.name,
      type: r.type,
      manufacturer: r.manufacturer,
      manufacture_year: r.manufacture_year,
      serial_number: r.serial_number,
      specifications: null,
      location: r.location,
      inspection_cycle: r.inspection_cycle ?? DEFAULT_INSPECTION_CYCLE,
      last_inspection_date: null,
      expiry_date: r.expiry_date,
      status: "valid",
      notes: r.notes,
      spec_values: {},
    }));

    const { error } = await supabase.from("equipment").insert(payload);
    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Import thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra khi nhập thiết bị. Vui lòng thử lại."),
      });
      return;
    }

    toast({ title: `Đã nhập ${rows.length} thiết bị` });
    router.push("/equipment");
    router.refresh();
  }

  const validCount = rows.filter((r) => !r.error).length;
  const canImport = rows.length > 0 && validCount === rows.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Bước 1 -- chọn khách hàng */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:p-6">
          <h2 className="text-base font-semibold">Bước 1: Chọn khách hàng</h2>
          <p className="text-sm text-muted-foreground">
            Toàn bộ thiết bị trong lần import này sẽ thuộc về 1 khách hàng.
          </p>
          <Select
            value={customerId}
            onValueChange={(value) => {
              setCustomerId(value);
              // Đổi khách hàng sau khi đã lên bước 2/3 -- coi như bắt đầu
              // lại để tránh lẫn dữ liệu đã preview của khách hàng cũ.
              if (step > 1) {
                setStep(1);
                setRows([]);
                setFileError(null);
              }
            }}
          >
            <SelectTrigger className="sm:max-w-md">
              <SelectValue placeholder="-- Chọn khách hàng --" />
            </SelectTrigger>
            <SelectContent>
              {customerOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.company_name} ({c.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {step === 1 && (
            <Button type="button" className="w-fit" disabled={!customerId} onClick={() => setStep(2)}>
              Tiếp tục
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Bước 2 -- tải file mẫu + chọn file */}
      {step >= 2 && selectedCustomer && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <h2 className="text-base font-semibold">
              Bước 2: Tải file mẫu &amp; chọn file Excel cho {selectedCustomer.company_name}
            </h2>

            <Button type="button" variant="outline" className="w-fit" onClick={() => void generateTemplateFile()}>
              Tải file Excel mẫu
            </Button>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Chọn file Excel đã điền (.xlsx)</label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                disabled={parsing}
              />
              {parsing && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang đọc file...
                </p>
              )}
              {fileError && <p className="text-sm font-medium text-destructive">{fileError}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bước 3 -- preview + validate */}
      {step === 3 && rows.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Bước 3: Xem trước &amp; nhập thiết bị</h2>
              <span
                className={
                  validCount === rows.length
                    ? "text-sm font-medium text-green-700"
                    : "text-sm font-medium text-destructive"
                }
              >
                Hợp lệ: {validCount}/{rows.length} dòng
              </span>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-2 font-medium">Dòng</th>
                    <th className="p-2 font-medium">Tên thiết bị</th>
                    <th className="p-2 font-medium">Loại thiết bị</th>
                    <th className="p-2 font-medium">Hãng SX</th>
                    <th className="p-2 font-medium">Năm SX</th>
                    <th className="p-2 font-medium">Số chế tạo</th>
                    <th className="p-2 font-medium">Vị trí</th>
                    <th className="p-2 font-medium">Chu kỳ (tháng)</th>
                    <th className="p-2 font-medium">Hạn KĐ</th>
                    <th className="p-2 font-medium">Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.rowNumber} className="border-b last:border-b-0">
                      <td className="p-2 text-muted-foreground">{r.rowNumber}</td>
                      <td className="p-2">{r.name || "—"}</td>
                      <td className="p-2">{r.type ?? "—"}</td>
                      <td className="p-2">{r.manufacturer ?? "—"}</td>
                      <td className="p-2">{r.manufacture_year ?? "—"}</td>
                      <td className="p-2">{r.serial_number ?? "—"}</td>
                      <td className="p-2">{r.location ?? "—"}</td>
                      <td className="p-2">{r.inspection_cycle ?? "—"}</td>
                      <td className="p-2">{r.expiry_date ?? "—"}</td>
                      <td className="p-2 font-medium text-destructive">{r.error ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!canImport && (
              <p className="text-sm text-muted-foreground">
                Còn dòng lỗi -- sửa lại file Excel gốc rồi tải lên lại (bước 2) trước khi nhập.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  setStep(2);
                  setRows([]);
                  setFileError(null);
                }}
              >
                Chọn file khác
              </Button>
              <Button type="button" disabled={!canImport || submitting} onClick={handleImport}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Nhập {rows.length} thiết bị
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
