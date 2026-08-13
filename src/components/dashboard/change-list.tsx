"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, Check, Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function buildIssueUrl(siteUrl: string, issueKey: string) {
  return `${siteUrl.replace(/\/+$/, "")}/browse/${issueKey}`;
}

function IssueLink({ issueKey, siteUrl }: { issueKey: string; siteUrl: string }) {
  return (
    <a
      href={buildIssueUrl(siteUrl, issueKey)}
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

type TabKey = "all" | "remaining" | "new" | "done" | "overdue";

const TABS: { key: TabKey; label: string; filter: (issue: IssueListItem) => boolean }[] = [
  { key: "all", label: "전체 이슈", filter: () => true },
  { key: "remaining", label: "남은 이슈", filter: (issue) => issue.statusCategory !== "done" },
  { key: "new", label: "신규 이슈", filter: (issue) => issue.isNewToday },
  { key: "done", label: "완료 이슈", filter: (issue) => issue.statusCategory === "done" },
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
  const [assignee, setAssignee] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const tabFiltered = allIssues.filter(activeTab.filter);
  const assigneeOptions = Array.from(
    new Set(tabFiltered.map((issue) => issue.assignee ?? "미배정")),
  ).sort((a, b) => a.localeCompare(b, "ko"));
  const filtered =
    assignee === "all"
      ? tabFiltered
      : tabFiltered.filter((issue) => (issue.assignee ?? "미배정") === assignee);

  function handleTabChange(value: string | null) {
    setTab((value as TabKey) ?? "all");
    setAssignee("all");
  }

  async function handleCopyLinks() {
    const text = filtered
      .map((issue) => `• ${issue.issueKey}: ${buildIssueUrl(siteUrl, issue.issueKey)}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList variant="line">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label} ({allIssues.filter(t.filter).length})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {assigneeOptions.length > 1 && (
            <Select value={assignee} onValueChange={(v) => setAssignee(v ?? "all")}>
              <SelectTrigger className="w-40 pl-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">담당자 전체</SelectItem>
                {assigneeOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {tab === "overdue" && filtered.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleCopyLinks}>
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  링크 복사
                </>
              )}
            </Button>
          )}
        </div>
      </div>

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
