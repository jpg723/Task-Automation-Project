import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { buildDefaultJql, createJiraClient, toIssueSnapshotData } from "@/lib/jira";
import { SnapshotStatus } from "@/generated/prisma/enums";

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`프로젝트를 찾을 수 없습니다: ${projectId}`);
    this.name = "ProjectNotFoundError";
  }
}

/**
 * Collects the current issue state from Jira and stores it as a new Snapshot.
 * On failure, records a FAILED snapshot (with the error message) instead of
 * touching prior data, so the dashboard keeps showing the last good state.
 */
export async function runSnapshot(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new ProjectNotFoundError(projectId);

  const client = createJiraClient({
    siteUrl: project.siteUrl,
    email: project.email,
    apiToken: decryptSecret(project.apiTokenEnc),
    projectKey: project.projectKey,
  });

  const jql = project.jql ?? buildDefaultJql(project.projectKey);

  try {
    // Epic-scoped tracking needs the extra subtask pass — see
    // searchAllIssuesWithDescendants for why a plain epic JQL misses them.
    const issues = project.epicKey
      ? await client.searchAllIssuesWithDescendants(jql)
      : await client.searchAllIssues(jql);
    return await prisma.snapshot.create({
      data: {
        projectId,
        status: SnapshotStatus.SUCCESS,
        issueCount: issues.length,
        issues: { create: issues.map(toIssueSnapshotData) },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    await prisma.snapshot.create({
      data: { projectId, status: SnapshotStatus.FAILED, errorMessage: message, issueCount: 0 },
    });
    throw error;
  }
}
