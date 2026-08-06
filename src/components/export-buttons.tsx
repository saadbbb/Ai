import { Button } from "@/components/ui/button";

/** Same-route ?format= toggle (see src/lib/report-response.ts) — one small link group per report page. */
export function ExportButtons({
  reportPath,
  labels,
}: {
  reportPath: string;
  labels: { csv: string; excel: string; pdf: string };
}) {
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={reportPath}>{labels.csv}</a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`${reportPath}?format=xlsx`}>{labels.excel}</a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`${reportPath}?format=pdf`}>{labels.pdf}</a>
      </Button>
    </div>
  );
}
