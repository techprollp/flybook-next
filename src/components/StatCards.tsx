import { cn } from "@/lib/utils";

export function StatCards({
  items,
}: {
  items: {
    label: string;
    value: string;
    tone?: "default" | "red" | "green" | "amber";
    icon?: string;
  }[];
}) {
  const toneCls = {
    default: "text-slate-900",
    red: "text-red-600",
    green: "text-emerald-600",
    amber: "text-amber-700",
  };
  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4 mb-5",
        items.length === 4
          ? "grid-cols-2 lg:grid-cols-4"
          : "grid-cols-1 sm:grid-cols-3"
      )}
    >
      {items.map((it) => (
        <div key={it.label} className="stat-card">
          <p className="text-xs font-semibold text-slate-400">{it.label}</p>
          <p
            className={cn(
              "mt-1.5 text-xl sm:text-2xl font-bold tracking-tight",
              toneCls[it.tone || "default"]
            )}
          >
            {it.value}
          </p>
          {it.icon && (
            <span className="absolute right-4 top-4 text-lg opacity-60">
              {it.icon}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
