/**
 * beautica 워드마크 (임시 SVG).
 * 진짜 로고 이미지가 생기면 public/logo.svg + <Image> 로 교체.
 */
export function Logo({
  size = "md",
  withMark = true,
}: {
  size?: "sm" | "md" | "lg";
  withMark?: boolean;
}) {
  const wordSize =
    size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-base";
  const markPx = size === "lg" ? 32 : size === "md" ? 22 : 18;

  return (
    <span className="inline-flex items-baseline gap-1.5">
      {withMark && (
        <svg
          width={markPx}
          height={markPx}
          viewBox="0 0 32 32"
          aria-hidden="true"
          className="self-center"
        >
          {/* 꽃잎 4개 — 뷰티샵 모티프 */}
          <g transform="translate(16,16)" fill="var(--rose-gold-500)">
            <ellipse cx="0" cy="-8" rx="4" ry="7" opacity="0.9" />
            <ellipse cx="8" cy="0" rx="7" ry="4" opacity="0.9" />
            <ellipse cx="0" cy="8" rx="4" ry="7" opacity="0.9" />
            <ellipse cx="-8" cy="0" rx="7" ry="4" opacity="0.9" />
            <circle cx="0" cy="0" r="3.5" fill="var(--cream-50)" />
          </g>
        </svg>
      )}
      <span
        className={`${wordSize} font-semibold tracking-tight`}
        style={{ color: "var(--rose-gold-700)" }}
      >
        beautica
      </span>
    </span>
  );
}
