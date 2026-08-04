"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { IssueListItem } from "@/lib/dashboard-types";

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

function IssueLink({ issueKey, siteUrl }: { issueKey: string; siteUrl: string }) {
  return (
    <a
      href={`${siteUrl.replace(/\/+$/, "")}/browse/${issueKey}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-fit items-center gap-1 font-mono text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      {issueKey}
      <ExternalLink className="size-3" />
    </a>
  );
}

function StatusBadge({ status, category }: { status: string; category?: string }) {
  return (
    <Badge variant="outline" className={statusBadgeClassName(category)}>
      {status}
    </Badge>
  );
}

type TabKey = "all" | "new" | "done" | "statusChanged" | "overdue";

const TABS: { key: TabKey; label: string; filter: (issue: IssueListItem) => boolean }[] = [
  { key: "all", label: "전체 이슈", filter: () => true },
  { key: "new", label: "신규 이슈", filter: (issue) => issue.isNew },
  { key: "done", label: "완료 이슈", filter: (issue) => issue.statusCategory === "done" },
  { key: "statusChanged", label: "상태 변경", filter: (issue) => issue.isStatusChanged },
  { key: "overdue", label: "마감 지연", filter: (issue) => issue.isOverdue },
];

function IssueTable({
  issues,
  siteUrl,
  emptyMessage,
}: {
  issues: IssueListItem[];
  siteUrl: string;
  emptyMessage: string;
}) {
  if (issues.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>이슈</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>담당자</TableHead>
          <TableHead className="text-right">마감일</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {issues.map((issue) => (
          <TableRow key={issue.issueKey}>
            <TableCell>
              <div className="flex flex-col gap-2">
                <IssueLink issueKey={issue.issueKey} siteUrl={siteUrl} />
                <span className="text-sm">{issue.summary}</span>
              </div>
            </TableCell>
            <TableCell>
              {issue.fromStatus ? (
                <span className="flex items-center gap-1.5">
                  <StatusBadge status={issue.fromStatus} category={issue.fromStatusCategory} />
                  <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                  <StatusBadge status={issue.status} category={issue.statusCategory} />
                </span>
              ) : (
                <StatusBadge status={issue.status} category={issue.statusCategory} />
              )}
            </TableCell>
            <TableCell className="text-sm">{issue.assignee ?? "미배정"}</TableCell>
            <TableCell className="text-right text-sm">
              {issue.dueDate ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    issue.isOverdue && "font-medium text-[color:var(--status-critical)]",
                  )}
                >
                  {issue.isOverdue && <AlertTriangle className="size-3.5" aria-hidden />}
                  {new Date(issue.dueDate).toLocaleDateString("ko-KR")}
                </span>
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ChangeList({
  allIssues,
  siteUrl,
}: {
  allIssues: IssueListItem[];
  siteUrl: string;
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const filtered = allIssues.filter(activeTab.filter);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab((v as TabKey) ?? "all")}>
        <TabsList variant="line">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label} ({allIssues.filter(t.filter).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <IssueTable
        issues={filtered}
        siteUrl={siteUrl}
        emptyMessage={
          tab === "all" ? "아직 수집된 이슈가 없습니다." : "해당하는 이슈가 없습니다."
        }
      />
    </div>
  );
}
