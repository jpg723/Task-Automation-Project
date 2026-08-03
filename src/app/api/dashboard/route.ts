import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/diff";
import { HttpError, toErrorResponse } from "@/lib/api-error";
import type { Period } from "@/lib/constants";

const VALID_PERIODS: Period[] = ["day", "week", "month"];

export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");
    const period = req.nextUrl.searchParams.get("period") as Period | null;

    if (!projectId) throw new HttpError("projectId 쿼리 파라미터는 필수입니다.", 400);
    if (!period || !VALID_PERIODS.includes(period)) {
      throw new HttpError("period 쿼리 파라미터는 day/week/month 중 하나여야 합니다.", 400);
    }

    const data = await getDashboardData(projectId, period);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}
