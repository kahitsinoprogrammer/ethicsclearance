import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-md border bg-white px-3 py-2 text-sm text-ink-900 shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-pup-maroon focus:ring-2 focus:ring-pup-maroon/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
