/** Shapes returned by GET /api/dashboard — shared between the diff engine and dashboard UI. */

export interface StatusSlice {
  status: string;
  statusCategory: string;
  count: number;
}

export interface TrendPoint {
  label: string;
  newCount: number;
  statusChangedCount: number;
  doneCount: number;
}

export type IssueChangeType = "new" | "done" | "status_changed" | "overdue" | "removed";

export interface IssueChange {
  issueKey: string;
  summary: string;
  type: IssueChangeType;
  fromStatus?: string;
  fromStatusCategory?: string;
  toStatus?: string;
  toStatusCategory?: string;
  assignee?: string | null;
  dueDate?: string | null;
}

export interface IssueListItem {
  issueKey: string;
  summary: string;
  status: string;
  statusCategory: string;
  fromStatus?: string;
  fromStatusCategory?: string;
  assignee: string | null;
  dueDate: string | null;
  // Same classification the KPI counts use, computed per-issue so the "전체
  // 이슈/신규/완료/마감 지연" tabs filter to exactly the sets the cards above
  // count — instead of drifting from a separately-filtered list.
  // "신규" always means "created today" (last 24h), independent of whichever
  // day/week/month period is selected elsewhere on the dashboard.
  isNewToday: boolean;
  isOverdue: boolean;
}

export interface DashboardData {
  kpis: {
    newCount: number;
    newTodayCount: number;
    doneCount: number;
    statusChangedCount: number;
    overdueCount: number;
  };
  statusDistribution: StatusSlice[];
  trend: TrendPoint[];
  changes: IssueChange[];
  allIssues: IssueListItem[];
  latestSnapshot: { capturedAt: string; issueCount: number } | null;
}
