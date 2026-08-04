import { ReportFrequency } from "@/generated/prisma/enums";
import { HttpError } from "@/lib/api-error";

const REPORT_FREQUENCIES = Object.values(ReportFrequency);

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(`${key} 필드는 필수입니다.`, 400);
  }
  return value.trim();
}

function optionalNullableString(body: Record<string, unknown>, key: string): string | null | undefined {
  if (body[key] === undefined) return undefined;
  if (body[key] === null) return null;
  if (typeof body[key] !== "string") throw new HttpError(`${key} 필드가 올바르지 않습니다.`, 400);
  const trimmed = (body[key] as string).trim();
  return trimmed === "" ? null : trimmed;
}

function optionalBoolean(body: Record<string, unknown>, key: string): boolean | undefined {
  if (body[key] === undefined) return undefined;
  if (typeof body[key] !== "boolean") throw new HttpError(`${key} 필드가 올바르지 않습니다.`, 400);
  return body[key];
}

function optionalReportFrequency(body: Record<string, unknown>): ReportFrequency | undefined {
  if (body.reportFrequency === undefined) return undefined;
  if (!REPORT_FREQUENCIES.includes(body.reportFrequency as ReportFrequency)) {
    throw new HttpError("reportFrequency 값이 올바르지 않습니다.", 400);
  }
  return body.reportFrequency as ReportFrequency;
}

function asBody(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null) {
    throw new HttpError("요청 본문이 올바르지 않습니다.", 400);
  }
  return input as Record<string, unknown>;
}

/**
 * Registration payload: a single Jira epic link is the source of truth for
 * siteUrl/projectKey/epicKey (parsed in the route via `parseEpicLink`), and
 * name/jql default from the epic itself when not explicitly provided.
 * email/apiToken are optional — when omitted, the route falls back to the
 * remembered default credentials (see src/lib/app-settings.ts).
 */
export interface ProjectCreateInput {
  name: string | null;
  colorTag: string | null;
  epicLink: string;
  email: string | null;
  apiToken: string | null;
  reportEnabled: boolean;
  reportFrequency: ReportFrequency;
  teamsWebhookUrl: string | null;
}

export function parseProjectCreateInput(input: unknown): ProjectCreateInput {
  const body = asBody(input);
  return {
    name: optionalNullableString(body, "name") ?? null,
    colorTag: optionalNullableString(body, "colorTag") ?? null,
    epicLink: requireString(body, "epicLink"),
    email: optionalNullableString(body, "email") ?? null,
    apiToken: optionalNullableString(body, "apiToken") ?? null,
    reportEnabled: optionalBoolean(body, "reportEnabled") ?? true,
    reportFrequency: optionalReportFrequency(body) ?? ReportFrequency.DAILY,
    teamsWebhookUrl: optionalNullableString(body, "teamsWebhookUrl") ?? null,
  };
}

export interface ProjectUpdateInput {
  name?: string;
  colorTag?: string | null;
  siteUrl?: string;
  projectKey?: string;
  email?: string;
  /** Present + non-empty rotates the stored token; absent/empty leaves it untouched. */
  apiToken?: string;
  jql?: string | null;
  isActive?: boolean;
  reportEnabled?: boolean;
  reportFrequency?: ReportFrequency;
  teamsWebhookUrl?: string | null;
}

export function parseProjectUpdateInput(input: unknown): ProjectUpdateInput {
  const body = asBody(input);

  const apiToken = optionalNullableString(body, "apiToken");

  return {
    name: body.name !== undefined ? requireString(body, "name") : undefined,
    colorTag: optionalNullableString(body, "colorTag"),
    siteUrl: body.siteUrl !== undefined ? requireString(body, "siteUrl").replace(/\/+$/, "") : undefined,
    projectKey: body.projectKey !== undefined ? requireString(body, "projectKey").toUpperCase() : undefined,
    email: body.email !== undefined ? requireString(body, "email") : undefined,
    apiToken: apiToken ?? undefined,
    jql: optionalNullableString(body, "jql"),
    isActive: optionalBoolean(body, "isActive"),
    reportEnabled: optionalBoolean(body, "reportEnabled"),
    reportFrequency: optionalReportFrequency(body),
    teamsWebhookUrl: optionalNullableString(body, "teamsWebhookUrl"),
  };
}
