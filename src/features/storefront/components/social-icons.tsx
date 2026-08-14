import type { ReactElement, SVGProps } from "react";

/**
 * Hand-authored currentColor glyphs — the installed lucide-react set has no real brand
 * icons for these platforms, and pulling in a second icon library for 8 static glyphs
 * would be disproportionate.
 */
function IconBase(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props} />;
}

export const SOCIAL_ICONS: Record<string, (props: SVGProps<SVGSVGElement>) => ReactElement> = {
  whatsapp: (props) => (
    <IconBase {...props}>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.4-5.6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2.9 2.4.1.2 1.6 2.5 3.9 3.4.5.2 1 .4 1.3.5.5.2 1 .1 1.4.1.4-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3Z"
      />
    </IconBase>
  ),
  instagram: (props) => (
    <IconBase {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" />
    </IconBase>
  ),
  facebook: (props) => (
    <IconBase {...props}>
      <path
        fill="currentColor"
        d="M14 9h2.5V6.2c-.4-.1-1.6-.2-2.9-.2-2.9 0-4.6 1.7-4.6 4.9V13H6v3h3v7h3.4v-7h2.9l.5-3h-3.4v-1.7c0-.9.2-1.3 1.6-1.3Z"
      />
    </IconBase>
  ),
  tiktok: (props) => (
    <IconBase {...props}>
      <circle cx="9" cy="17" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 17V4h2.2a4.8 4.8 0 0 0 4.8 4.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  ),
  youtube: (props) => (
    <IconBase {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M10.5 9.5v5l4.5-2.5Z" fill="currentColor" />
    </IconBase>
  ),
  snapchat: (props) => (
    <IconBase {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="M12 3c-3 0-5 2.3-5 5.4v1.7c-.7.4-1.5.7-2.2.8-.4.1-.6.5-.4.9.3.6 1 1.1 1.8 1.4-.1.3-.3.6-.6.8-.3.2-.2.6.1.7.7.2 1.5.3 1.9.6.3.2.3.6.7 1.1.6.8 1.7 1.3 3.7 1.3s3.1-.5 3.7-1.3c.4-.5.4-.9.7-1.1.4-.3 1.2-.4 1.9-.6.3-.1.4-.5.1-.7-.3-.2-.5-.5-.6-.8.8-.3 1.5-.8 1.8-1.4.2-.4 0-.8-.4-.9-.7-.1-1.5-.4-2.2-.8V8.4C17 5.3 15 3 12 3Z"
      />
    </IconBase>
  ),
  telegram: (props) => (
    <IconBase {...props}>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M21 4 3 11.5l6 2.2M21 4 15.5 20l-4-6.3M21 4 9 13.7v5.1"
      />
    </IconBase>
  ),
  twitter: (props) => (
    <IconBase {...props}>
      <path stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" d="M4 4l16 16M20 4 4 20" />
    </IconBase>
  ),
};
