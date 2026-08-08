function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

export function ContactAvatar({ fullName, avatarUrl }: { fullName: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- external, per-contact URLs; not part of the app's own optimized asset set
    return <img src={avatarUrl} alt={fullName} className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {initialsOf(fullName)}
    </div>
  );
}
