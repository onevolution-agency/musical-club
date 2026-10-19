import { brushStarPath } from "./star-path";

export function BrushStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path fill="currentColor" d={brushStarPath} />
    </svg>
  );
}

export function Scribble({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 18" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path
        d="M2 12 C 22 3, 34 16, 58 8 S 96 2, 128 11 S 176 17, 214 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M10 14 C 48 7, 80 16, 124 10 S 190 15, 232 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}
