import { NextResponse } from "next/server";
import { getDefaultJiraCredentials } from "@/lib/app-settings";

export async function GET() {
  const credentials = await getDefaultJiraCredentials();
  return NextResponse.json({ defaultJiraEmail: credentials?.email ?? null });
}
