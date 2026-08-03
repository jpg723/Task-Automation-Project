/**
 * Jira Cloud REST API v3 client.
 *
 * Uses the enhanced JQL search endpoint (`POST /rest/api/3/search/jql`) with
 * cursor-based pagination (`nextPageToken`) — the legacy `startAt`-based
 * `/rest/api/3/search` endpoint has been retired by Atlassian.
 * https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search
 */

export interface JiraIssueFields {
  summary: string;
  status: { name: string; statusCategory: { key: string } };
  issuetype: { name: string };
  priority?: { name: string } | null;
  assignee?: { displayName: string } | null;
  duedate?: string | null;
  labels: string[];
  created: string;
  updated: string;
}

export interface JiraIssue {
  key: string;
  fields: JiraIssueFields;
}

interface JiraSearchPage {
  issues: JiraIssue[];
  nextPageToken?: string;
}

export interface JiraClientConfig {
  siteUrl: string;
  email: string;
  apiToken: string;
}

const DEFAULT_FIELDS = [
  "summary",
  "status",
  "issuetype",
  "priority",
  "assignee",
  "duedate",
  "labels",
  "created",
  "updated",
];

export class JiraApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

export function createJiraClient({ siteUrl, email, apiToken }: JiraClientConfig) {
  const baseUrl = siteUrl.replace(/\/+$/, "");
  const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => undefined);
      throw new JiraApiError(`Jira API request failed: ${res.status} ${res.statusText}`, res.status, body);
    }

    return res.json() as Promise<T>;
  }

  /** Verifies the site URL + credentials work. Used when registering a project. */
  async function verifyConnection(): Promise<{ accountId: string; displayName: string }> {
    return request("/rest/api/3/myself");
  }

  /** Fetches every issue matching a JQL query, following pagination to completion. */
  async function searchAllIssues(jql: string, fields: string[] = DEFAULT_FIELDS): Promise<JiraIssue[]> {
    const issues: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    do {
      const page = await request<JiraSearchPage>("/rest/api/3/search/jql", {
        method: "POST",
        body: JSON.stringify({
          jql,
          fields,
          maxResults: 100,
          ...(nextPageToken ? { nextPageToken } : {}),
        }),
      });

      issues.push(...page.issues);
      nextPageToken = page.nextPageToken;
    } while (nextPageToken);

    return issues;
  }

  return { verifyConnection, searchAllIssues };
}

export type JiraClient = ReturnType<typeof createJiraClient>;

/** Default JQL for a project when no custom filter is configured. */
export function buildDefaultJql(projectKey: string): string {
  return `project = "${projectKey}" ORDER BY updated DESC`;
}

/** Maps a raw Jira issue to the shape stored in IssueSnapshot (see prisma/schema.prisma). */
export function toIssueSnapshotData(issue: JiraIssue) {
  return {
    issueKey: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status.name,
    statusCategory: issue.fields.status.statusCategory.key,
    issueType: issue.fields.issuetype.name,
    priority: issue.fields.priority?.name ?? null,
    assignee: issue.fields.assignee?.displayName ?? null,
    dueDate: issue.fields.duedate ? new Date(issue.fields.duedate) : null,
    labels: issue.fields.labels,
    jiraCreatedAt: new Date(issue.fields.created),
    jiraUpdatedAt: new Date(issue.fields.updated),
  };
}
