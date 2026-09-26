import { ImageResponse } from "next/og";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#f5f5f7",
        color: "#0066cc",
        fontSize: 27,
        fontFamily: "sans-serif",
        fontWeight: 600,
        borderRadius: 8,
      }}
    >
      R
    </div>,
    { ...size },
  );
}
