import { SOCIAL_ICONS } from "./social-icons";

const SOCIAL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  snapchat: "Snapchat",
  telegram: "Telegram",
  twitter: "X (Twitter)",
};

export function SocialLinksRow({ links }: { links: Record<string, string> }) {
  const entries = Object.entries(links).filter(([, url]) => url);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-3 pt-2">
      {entries.map(([key, url]) => {
        const Icon = SOCIAL_ICONS[key];
        const label = SOCIAL_LABELS[key] ?? key;
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            aria-label={label}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
          >
            {Icon ? <Icon /> : <span className="text-sm">{label}</span>}
          </a>
        );
      })}
    </div>
  );
}
