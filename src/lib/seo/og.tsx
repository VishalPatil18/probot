import { ImageResponse } from "next/og";

import { SITE_DESCRIPTION } from "./site";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";
export const OG_ALT = "ProBot - AI assistant for job seekers";

export function renderOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0b1220 0%, #0070dd 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 9999,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 9999,
                  background: "#0070dd",
                }}
              />
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 9999,
                  background: "#0070dd",
                  opacity: 0.6,
                }}
              />
            </div>
          </div>
          <div style={{ fontSize: 56, fontWeight: 800 }}>ProBot</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>
          Your AI assistant for job seekers
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            lineHeight: 1.4,
            color: "rgba(255,255,255,0.85)",
            maxWidth: 900,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
