import { ReportFrequency } from "@/generated/prisma/enums";

export type Period = "day" | "week" | "month";

export const PROJECT_COLOR_OPTIONS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#4a3aa7",
];

export const PERIOD_LABEL: Record<Period, string> = {
  day: "일간",
  week: "주간",
  month: "월간",
};

export const REPORT_FREQUENCY_LABEL: Record<ReportFrequency, string> = {
  DAILY: "매일",
  WEEKLY: "매주",
  MONTHLY: "매월",
};
