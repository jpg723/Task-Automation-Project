import type { ReportFrequency, SnapshotStatus } from "@/generated/prisma/enums";

/** Client-facing project shape returned by /api/projects — Dates arrive as ISO strings, apiTokenEnc is never sent. */
export interface Project {
  id: string;
  name: string;
  colorTag: string | null;
  isActive: boolean;
  siteUrl: string;
  projectKey: string;
  epicKey: string | null;
  email: string;
  jql: string | null;
  reportEnabled: boolean;
  reportFrequency: ReportFrequency;
  teamsWebhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastSnapshot: {
    capturedAt: string;
    status: SnapshotStatus;
    issueCount: number;
    errorMessage: string | null;
  } | null;
}

/**
 * Registration payload for the simplified "paste an epic link" create flow.
 * Omit both email and apiToken to reuse the remembered default Jira account.
 */
export interface EpicProjectCreateInput {
  name: string;
  epicLink: string;
  email?: string;
  apiToken?: string;
}

/** Edit-mode payload — full field set, used by the project edit dialog. */
export interface ProjectUpdateInput {
  name?: string;
  colorTag?: string | null;
  siteUrl?: string;
  projectKey?: string;
  email?: string;
  /** Leave empty/omit to keep the stored token. */
  apiToken?: string;
  jql?: string | null;
  isActive?: boolean;
  reportEnabled?: boolean;
  reportFrequency?: ReportFrequency;
  teamsWebhookUrl?: string | null;
}
