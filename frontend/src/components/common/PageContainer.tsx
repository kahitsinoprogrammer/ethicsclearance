import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export default function PageContainer({
  className,
  ...props
}: ComponentPropsWithoutRef<"main">) {
  return (
    <main
      className={cn("mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
