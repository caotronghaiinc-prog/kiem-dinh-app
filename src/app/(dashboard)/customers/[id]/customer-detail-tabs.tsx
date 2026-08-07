"use client";

import Link from "next/link";
import { ClipboardList, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExpiryIndicator } from "@/components/equipment/expiry-indicator";
import { INSPECTION_RESULT_CONFIG } from "@/lib/inspection/result";
import type { CustomerRecord } from "@/lib/types/customer";
import type { EquipmentRow, InspectionRow } from "./types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      {value ? (
        <span className="text-sm">{value}</span>
      ) : (
        <span className="text-sm text-muted-foreground/70">Chưa có thông tin</span>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Wrench; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed py-16 text-center text-muted-foreground">
      <Icon className="h-8 w-8" />
      <p>{message}</p>
    </div>
  );
}

// Cột customers.type là text tự do (không có check constraint), form thêm/sửa
// (PROMPT-05) lưu đúng "doanh nghiệp"/"cá nhân", nhưng dữ liệu nhập tay qua
// SQL Editor để test có thể lệch hoa/thường hoặc dùng tiếng Anh -> chuẩn hoá
// (trim + lowercase) trước khi tra bảng, kèm vài biến thể thường gặp, để
// không hiện nhầm giá trị thô ra UI.
const TYPE_LABELS: Record<string, string> = {
  "doanh nghiệp": "Doanh nghiệp",
  "company": "Doanh nghiệp",
  "business": "Doanh nghiệp",
  "cá nhân": "Cá nhân",
  "individual": "Cá nhân",
  "personal": "Cá nhân",
};

function translateCustomerType(type: string | null): string | null {
  if (!type) return null;
  const normalized = type.trim().toLowerCase();
  return TYPE_LABELS[normalized] ?? type;
}

export function CustomerDetailTabs({
  customer,
  equipment,
  inspections,
  isAdmin,
}: {
  customer: CustomerRecord;
  equipment: EquipmentRow[];
  inspections: InspectionRow[];
  isAdmin: boolean;
}) {
  return (
    <Tabs defaultValue="info">
      <TabsList>
        <TabsTrigger value="info">Thông tin chung</TabsTrigger>
        <TabsTrigger value="equipment">Thiết bị ({equipment.length})</TabsTrigger>
        <TabsTrigger value="history">Lịch sử ({inspections.length})</TabsTrigger>
        <TabsTrigger value="notes">Ghi chú</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoField label="Người liên hệ" value={customer.contact_name} />
          <InfoField label="Số điện thoại" value={customer.phone} />
          <InfoField label="Email" value={customer.email} />
          <InfoField label="Địa chỉ" value={customer.address} />
          <InfoField label="Mã số thuế" value={customer.tax_code} />
          <InfoField label="Loại khách hàng" value={translateCustomerType(customer.type)} />
          <InfoField label="Ngành nghề" value={customer.industry} />
          <InfoField label="Nguồn khách hàng" value={customer.source} />
          <InfoField label="Ngày tạo" value={formatDate(customer.created_at ?? null)} />
        </div>
      </TabsContent>

      <TabsContent value="equipment">
        {equipment.length === 0 ? (
          <EmptyState icon={Wrench} message="Khách hàng chưa có thiết bị nào." />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-md border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã TB</TableHead>
                    <TableHead>Tên thiết bị</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Hạn kiểm định</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.type || "—"}</TableCell>
                      <TableCell>
                        <ExpiryIndicator expiryDate={item.expiry_date} status={item.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {equipment.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.code}</p>
                      </div>
                      <ExpiryIndicator expiryDate={item.expiry_date} status={item.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">Loại: {item.type || "—"}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="history">
        {inspections.length === 0 ? (
          <EmptyState icon={ClipboardList} message="Chưa có lịch sử kiểm định nào." />
        ) : (
          <>
            <div className="hidden overflow-x-auto rounded-md border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày KĐ</TableHead>
                    <TableHead>Thiết bị</TableHead>
                    <TableHead>Kết quả</TableHead>
                    <TableHead>Số biên bản</TableHead>
                    <TableHead>Người kiểm định</TableHead>
                    <TableHead>Hạn mới</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((item) => {
                    const result = item.result ? INSPECTION_RESULT_CONFIG[item.result] : null;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>{formatDate(item.inspection_date)}</TableCell>
                        <TableCell>{item.equipment?.name || "—"}</TableCell>
                        <TableCell>
                          {result ? (
                            <Badge variant="outline" className={result.className}>
                              {result.label}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{item.report_number || "—"}</TableCell>
                        <TableCell>{item.inspector?.full_name || "—"}</TableCell>
                        <TableCell>{formatDate(item.new_expiry_date)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {inspections.map((item) => {
                const result = item.result ? INSPECTION_RESULT_CONFIG[item.result] : null;
                return (
                  <Card key={item.id}>
                    <CardContent className="flex flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{item.equipment?.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(item.inspection_date)}
                          </p>
                        </div>
                        {result && (
                          <Badge variant="outline" className={result.className}>
                            {result.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>Số BB: {item.report_number || "—"}</span>
                        <span>KĐV: {item.inspector?.full_name || "—"}</span>
                        <span>Hạn mới: {formatDate(item.new_expiry_date)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="notes">
        <div className="flex flex-col gap-4">
          {customer.notes ? (
            <p className="whitespace-pre-wrap text-sm">{customer.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có ghi chú.</p>
          )}
          {isAdmin && (
            <Button asChild variant="outline" className="w-fit">
              <Link href={`/customers/${customer.id}/edit`}>Sửa ghi chú</Link>
            </Button>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
