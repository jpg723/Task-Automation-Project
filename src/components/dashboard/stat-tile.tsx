import type { LucideIcon } from "lucide-react";

interface StatTileProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tint?: "gray" | "blue" | "violet" | "green" | "peach";
  hint?: string;
}

const TINT_VAR: Record<NonNullable<StatTileProps["tint"]>, string> = {
  gray: "--muted-foreground",
  blue: "--seq-dark",
  violet: "--tint-violet",
  green: "--status-good",
  peach: "--status-critical",
};

export function StatTile({
  label,
  value,
  icon: Icon,
  tint = "blue",
  hint,
}: StatTileProps) {
  const accent = `var(${TINT_VAR[tint]})`;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        backgroundColor: `color-mix(in srgb, ${accent} 12%, var(--card))`,
        borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-foreground/70">
          {label}
        </span>
        <Icon
          className="size-4"
          style={{ color: accent }}
          strokeWidth={1.75}
        />
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums">{value}</div>
      {hint ? (
        <div
          className="mt-1.5 text-sm font-semibold"
          style={{ color: accent }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}
