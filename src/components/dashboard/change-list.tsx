import { AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";
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

// Same three-way mapping as the status-distribution donut chart: Jira's
// status category is one of a fixed "new"/"indeterminate"/"done" set.
// Class strings must stay fully static (not built via `${}` interpolation) —
// Tailwind's build-time scanner only picks up literal class text, so an
// interpolated `bg-[color:var(${colorVar})]/15` never gets its CSS emitted.
const STATUS_CATEGORY_CLASS: Record<string, string> = {
  new: "bg-[color:var(--muted-foreground)]/15 text-[color:var(--muted-foreground)] border-[color:var(--muted-foreground)]/30",
  indeterminate:
    "bg-[color:var(--seq-dark)]/15 text-[color:var(--seq-dark)] border-[color:var(--seq-dark)]/30",
  done: "bg-[color:var(--status-good)]/15 text-[color:var(--status-good)] border-[color:var(--status-good)]/30",
};

function statusBadgeClassName(category?: string) {
  return (category && STATUS_CATEGORY_CLASS[category]) || STATUS_CATEGORY_CLASS.new;
}

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

export function ChangeList({
  changes,
  siteUrl,
}: {
  changes: IssueChange[];
  siteUrl: string;
}) {
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
                <div className="flex flex-col gap-2">
                  <a
                    href={`${siteUrl.replace(/\/+$/, "")}/browse/${change.issueKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-fit items-center gap-1 font-mono text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {change.issueKey}
                    <ExternalLink className="size-3" />
                  </a>
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
                    <Badge
                      variant="outline"
                      className={statusBadgeClassName(change.fromStatusCategory)}
                    >
                      {change.fromStatus}
                    </Badge>
                    <ArrowRight
                      className="size-3.5 text-muted-foreground"
                      aria-hidden
                    />
                    <Badge
                      variant="outline"
                      className={statusBadgeClassName(change.toStatusCategory)}
                    >
                      {change.toStatus}
                    </Badge>
                  </span>
                ) : change.toStatus || change.fromStatus ? (
                  <Badge
                    variant="outline"
                    className={statusBadgeClassName(
                      change.toStatusCategory ?? change.fromStatusCategory,
                    )}
                  >
                    {change.toStatus ?? change.fromStatus}
                  </Badge>
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
