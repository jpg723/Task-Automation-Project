import { AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { IssueChange, IssueChangeType } from "@/lib/dashboard-types";

const TYPE_META: Record<IssueChangeType, { label: string; className: string }> = {
  new: {
    label: "신규",
    className:
      "bg-[color:var(--chart-1)]/15 text-[color:var(--chart-1)] border-[color:var(--chart-1)]/30",
  },
  done: {
    label: "완료",
    className:
      "bg-[color:var(--status-good)]/15 text-[color:var(--status-good)] border-[color:var(--status-good)]/30",
  },
  status_changed: {
    label: "상태 변경",
    className:
      "bg-[color:var(--tint-violet)]/15 text-[color:var(--tint-violet)] border-[color:var(--tint-violet)]/30",
  },
  overdue: {
    label: "지연",
    className:
      "bg-[color:var(--status-critical)]/15 text-[color:var(--status-critical)] border-[color:var(--status-critical)]/30",
  },
  removed: {
    label: "삭제/이탈",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function ChangeList({ changes }: { changes: IssueChange[] }) {
  if (changes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        선택한 기간에 변경된 이슈가 없습니다.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>이슈</TableHead>
          <TableHead>변경</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>담당자</TableHead>
          <TableHead className="text-right">마감일</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {changes.map((change) => {
          const meta = TYPE_META[change.type];
          return (
            <TableRow key={change.issueKey}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-medium text-muted-foreground">
                    {change.issueKey}
                  </span>
                  <span className="text-sm">{change.summary}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={meta.className}>
                  {meta.label}
                </Badge>
              </TableCell>
              <TableCell>
                {change.fromStatus && change.toStatus ? (
                  <span className="flex items-center gap-1.5">
                    <Badge variant="outline">{change.fromStatus}</Badge>
                    <ArrowRight
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    <Badge variant="outline">{change.toStatus}</Badge>
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {change.assignee ?? "미배정"}
              </TableCell>
              <TableCell className="text-right text-sm">
                {change.dueDate ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      change.type === "overdue" &&
                        "font-medium text-[color:var(--status-critical)]",
                    )}
                  >
                    {change.type === "overdue" && (
                      <AlertTriangle className="size-3.5" aria-hidden />
                    )}
                    {new Date(change.dueDate).toLocaleDateString("ko-KR")}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
