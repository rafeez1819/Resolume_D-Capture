import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "muted",
  ...props
}: React.ComponentProps<"span"> & { tone?: "muted" | "live" | "tally" | "idle" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[0.6875rem] font-medium uppercase tracking-wide",
        tone === "live" && "bg-live/15 text-live",
        tone === "tally" && "bg-tally/15 text-tally",
        tone === "idle" && "bg-elevated text-muted",
        tone === "muted" && "bg-elevated text-muted",
        className,
      )}
      {...props}
    />
  );
}
