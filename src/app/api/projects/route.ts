import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { buildEpicScopedJql, createJiraClient, JiraApiError, parseEpicLink } from "@/lib/jira";
import { parseProjectCreateInput } from "@/lib/project-input";
import { getDefaultJiraCredentials, saveDefaultJiraCredentials } from "@/lib/app-settings";
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

    let parsedLink;
    try {
      parsedLink = parseEpicLink(input.epicLink);
    } catch (error) {
      throw new HttpError(error instanceof Error ? error.message : "에픽 링크가 올바르지 않습니다.", 400);
    }
    const { siteUrl, projectKey, epicKey } = parsedLink;

    // email/apiToken are optional — omit both to reuse the remembered default account.
    let email: string;
    let apiToken: string;
    let apiTokenEnc: string | null = null; // set when reusing the default's already-encrypted token
    if (input.email && input.apiToken) {
      email = input.email;
      apiToken = input.apiToken;
    } else if (!input.email && !input.apiToken) {
      const defaults = await getDefaultJiraCredentials();
      if (!defaults) {
        throw new HttpError("Jira 계정 이메일과 API 토큰을 입력해주세요.", 400);
      }
      email = defaults.email;
      apiToken = decryptSecret(defaults.apiTokenEnc);
      apiTokenEnc = defaults.apiTokenEnc;
    } else {
      throw new HttpError("이메일과 API 토큰은 함께 입력해야 합니다.", 400);
    }

    const client = createJiraClient({ siteUrl, email, apiToken });
    try {
      await client.verifyConnection();
    } catch (error) {
      const message = error instanceof JiraApiError ? error.message : "연결 확인 중 오류가 발생했습니다.";
      throw new HttpError(`Jira 계정 인증에 실패했습니다: ${message}`, 400);
    }

    // Freshly-typed credentials become the new remembered default for next time.
    if (!apiTokenEnc) {
      await saveDefaultJiraCredentials(email, apiToken);
      apiTokenEnc = encryptSecret(apiToken);
    }

    // The epic's own summary makes a good default display name when the user didn't type one.
    let name = input.name;
    if (!name) {
      try {
        const epic = await client.getIssue(epicKey);
        name = epic.fields.summary;
      } catch {
        name = epicKey;
      }
    }

    const project = await prisma.project.create({
      data: {
        name,
        colorTag: input.colorTag,
        siteUrl,
        projectKey,
        epicKey,
        email,
        apiTokenEnc,
        jql: buildEpicScopedJql(epicKey),
        reportEnabled: input.reportEnabled,
        reportFrequency: input.reportFrequency,
        teamsWebhookUrl: input.teamsWebhookUrl,
      },
      omit: { apiTokenEnc: true },
    });

    return NextResponse.json({ ...project, lastSnapshot: null }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return toErrorResponse(new HttpError("이미 등록된 에픽입니다.", 409));
    }
    return toErrorResponse(error);
  }
}
