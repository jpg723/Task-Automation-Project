import type { ReportFrequency, SnapshotStatus } from "@/generated/prisma/enums";

/** Client-facing project shape returned by /api/projects — Dates arrive as ISO strings, apiTokenEnc is never sent. */
export interface Project {
  id: string;
  name: string;
  colorTag: string | null;
  isActive: boolean;
  siteUrl: string;
  projectKey: string;
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

export interface ProjectInput {
  name: string;
  colorTag?: string | null;
  siteUrl: string;
  projectKey: string;
  email: string;
  /** Required on create; on update, omit or leave empty to keep the stored token. */
  apiToken?: string;
  jql?: string | null;
  reportEnabled: boolean;
  reportFrequency: ReportFrequency;
  teamsWebhookUrl?: string | null;
}
