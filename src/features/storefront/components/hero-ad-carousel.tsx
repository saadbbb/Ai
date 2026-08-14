"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { StorefrontAd } from "@/db/schema";
import { cn } from "@/lib/utils";

function AdSlide({ ad, slug }: { ad: StorefrontAd; slug: string }) {
  const image = (
    <div className="relative aspect-[21/9] w-full sm:aspect-[3/1]">
      <Image src={ad.imageUrl} alt={ad.altText ?? ""} fill sizes="100vw" priority className="object-cover" />
    </div>
  );

  if (!ad.linkUrl) return image;
  if (ad.linkUrl.startsWith("/")) {
    return (
      <Link href={`/store/${slug}${ad.linkUrl}`} className="block">
        {image}
      </Link>
    );
  }
  return (
    <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
      {image}
    </a>
  );
}

export function HeroAdCarousel({ ads, slug }: { ads: StorefrontAd[]; slug: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function scrollToIndex(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(ads.length - 1, index));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
    setActiveIndex(clamped);
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
  }

  if (ads.length === 1) return <AdSlide ad={ads[0]} slug={slug} />;

  return (
    <div className="group relative w-full overflow-hidden">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ads.map((ad) => (
          <div key={ad.id} className="w-full shrink-0 snap-start">
            <AdSlide ad={ad} slug={slug} />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous"
        onClick={() => scrollToIndex(activeIndex - 1)}
        className="absolute start-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100 sm:flex"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => scrollToIndex(activeIndex + 1)}
        className="absolute end-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100 sm:flex"
      >
        <ChevronRight className="size-4" />
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {ads.map((ad, index) => (
          <button
            key={ad.id}
            type="button"
            aria-label={`Slide ${index + 1}`}
            onClick={() => scrollToIndex(index)}
            className={cn("size-1.5 rounded-full transition-all", index === activeIndex ? "w-4 bg-background" : "bg-background/50")}
          />
        ))}
      </div>
    </div>
  );
}
