import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/auth/role-labels";
import type { EmployeeListItem } from "./types";

export function EmployeeCard({ employee }: { employee: EmployeeListItem }) {
  return (
    <Link href={`/employees/${employee.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{employee.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground">{employee.email}</p>
            </div>
            {employee.active ? (
              <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                Đang làm việc
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-600">
                Ngừng
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>Vai trò: {ROLE_LABELS[employee.role] ?? employee.role}</span>
            <span>SĐT: {employee.phone || "—"}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
