import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSnapshot } from "@/lib/snapshot-service";

export const maxDuration = 60;

/**
 * Hourly Vercel Cron target (see vercel.json). Vercel automatically sends
 * `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set on the project,
 * so this doubles as the auth check for this otherwise-public route.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const results = await Promise.all(
    projects.map(async (project) => {
      try {
        await runSnapshot(project.id);
        return { projectId: project.id, name: project.name, ok: true as const };
      } catch (error) {
        const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
        return { projectId: project.id, name: project.name, ok: false as const, error: message };
      }
    }),
  );

  const succeeded = results.filter((r) => r.ok).length;
  return NextResponse.json({
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  });
}
