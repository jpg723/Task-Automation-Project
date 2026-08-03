import { NextRequest, NextResponse } from "next/server";
import { ProjectNotFoundError, runSnapshot } from "@/lib/snapshot-service";
import { HttpError, toErrorResponse } from "@/lib/api-error";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const snapshot = await runSnapshot(id);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      return toErrorResponse(new HttpError(error.message, 404));
    }
    return toErrorResponse(error);
  }
}
