import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpiryIndicator } from "@/components/equipment/expiry-indicator";
import type { EquipmentListItem } from "./types";

export function EquipmentCard({
  equipment,
  canEdit,
}: {
  equipment: EquipmentListItem;
  canEdit: boolean;
}) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <Link href={`/equipment/${equipment.id}`} className="min-w-0 flex-1">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{equipment.name}</p>
                <p className="text-xs text-muted-foreground">{equipment.code}</p>
              </div>
              <ExpiryIndicator expiryDate={equipment.expiry_date} status={equipment.status} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>KH: {equipment.customer?.company_name || "—"}</span>
              <span>Loại: {equipment.type || "—"}</span>
            </div>
          </div>
        </Link>
        {canEdit && (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={`/equipment/${equipment.id}/edit`}>Sửa</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
