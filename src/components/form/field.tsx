import type { ComponentProps } from "react";
import type { FieldError } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps extends ComponentProps<"div"> {
  label: string;
  htmlFor: string;
  error?: FieldError;
}

export function Field({ label, htmlFor, error, children, className, ...props }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}
