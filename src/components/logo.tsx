import { cn } from "@/lib/utils";

const MARK_PATH_ARC = "M20 55 Q 82 6 144 55";
const OUTER = { cx: 82, cy: 66, r: 38 };
const CUTOUT = { cx: 104, cy: 57, r: 33 };

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="10 0 154 106"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d={MARK_PATH_ARC} stroke="#2454E5" strokeWidth="21" strokeLinecap="round" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="#2454E5"
        d={`M ${OUTER.cx} ${OUTER.cy - OUTER.r}
            a ${OUTER.r} ${OUTER.r} 0 1 0 0 ${OUTER.r * 2}
            a ${OUTER.r} ${OUTER.r} 0 1 0 0 -${OUTER.r * 2} Z
            M ${CUTOUT.cx} ${CUTOUT.cy - CUTOUT.r}
            a ${CUTOUT.r} ${CUTOUT.r} 0 1 0 0 ${CUTOUT.r * 2}
            a ${CUTOUT.r} ${CUTOUT.r} 0 1 0 0 -${CUTOUT.r * 2} Z`}
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  variant?: "mark" | "tile";
}

/**
 * The Yaqiz / يقظ brand mark: a blue brow-arc over a blue crescent, forming a
 * stylized watchful eye. Geometry and colors are fixed brand assets — do not
 * restyle. `variant="tile"` renders it on its gold square backdrop (favicons,
 * empty states, loading screens); the default renders the mark alone so it
 * can sit on any surface (sidebar, header, auth cards).
 */
export function Logo({ className, variant = "mark" }: LogoProps) {
  if (variant === "tile") {
    // The mark is sized as a percentage of the tile itself (not padding, which CSS
    // resolves against the *parent's* width — that made this collapse whenever a
    // flex ancestor stretched or shrank the tile's container, e.g. a flex-col panel
    // with default align-items: stretch).
    return (
      <div className={cn("flex aspect-square items-center justify-center rounded-2xl bg-[#F5A623]", className)}>
        <LogoMark className="h-[64%] w-[64%]" />
      </div>
    );
  }

  return <LogoMark className={cn("h-8 w-auto", className)} />;
}
