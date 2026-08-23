"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAndGetSafeMessage } from "@/lib/errors";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  employeeInfoFormSchema,
  buildEmployeeInfoValues,
  type EmployeeInfoFormValues,
} from "@/lib/employees/employee-info-form-schema";

// PROMPT-65: dialog SỬA đầu tiên trên trang này (trước giờ /employees/[id]
// hoàn toàn chỉ xem) -- KHÔNG cho sửa role/active ở đây, hệ thống hiện chưa
// có UI đổi role/active ở đâu cả (khoảng trống thật, ngoài phạm vi prompt
// này).
export function EmployeeInfoDialog({
  employee,
  trigger,
}: {
  employee: {
    id: string;
    full_name: string | null;
    phone: string | null;
    job_title: string | null;
    date_of_birth: string | null;
    cccd_number: string | null;
    start_date: string | null;
    permanent_address: string | null;
  };
  trigger?: ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const defaultValues = buildEmployeeInfoValues(employee);

  const form = useForm<EmployeeInfoFormValues>({
    resolver: zodResolver(employeeInfoFormSchema),
    defaultValues,
  });

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) form.reset(defaultValues);
    setOpen(next);
  }

  async function onSubmit(values: EmployeeInfoFormValues) {
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: values.full_name || null,
        phone: values.phone || null,
        job_title: values.job_title || null,
        date_of_birth: values.date_of_birth || null,
        cccd_number: values.cccd_number || null,
        start_date: values.start_date || null,
        permanent_address: values.permanent_address || null,
      })
      .eq("id", employee.id);

    setSubmitting(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Cập nhật thông tin nhân viên thất bại",
        description: logAndGetSafeMessage(error, "Có lỗi xảy ra, vui lòng thử lại."),
      });
      return;
    }

    toast({ title: "Đã cập nhật thông tin nhân viên" });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button variant="outline">Sửa thông tin</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa thông tin nhân viên</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ tên</FormLabel>
                    <FormControl>
                      <Input placeholder="Nguyễn Văn A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SĐT</FormLabel>
                    <FormControl>
                      <Input placeholder="09xxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chức vụ</FormLabel>
                    <FormControl>
                      <Input placeholder="Kỹ sư trưởng..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày sinh</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cccd_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số CCCD</FormLabel>
                    <FormControl>
                      <Input placeholder="12 chữ số" inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày vào làm</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="permanent_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ thường trú</FormLabel>
                  <FormControl>
                    <Textarea placeholder="..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
