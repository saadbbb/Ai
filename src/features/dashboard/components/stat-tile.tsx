import { Card } from "@/components/ui/card";

export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="px-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </Card>
  );
}
