"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TooltipContentProps } from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import type { StatusSlice } from "@/lib/dashboard-types";

interface StatusDistributionProps {
  data: StatusSlice[];
}

// Non-"done" statuses cycle through the categorical chart palette in order of
// appearance; "done" always breaks to the status-good green since "complete"
// is a semantic state, not just another workflow stage.
const NON_DONE_PALETTE = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6",
  "--chart-7",
  "--chart-8",
];

function colorVarFor(slice: StatusSlice, nonDoneIndex: number): string {
  return slice.statusCategory === "done"
    ? "--status-good"
    : NON_DONE_PALETTE[nonDoneIndex % NON_DONE_PALETTE.length];
}

function withColorVars(data: StatusSlice[]): (StatusSlice & { colorVar: string })[] {
  let nonDoneIndex = 0;
  return data.map((slice) => {
    const colorVar = colorVarFor(slice, nonDoneIndex);
    if (slice.statusCategory !== "done") nonDoneIndex++;
    return { ...slice, colorVar };
  });
}

function DonutTooltip({
  active,
  payload,
}: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="size-2.5 rounded-[2px]"
          style={{ backgroundColor: entry.payload.colorVar ? `var(${entry.payload.colorVar})` : entry.color }}
          aria-hidden
        />
        <span className="text-muted-foreground">{entry.name}</span>
        <span className="ml-auto font-semibold tabular-nums text-foreground">
          {entry.value}
        </span>
      </div>
    </div>
  );
}

export function StatusDistribution({ data }: StatusDistributionProps) {
  const slices = withColorVars(data);
  const total = slices.reduce((sum, d) => sum + d.count, 0);

  if (slices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        아직 수집된 이슈 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex items-center justify-center gap-6">
      <div className="relative size-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="status"
              innerRadius={68}
              outerRadius={105}
              paddingAngle={3}
              cornerRadius={4}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.status} fill={`var(${slice.colorVar})`} />
              ))}
            </Pie>
            <Tooltip content={(props) => <DonutTooltip {...props} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-xs text-muted-foreground">전체 이슈</span>
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {slices.map((slice) => (
          <li key={slice.status} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 rounded-[2px]"
              style={{ backgroundColor: `var(${slice.colorVar})` }}
              aria-hidden
            />
            <span className="text-muted-foreground">{slice.status}</span>
            <span className="font-medium tabular-nums">{slice.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
