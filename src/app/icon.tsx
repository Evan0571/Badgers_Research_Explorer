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
        background: "#faf9f5",
        color: "#a9583e",
        fontSize: 27,
        fontFamily: "serif",
        borderRadius: 7,
      }}
    >
      R
    </div>,
    { ...size },
  );
}
