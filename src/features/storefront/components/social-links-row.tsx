const SOCIAL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  snapchat: "Snapchat",
  telegram: "Telegram",
};

export function SocialLinksRow({ links }: { links: Record<string, string> }) {
  const entries = Object.entries(links).filter(([, url]) => url);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3 pt-2">
      {entries.map(([key, url]) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          {SOCIAL_LABELS[key] ?? key}
        </a>
      ))}
    </div>
  );
}
