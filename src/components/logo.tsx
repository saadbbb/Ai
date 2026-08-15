"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The Yaqiz / يقظ brand mark: a gradient (lime → green) brow-arc over a
 * gradient crescent, forming a stylized watchful eye — recolored to the
 * neon-green brand palette (Aug 2026). `variant="tile"` renders it on a dark
 * rounded-square backdrop (favicons, empty states, loading screens); the
 * default renders the mark alone so it can sit on any surface.
 */
function LogoMark({ className }: { className?: string }) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c3f27a" />
          <stop offset="1" stopColor="#86e13a" />
        </linearGradient>
      </defs>
      <path d="M10 34 Q50 2 90 34" stroke={`url(#${gradientId})`} strokeWidth="14" strokeLinecap="round" />
      <circle cx="50" cy="56" r="27" fill={`url(#${gradientId})`} />
      <circle cx="59" cy="48" r="8.5" fill="#0a0c11" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  variant?: "mark" | "tile";
}

export function Logo({ className, variant = "mark" }: LogoProps) {
  if (variant === "tile") {
    return (
      <div className={cn("flex aspect-square items-center justify-center rounded-2xl bg-surface-elevated", className)}>
        <LogoMark className="h-[64%] w-[64%]" />
      </div>
    );
  }

  return <LogoMark className={cn("h-8 w-auto", className)} />;
}
