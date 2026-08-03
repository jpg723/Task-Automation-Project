import { NextResponse } from "next/server";
import { JiraApiError } from "@/lib/jira";

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof JiraApiError) {
    return NextResponse.json(
      { error: `Jira API 요청이 실패했습니다: ${error.message}` },
      { status: 502 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
}
