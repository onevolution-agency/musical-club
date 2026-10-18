export function Logo({ size = "md", href = "/" }: { size?: "sm" | "md"; href?: string }) {
  return (
    <a className={`logo logo-${size}`} href={href} aria-label="Musical Club">
      <span className="logo-word">
        <span>musical</span>
        <span>club</span>
      </span>
      <svg className="logo-star" viewBox="0 0 100 100" aria-hidden="true">
        <polygon
          fill="#e10600"
          stroke="#0c0c0c"
          strokeWidth="6"
          points="50,6 61,36 94,36 67,56 78,88 50,68 22,88 33,56 6,36 39,36"
        />
      </svg>
    </a>
  );
}

export function StarRow() {
  return (
    <p className="gold" aria-hidden="true">
      ★ ★ ★
    </p>
  );
}
