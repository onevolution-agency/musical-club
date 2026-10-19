import { brushStarPath } from "./star-path";

export function Logo({ size = "md", href = "/" }: { size?: "sm" | "md"; href?: string }) {
  return (
    <a className={`logo logo-${size}`} href={href} aria-label="Musical Club">
      <span className="logo-word">
        <span>musical</span>
        <span>club</span>
      </span>
      <svg className="logo-star" viewBox="0 0 100 100" aria-hidden="true">
        <path fill="currentColor" d={brushStarPath} />
      </svg>
    </a>
  );
}

export function StarRow() {
  return (
    <p className="mark-stars" aria-hidden="true">
      ★ ★ ★
    </p>
  );
}
