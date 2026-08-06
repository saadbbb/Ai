export interface TimelineItem {
  id: string;
  label: string;
  meta?: string;
  timestamp: Date;
  href: string | null;
}

/**
 * Merges every typed group (conversations, leads, orders, appointments,
 * activities) into one chronological feed — replaces the contact-detail
 * page's previous fragmented per-type sections (Part 5 gap: "Customer
 * Timeline is fragmented... only the raw Activity section itself is
 * chronological"). Tasks/Notes stay outside this merge — they're actionable
 * widgets (complete/delete/pin), not passive history.
 */
export function mergeTimeline(...groups: TimelineItem[][]): TimelineItem[] {
  return groups.flat().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
