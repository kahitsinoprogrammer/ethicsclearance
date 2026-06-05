import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingModalProps = {
  description?: string;
  open: boolean;
  title?: string;
};

export default function LoadingModal({
  description = "Please wait while we complete your request.",
  open,
  title = "Loading"
}: LoadingModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 px-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
          <Loader2 className={cn("h-6 w-6 animate-spin")} aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
