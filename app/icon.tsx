import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f9ff",
          color: "#213547",
          fontSize: 164,
          fontWeight: 900,
          letterSpacing: 0
        }}
      >
        $
      </div>
    ),
    { ...size }
  );
}
