import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  tone?: "gold" | "maroon";
  value: string;
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  tone = "maroon"
}: StatCardProps) {
  const toneClass =
    tone === "gold"
      ? "bg-pup-gold/20 text-pup-maroon"
      : "bg-pup-maroon/10 text-pup-maroon";

  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-md", toneClass)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink-900">{value}</p>
    </div>
  );
}
