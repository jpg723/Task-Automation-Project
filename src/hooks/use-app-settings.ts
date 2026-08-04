"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetch-json";

interface AppSettingsResponse {
  defaultJiraEmail: string | null;
}

export function useDefaultJiraCredentials() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => fetchJson<AppSettingsResponse>("/api/settings"),
  });
}
