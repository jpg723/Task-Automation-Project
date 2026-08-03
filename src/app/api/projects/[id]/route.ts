import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { createJiraClient, JiraApiError } from "@/lib/jira";
import { parseProjectUpdateInput } from "@/lib/project-input";
import { HttpError, toErrorResponse } from "@/lib/api-error";
import { Prisma } from "@/generated/prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const input = parseProjectUpdateInput(await req.json());

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) throw new HttpError("프로젝트를 찾을 수 없습니다.", 404);

    const credentialsChanged =
      input.apiToken !== undefined || input.siteUrl !== undefined || input.email !== undefined;

    let apiTokenEnc = existing.apiTokenEnc;
    if (credentialsChanged) {
      const effectiveToken = input.apiToken ?? decryptSecret(existing.apiTokenEnc);
      const client = createJiraClient({
        siteUrl: input.siteUrl ?? existing.siteUrl,
        email: input.email ?? existing.email,
        apiToken: effectiveToken,
      });
      try {
        await client.verifyConnection();
      } catch (error) {
        const message = error instanceof JiraApiError ? error.message : "연결 확인 중 오류가 발생했습니다.";
        throw new HttpError(`Jira 계정 인증에 실패했습니다: ${message}`, 400);
      }
      if (input.apiToken !== undefined) {
        apiTokenEnc = encryptSecret(input.apiToken);
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: input.name,
        colorTag: input.colorTag,
        siteUrl: input.siteUrl,
        projectKey: input.projectKey,
        email: input.email,
        apiTokenEnc,
        jql: input.jql,
        isActive: input.isActive,
        reportEnabled: input.reportEnabled,
        reportFrequency: input.reportFrequency,
        teamsWebhookUrl: input.teamsWebhookUrl,
      },
      omit: { apiTokenEnc: true },
    });

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return toErrorResponse(new HttpError("이미 등록된 Jira 사이트/프로젝트 키 조합입니다.", 409));
    }
    return toErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return toErrorResponse(new HttpError("프로젝트를 찾을 수 없습니다.", 404));
    }
    return toErrorResponse(error);
  }
}
