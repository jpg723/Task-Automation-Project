"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetch-json";
import type { Period } from "@/lib/constants";
import type { DashboardData } from "@/lib/dashboard-types";

export function useDashboardData(projectId: string | undefined, period: Period) {
  return useQuery({
    queryKey: ["dashboard", projectId, period],
    queryFn: () =>
      fetchJson<DashboardData>(
        `/api/dashboard?projectId=${encodeURIComponent(projectId!)}&period=${period}`,
      ),
    enabled: Boolean(projectId),
  });
}
