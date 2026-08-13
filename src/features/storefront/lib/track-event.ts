"use client";

/**
 * Fires the semantic event for whichever pixel(s) tracking-scripts.tsx already loaded
 * (Meta/GA4/TikTok). No event-mapping UI is exposed to the owner — behavior is wired
 * to real storefront actions (view a product → ViewContent, submit a form → Lead,
 * a confirmed order → Purchase), matching spec §23 exactly. A no-op wherever a given
 * pixel isn't configured, since tracking-scripts.tsx only defines the globals it loads.
 */
export type TrackEventKind = "ViewContent" | "Lead" | "Purchase";

interface TrackEventParams {
  contentName?: string;
  value?: number;
  currency?: string;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track: (event: string, params?: Record<string, unknown>) => void };
  }
}

const GA_EVENT_NAME: Record<TrackEventKind, string> = {
  ViewContent: "view_item",
  Lead: "generate_lead",
  Purchase: "purchase",
};

const TIKTOK_EVENT_NAME: Record<TrackEventKind, string> = {
  ViewContent: "ViewContent",
  Lead: "SubmitForm",
  Purchase: "CompletePayment",
};

export function trackEvent(kind: TrackEventKind, params: TrackEventParams = {}): void {
  if (typeof window === "undefined") return;
  const currency = params.currency ?? "IQD";

  window.fbq?.("track", kind, {
    ...(params.contentName ? { content_name: params.contentName } : {}),
    ...(params.value !== undefined ? { value: params.value, currency } : {}),
  });

  window.gtag?.("event", GA_EVENT_NAME[kind], {
    ...(params.value !== undefined ? { value: params.value, currency } : {}),
    ...(params.contentName ? { items: [{ item_name: params.contentName }] } : {}),
  });

  window.ttq?.track(TIKTOK_EVENT_NAME[kind], {
    ...(params.contentName ? { content_name: params.contentName } : {}),
    ...(params.value !== undefined ? { value: params.value, currency } : {}),
  });
}
