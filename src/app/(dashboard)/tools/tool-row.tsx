"use client";

import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  EXPIRY_COLOR_DOT_CLASS,
  EXPIRY_COLOR_TEXT_CLASS,
  getExpiryStatus,
} from "@/lib/utils/expiry-status";
import type { ToolListItem } from "./types";

function LoanStatusBadge({ activeLoan }: { activeLoan: ToolListItem["activeLoan"] }) {
  if (!activeLoan) {
    return (
      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
        Sẵn có
      </Badge>
    );
  }
  const borrowerName = activeLoan.borrower?.full_name || "—";
  return (
    <span className="text-sm">
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
        Đang mượn
      </Badge>
      <span className="ml-2 text-muted-foreground">
        {borrowerName}
        {activeLoan.work_location ? ` (${activeLoan.work_location})` : ""}
      </span>
    </span>
  );
}

function CalibrationIndicator({
  dueDate,
  notApplicable,
}: {
  dueDate: string | null;
  notApplicable: boolean;
}) {
  if (notApplicable) {
    return <span className="text-sm text-muted-foreground">Không áp dụng</span>;
  }
  const status = getExpiryStatus(dueDate);
  return (
    <span className={`inline-flex items-center gap-2 text-sm ${EXPIRY_COLOR_TEXT_CLASS[status.color]}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${EXPIRY_COLOR_DOT_CLASS[status.color]}`} />
      {status.label}
    </span>
  );
}

export function ToolTableRow({ tool, canEdit }: { tool: ToolListItem; canEdit: boolean }) {
  const router = useRouter();

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(`/tools/${tool.id}`)}>
      <TableCell className="font-medium">{tool.code}</TableCell>
      <TableCell>{tool.name}</TableCell>
      <TableCell>
        {tool.model || "—"}
        {tool.serial_number ? ` / ${tool.serial_number}` : ""}
      </TableCell>
      <TableCell>{tool.custodian?.full_name || "—"}</TableCell>
      <TableCell>
        <LoanStatusBadge activeLoan={tool.activeLoan} />
      </TableCell>
      <TableCell>
        <CalibrationIndicator
          dueDate={tool.calibration_due_date}
          notApplicable={tool.calibration_not_applicable}
        />
      </TableCell>
      {canEdit && (
        <TableCell>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/tools/${tool.id}/edit`);
            }}
          >
            Sửa
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}
