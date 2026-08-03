import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { createJiraClient, JiraApiError } from "@/lib/jira";
import { parseProjectCreateInput } from "@/lib/project-input";
import { HttpError, toErrorResponse } from "@/lib/api-error";
import { Prisma } from "@/generated/prisma/client";

export async function GET() {
  const projects = await prisma.project.findMany({
    omit: { apiTokenEnc: true },
    orderBy: { createdAt: "desc" },
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: { capturedAt: true, status: true, issueCount: true, errorMessage: true },
      },
    },
  });

  const data = projects.map(({ snapshots, ...project }) => ({
    ...project,
    lastSnapshot: snapshots[0] ?? null,
  }));

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const input = parseProjectCreateInput(await req.json());

    const client = createJiraClient({
      siteUrl: input.siteUrl,
      email: input.email,
      apiToken: input.apiToken,
    });
    try {
      await client.verifyConnection();
    } catch (error) {
      const message = error instanceof JiraApiError ? error.message : "연결 확인 중 오류가 발생했습니다.";
      throw new HttpError(`Jira 계정 인증에 실패했습니다: ${message}`, 400);
    }

    const project = await prisma.project.create({
      data: {
        name: input.name,
        colorTag: input.colorTag,
        siteUrl: input.siteUrl,
        projectKey: input.projectKey,
        email: input.email,
        apiTokenEnc: encryptSecret(input.apiToken),
        jql: input.jql,
        reportEnabled: input.reportEnabled,
        reportFrequency: input.reportFrequency,
        teamsWebhookUrl: input.teamsWebhookUrl,
      },
      omit: { apiTokenEnc: true },
    });

    return NextResponse.json({ ...project, lastSnapshot: null }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return toErrorResponse(new HttpError("이미 등록된 Jira 사이트/프로젝트 키 조합입니다.", 409));
    }
    return toErrorResponse(error);
  }
}
