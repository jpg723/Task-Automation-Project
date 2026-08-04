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
  parent?: { key: string } | null;
  // Indexed so a resolved custom due-date field id (e.g. "customfield_10271")
  // can be read off dynamically — see resolveDueDateFieldId().
  [key: string]: unknown;
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
  // Used to scope custom-field resolution (e.g. a per-project "기한" field) to
  // this project — Team-managed projects each get their own field instance
  // sharing the same display name, so an unscoped lookup can grab the wrong
  // project's field. See resolveDueDateFieldId().
  projectKey?: string;
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
  "parent",
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

export function createJiraClient({ siteUrl, email, apiToken, projectKey }: JiraClientConfig) {
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

  /** Fetches a single issue (used to derive a default project name from an epic's summary). */
  async function getIssue(issueKey: string): Promise<JiraIssue> {
    return request(`/rest/api/3/issue/${issueKey}?fields=summary`);
  }

  // Some projects use a custom date field (e.g. Korean-language projects
  // often add one literally named "기한") instead of Jira's standard system
  // "duedate" field. Team-managed projects each get their own instance of
  // that field sharing the same display name, so this must be scoped to
  // `projectKey`'s internal Jira id — an unscoped name match can silently
  // grab a different project's field. Resolved once per client and cached.
  let dueDateFieldIdPromise: Promise<string | null> | null = null;
  async function resolveDueDateFieldId(): Promise<string | null> {
    if (!projectKey) return null;
    if (!dueDateFieldIdPromise) {
      dueDateFieldIdPromise = (async () => {
        const [fields, project] = await Promise.all([
          request<Array<{ id: string; name: string; schema?: { type?: string }; scope?: { project?: { id?: string } } }>>(
            "/rest/api/3/field",
          ),
          request<{ id: string }>(`/rest/api/3/project/${projectKey}`),
        ]);
        const dateFields = fields.filter(
          (f) => f.schema?.type === "date" && /^(기한|due date)$/i.test(f.name),
        );
        const scopedMatch = dateFields.find((f) => f.scope?.project?.id === project.id);
        // Fall back to any non-system match, then to the system field itself.
        const match = scopedMatch ?? dateFields.find((f) => f.id !== "duedate") ?? dateFields[0];
        return match?.id ?? null;
      })().catch(() => null);
    }
    return dueDateFieldIdPromise;
  }

  /** Fetches every issue matching a JQL query, following pagination to completion. */
  async function searchAllIssues(jql: string, fields: string[] = DEFAULT_FIELDS): Promise<JiraIssue[]> {
    const dueDateFieldId = await resolveDueDateFieldId();
    const requestFields =
      dueDateFieldId && !fields.includes(dueDateFieldId) ? [...fields, dueDateFieldId] : fields;

    const issues: JiraIssue[] = [];
    let nextPageToken: string | undefined;

    do {
      const page = await request<JiraSearchPage>("/rest/api/3/search/jql", {
        method: "POST",
        body: JSON.stringify({
          jql,
          fields: requestFields,
          maxResults: 100,
          ...(nextPageToken ? { nextPageToken } : {}),
        }),
      });

      issues.push(...page.issues);
      nextPageToken = page.nextPageToken;
    } while (nextPageToken);

    // Normalize the custom due-date field onto `fields.duedate` so downstream
    // code (toIssueSnapshotData) only ever needs to read one place.
    if (dueDateFieldId && dueDateFieldId !== "duedate") {
      for (const issue of issues) {
        const customValue = issue.fields[dueDateFieldId];
        if (typeof customValue === "string") {
          issue.fields.duedate = customValue;
        }
      }
    }

    return issues;
  }

  /**
   * Fetches every leaf-level issue under `jql`: a direct epic child that has
   * subtasks is dropped in favor of tracking its subtasks instead (it's just
   * an organizational wrapper); a direct epic child with no subtasks is kept
   * as-is, since it IS the leaf for that branch. Subtasks don't carry
   * "Epic Link"/parent-epic values themselves, so this runs a second
   * `parent in (...)` query over the first result's keys to find them.
   */
  async function searchAllIssuesWithDescendants(jql: string, fields: string[] = DEFAULT_FIELDS): Promise<JiraIssue[]> {
    const topLevel = await searchAllIssues(jql, fields);
    const topKeys = topLevel.map((issue) => issue.key);
    if (topKeys.length === 0) return topLevel;

    const childJql = `parent in (${topKeys.map((key) => `"${key}"`).join(", ")})`;
    const children = await searchAllIssues(childJql, fields);

    const parentsWithChildren = new Set(
      children.map((child) => child.fields.parent?.key).filter((key): key is string => Boolean(key)),
    );
    const leafTopLevel = topLevel.filter((issue) => !parentsWithChildren.has(issue.key));

    return [...leafTopLevel, ...children];
  }

  return { verifyConnection, searchAllIssues, searchAllIssuesWithDescendants, getIssue };
}

export type JiraClient = ReturnType<typeof createJiraClient>;

/** Default JQL for a project when no custom filter is configured. */
export function buildDefaultJql(projectKey: string): string {
  return `project = "${projectKey}" ORDER BY updated DESC`;
}

/** JQL that tracks an epic's children, covering both classic ("Epic Link") and team-managed ("parent") projects. */
export function buildEpicScopedJql(epicKey: string): string {
  return `"Epic Link" = ${epicKey} OR parent = ${epicKey}`;
}

export interface ParsedEpicLink {
  siteUrl: string;
  projectKey: string;
  epicKey: string;
}

const BROWSE_URL_PATTERN = /^(https?:\/\/[^/\s]+)\/browse\/([A-Za-z][A-Za-z0-9_]*-\d+)/i;

/** Parses a Jira "browse" issue link (e.g. https://team.atlassian.net/browse/PROJ-123) into its site/project/issue key. */
export function parseEpicLink(input: string): ParsedEpicLink {
  const match = input.trim().match(BROWSE_URL_PATTERN);
  if (!match) {
    throw new Error(
      "Jira 이슈 링크 형식이 올바르지 않습니다. 예: https://your-team.atlassian.net/browse/PROJ-123",
    );
  }
  const [, siteUrl, epicKey] = match;
  return {
    siteUrl,
    projectKey: epicKey.split("-")[0].toUpperCase(),
    epicKey: epicKey.toUpperCase(),
  };
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
