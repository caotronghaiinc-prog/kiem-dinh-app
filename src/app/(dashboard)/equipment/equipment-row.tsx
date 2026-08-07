"use client";

import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExpiryIndicator } from "@/components/equipment/expiry-indicator";
import type { EquipmentListItem } from "./types";

export function EquipmentTableRow({
  equipment,
  canEdit,
}: {
  equipment: EquipmentListItem;
  canEdit: boolean;
}) {
  const router = useRouter();

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/equipment/${equipment.id}`)}
    >
      <TableCell className="font-medium">{equipment.code}</TableCell>
      <TableCell>{equipment.name}</TableCell>
      <TableCell>{equipment.customer?.company_name || "—"}</TableCell>
      <TableCell>{equipment.type || "—"}</TableCell>
      <TableCell>
        <ExpiryIndicator expiryDate={equipment.expiry_date} status={equipment.status} />
      </TableCell>
      {canEdit && (
        <TableCell>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/equipment/${equipment.id}/edit`);
            }}
          >
            Sửa
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}
