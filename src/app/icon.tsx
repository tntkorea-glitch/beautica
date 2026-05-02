import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const ROSE_500 = "#b76e79";
const CREAM_50 = "#faf6f1";

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${CREAM_50}"/><g transform="translate(16,16)" fill="${ROSE_500}"><ellipse cx="0" cy="-8" rx="4" ry="7" opacity="0.9"/><ellipse cx="8" cy="0" rx="7" ry="4" opacity="0.9"/><ellipse cx="0" cy="8" rx="4" ry="7" opacity="0.9"/><ellipse cx="-8" cy="0" rx="7" ry="4" opacity="0.9"/><circle cx="0" cy="0" r="3.5" fill="${CREAM_50}"/></g></svg>`;

export default async function Icon() {
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} width={64} height={64} alt="" />
      </div>
    ),
    { ...size },
  );
}
