"use client";

import { useEffect, useState } from "react";
import type { Storefront } from "@/db/schema";

const SESSION_KEY = "storefront-popup-shown";

export function PromoPopup({ storefront, slug, dismissLabel }: { storefront: Storefront; slug: string; dismissLabel: string }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!storefront.popupEnabled) return;
    if (sessionStorage.getItem(`${SESSION_KEY}-${slug}`)) return;

    function show() {
      setIsOpen(true);
      sessionStorage.setItem(`${SESSION_KEY}-${slug}`, "1");
    }

    if (storefront.popupTrigger === "first_visit") {
      show();
      return;
    }

    if (storefront.popupTrigger === "delay") {
      const timer = setTimeout(show, storefront.popupDelaySeconds * 1000);
      return () => clearTimeout(timer);
    }

    if (storefront.popupTrigger === "exit_intent") {
      function handleMouseLeave(event: MouseEvent) {
        if (event.clientY <= 0) show();
      }
      document.addEventListener("mouseleave", handleMouseLeave);
      return () => document.removeEventListener("mouseleave", handleMouseLeave);
    }
  }, [storefront.popupEnabled, storefront.popupTrigger, storefront.popupDelaySeconds, slug]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-popover p-6 text-center shadow-lg">
        {storefront.popupTitle && <h2 className="text-lg font-semibold">{storefront.popupTitle}</h2>}
        {storefront.popupMessage && <p className="mt-2 text-sm text-muted-foreground">{storefront.popupMessage}</p>}
        <div className="mt-4 flex flex-col gap-2">
          {storefront.popupButtonText && storefront.popupButtonLink && (
            <a
              href={storefront.popupButtonLink}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm text-primary-foreground hover:opacity-90"
            >
              {storefront.popupButtonText}
            </a>
          )}
          <button type="button" onClick={() => setIsOpen(false)} className="text-xs text-muted-foreground hover:underline">
            {dismissLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
