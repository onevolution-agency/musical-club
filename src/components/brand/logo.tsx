import Image from "next/image";

const WORDMARK = { src: "/brand/logo.png", width: 1826, height: 811 } as const;

const frame = {
  sm: { sizes: "140px" },
  md: { sizes: "180px" },
  lg: { sizes: "280px" },
} as const;

export function Logo({ size = "md", href = "/" }: { size?: keyof typeof frame; href?: string }) {
  const box = frame[size];
  return (
    <a className={`logo logo-${size}`} href={href} aria-label="Musical Club">
      <Image
        src={WORDMARK.src}
        alt=""
        width={WORDMARK.width}
        height={WORDMARK.height}
        priority={size === "md"}
        sizes={box.sizes}
        style={{ width: "100%", height: "auto" }}
      />
    </a>
  );
}
