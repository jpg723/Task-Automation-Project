"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import type { TrendPoint } from "@/lib/dashboard-types";

interface TrendChartProps {
  data: TrendPoint[];
}

const TICK_STYLE = { fill: "var(--muted-foreground)", fontSize: 12 };

function ChartTooltip({
  active,
  payload,
  label,
}: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1.5 font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div
            key={String(entry.dataKey ?? entry.name)}
            className="flex items-center gap-2"
          >
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-foreground">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--chart-grid)"
          strokeDasharray="0"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tick={TICK_STYLE}
        />
        <YAxis tickLine={false} axisLine={false} tick={TICK_STYLE} width={32} />
        <Tooltip
          content={(props) => <ChartTooltip {...props} />}
          cursor={{ stroke: "var(--chart-axis)" }}
        />
        <Legend
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
        />
        <Line
          type="monotone"
          dataKey="newCount"
          name="신규 이슈"
          stroke="var(--seq-dark)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--seq-dark)", stroke: "var(--chart-surface)", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="statusChangedCount"
          name="상태 변경"
          stroke="var(--tint-violet)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--tint-violet)", stroke: "var(--chart-surface)", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="doneCount"
          name="완료 이슈"
          stroke="var(--status-good)"
          strokeWidth={2}
          dot={{ r: 4, fill: "var(--status-good)", stroke: "var(--chart-surface)", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
