import type { ComponentPropsWithoutRef } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = ComponentPropsWithoutRef<"input"> & {
  error?: string;
  helper?: string;
  label: string;
};

export default function FormField({
  className,
  error,
  id,
  label,
  helper,
  ...inputProps
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          error && "border-destructive focus:border-destructive focus:ring-destructive/20",
          className
        )}
        {...inputProps}
      />
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}
