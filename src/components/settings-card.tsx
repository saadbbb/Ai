import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingsCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

/** The standard "titled card section" — a real heading + optional description, distinct from field labels. Use this instead of a hand-rolled `<p>` heading inside a bare `Card`. */
export function SettingsCard({ title, description, actions, children }: SettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {actions && <CardAction>{actions}</CardAction>}
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}
