import { prisma } from "@/lib/prisma";
import { SnapshotStatus } from "@/generated/prisma/enums";
import type { IssueSnapshot, Snapshot } from "@/generated/prisma/client";
import type { Period } from "@/lib/constants";
import type { DashboardData, IssueChange, IssueListItem, StatusSlice, TrendPoint } from "@/lib/dashboard-types";

const PERIOD_MS: Record<Period, number> = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

const EMPTY_DASHBOARD_DATA: DashboardData = {
  kpis: { newCount: 0, doneCount: 0, statusChangedCount: 0, overdueCount: 0 },
  statusDistribution: [],
  trend: [],
  changes: [],
  allIssues: [],
  latestSnapshot: null,
};

type SnapshotWithIssues = Snapshot & { issues: IssueSnapshot[] };

async function getLatestSuccessfulSnapshot(projectId: string): Promise<SnapshotWithIssues | null> {
  return prisma.snapshot.findFirst({
    where: { projectId, status: SnapshotStatus.SUCCESS },
    orderBy: { capturedAt: "desc" },
    include: { issues: true },
  });
}

async function getSnapshotAtOrBefore(projectId: string, date: Date): Promise<SnapshotWithIssues | null> {
  return prisma.snapshot.findFirst({
    where: { projectId, status: SnapshotStatus.SUCCESS, capturedAt: { lte: date } },
    orderBy: { capturedAt: "desc" },
    include: { issues: true },
  });
}

function isDone(issue: IssueSnapshot): boolean {
  return issue.statusCategory === "done";
}

function isOverdue(issue: IssueSnapshot, now: Date): boolean {
  return !isDone(issue) && issue.dueDate !== null && issue.dueDate < now;
}

function computeChanges(latest: SnapshotWithIssues, baseline: SnapshotWithIssues | null, periodStart: Date) {
  const baselineByKey = new Map(baseline?.issues.map((issue) => [issue.issueKey, issue]) ?? []);
  const now = new Date();

  const changes: IssueChange[] = [];
  const allIssues: IssueListItem[] = [];
  const kpis = { newCount: 0, doneCount: 0, statusChangedCount: 0, overdueCount: 0 };

  for (const issue of latest.issues) {
    const before = baselineByKey.get(issue.issueKey);
    const overdue = isOverdue(issue, now);
    if (overdue) kpis.overdueCount++;

    // "신규 이슈" means actually created in Jira within the period — not just
    // "we hadn't seen it before" (which, on a project's very first sync with
    // no baseline, would count every existing issue as new).
    const createdWithinPeriod = issue.jiraCreatedAt >= periodStart;
    if (createdWithinPeriod) kpis.newCount++;

    let isStatusChanged = false;
    let fromStatus: string | undefined;
    let fromStatusCategory: string | undefined;

    if (!before) {
      if (createdWithinPeriod) {
        changes.push({
          issueKey: issue.issueKey,
          summary: issue.summary,
          type: "new",
          toStatus: issue.status,
          toStatusCategory: issue.statusCategory,
          assignee: issue.assignee,
          dueDate: issue.dueDate?.toISOString() ?? null,
        });
      }
    } else if (before.status !== issue.status) {
      const justCompleted = isDone(issue) && !isDone(before);
      if (justCompleted) {
        kpis.doneCount++;
      } else {
        kpis.statusChangedCount++;
        isStatusChanged = true;
      }
      fromStatus = before.status;
      fromStatusCategory = before.statusCategory;

      changes.push({
        issueKey: issue.issueKey,
        summary: issue.summary,
        type: justCompleted ? "done" : "status_changed",
        fromStatus: before.status,
        fromStatusCategory: before.statusCategory,
        toStatus: issue.status,
        toStatusCategory: issue.statusCategory,
        assignee: issue.assignee,
      });
    } else if (overdue) {
      changes.push({
        issueKey: issue.issueKey,
        summary: issue.summary,
        type: "overdue",
        fromStatus: issue.status,
        fromStatusCategory: issue.statusCategory,
        toStatus: issue.status,
        toStatusCategory: issue.statusCategory,
        assignee: issue.assignee,
        dueDate: issue.dueDate?.toISOString() ?? null,
      });
    }

    allIssues.push({
      issueKey: issue.issueKey,
      summary: issue.summary,
      status: issue.status,
      statusCategory: issue.statusCategory,
      fromStatus,
      fromStatusCategory,
      assignee: issue.assignee,
      dueDate: issue.dueDate?.toISOString() ?? null,
      isNew: createdWithinPeriod,
      isStatusChanged,
      isOverdue: overdue,
    });
  }

  const latestKeys = new Set(latest.issues.map((issue) => issue.issueKey));
  for (const [issueKey, before] of baselineByKey) {
    if (latestKeys.has(issueKey)) continue;
    changes.push({
      issueKey,
      summary: before.summary,
      type: "removed",
      fromStatus: before.status,
      fromStatusCategory: before.statusCategory,
      assignee: before.assignee,
      dueDate: before.dueDate?.toISOString() ?? null,
    });
  }

  return { changes, allIssues, kpis };
}

