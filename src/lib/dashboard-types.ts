/** Shapes returned by GET /api/dashboard — shared between the diff engine and dashboard UI. */

export interface StatusSlice {
  status: string;
  statusCategory: string;
  count: number;
}

export interface TrendPoint {
  label: string;
  total: number;
  done: number;
}

export type IssueChangeType = "new" | "done" | "status_changed" | "overdue" | "removed";

export interface IssueChange {
  issueKey: string;
  summary: string;
  type: IssueChangeType;
  fromStatus?: string;
  toStatus?: string;
  assignee?: string | null;
  dueDate?: string | null;
}

export interface DashboardData {
  kpis: {
    newCount: number;
    doneCount: number;
    statusChangedCount: number;
    overdueCount: number;
  };
  statusDistribution: StatusSlice[];
  trend: TrendPoint[];
  changes: IssueChange[];
  latestSnapshot: { capturedAt: string; issueCount: number } | null;
}
