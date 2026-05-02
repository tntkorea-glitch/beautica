import { ImageResponse } from "next/og";

export const alt = "beautica — 뷰티샵 운영 + 자재 쇼핑몰";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const ROSE_500 = "#b76e79";
const ROSE_700 = "#7d4254";
const CREAM_50 = "#faf6f1";
const CREAM_100 = "#f5ede0";

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 32 32"><g transform="translate(16,16)" fill="${ROSE_500}"><ellipse cx="0" cy="-8" rx="4" ry="7" opacity="0.9"/><ellipse cx="8" cy="0" rx="7" ry="4" opacity="0.9"/><ellipse cx="0" cy="8" rx="4" ry="7" opacity="0.9"/><ellipse cx="-8" cy="0" rx="7" ry="4" opacity="0.9"/><circle cx="0" cy="0" r="3.5" fill="${CREAM_50}"/></g></svg>`;

export default async function Image() {
  const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${CREAM_50} 0%, ${CREAM_100} 100%)`,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUrl} width={240} height={240} alt="" />
        <div
          style={{
            fontSize: 144,
            fontWeight: 600,
            color: ROSE_700,
            letterSpacing: "-0.04em",
            marginTop: 24,
            lineHeight: 1,
          }}
        >
          beautica
        </div>
        <div
          style={{
            fontSize: 36,
            color: ROSE_700,
            opacity: 0.6,
            marginTop: 28,
            fontWeight: 400,
            letterSpacing: "0.05em",
          }}
        >
          beautica.co.kr
        </div>
      </div>
    ),
    { ...size },
  );
}