function computeStatusDistribution(latest: SnapshotWithIssues): StatusSlice[] {
  const counts = new Map<string, StatusSlice>();
  for (const issue of latest.issues) {
    const existing = counts.get(issue.status);
    if (existing) existing.count++;
    else counts.set(issue.status, { status: issue.status, statusCategory: issue.statusCategory, count: 1 });
  }
  return Array.from(counts.values());
}

/**
 * Per-step counts: how many issues turned new / changed status / completed
 * between the *previous* step's snapshot and this one — i.e. the same kind
 * of diff the KPI cards compute, just repeated across the trend window
 * instead of once against the period's overall baseline.
 */
async function buildTrend(projectId: string, period: Period, latest: SnapshotWithIssues): Promise<TrendPoint[]> {
  const steps = period === "day" ? 7 : 6;
  const stepMs = PERIOD_MS[period];
  const points: TrendPoint[] = [];

  let previousSnapshot: SnapshotWithIssues | null = null;
  for (let i = steps - 1; i >= 0; i--) {
    const at = new Date(latest.capturedAt.getTime() - i * stepMs);
    const snapshot = i === 0 ? latest : await getSnapshotAtOrBefore(projectId, at);
    if (!snapshot) continue;

    const periodStart = new Date(snapshot.capturedAt.getTime() - stepMs);
    const stepBaseline = previousSnapshot ?? (await getSnapshotAtOrBefore(projectId, periodStart));
    const { kpis } = computeChanges(snapshot, stepBaseline, periodStart);

    const label = period === "month" ? `${at.getMonth() + 1}월` : `${at.getMonth() + 1}/${at.getDate()}`;
    points.push({
      label,
      newCount: kpis.newCount,
      statusChangedCount: kpis.statusChangedCount,
      doneCount: kpis.doneCount,
    });
    previousSnapshot = snapshot;
  }

  return points;
}

export async function getDashboardData(projectId: string, period: Period): Promise<DashboardData> {
  const latest = await getLatestSuccessfulSnapshot(projectId);
  if (!latest) return EMPTY_DASHBOARD_DATA;

  const baselineDate = new Date(latest.capturedAt.getTime() - PERIOD_MS[period]);
  const baseline = await getSnapshotAtOrBefore(projectId, baselineDate);

  const { changes, allIssues, kpis } = computeChanges(latest, baseline, baselineDate);

  return {
    kpis,
    statusDistribution: computeStatusDistribution(latest),
    trend: await buildTrend(projectId, period, latest),
    changes,
    allIssues,
    latestSnapshot: { capturedAt: latest.capturedAt.toISOString(), issueCount: latest.issueCount },
  };
}
