import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CUSTOMER_STATUS_CONFIG } from "@/lib/customers/status";
import { getEquipmentCount, type CustomerListItem } from "@/lib/types/customer";

export function CustomerCard({ customer }: { customer: CustomerListItem }) {
  const status = CUSTOMER_STATUS_CONFIG[customer.status] ?? CUSTOMER_STATUS_CONFIG.potential;

  return (
    <Link href={`/customers/${customer.id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{customer.company_name}</p>
              <p className="text-xs text-muted-foreground">{customer.code}</p>
            </div>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>Liên hệ: {customer.contact_name || "—"}</span>
            <span>SĐT: {customer.phone || "—"}</span>
            <span>Thiết bị: {getEquipmentCount(customer)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
