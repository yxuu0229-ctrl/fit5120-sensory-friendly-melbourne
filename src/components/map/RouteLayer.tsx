import { Polyline, Tooltip } from "react-leaflet";
import type { RouteSegment } from "../../lib/types";

export type RouteStyle = "muted" | "selected" | "navigating" | "alt" | "calm";

const WEIGHT: Record<RouteStyle, { weight: number; opacity: number }> = {
  muted: { weight: 5, opacity: 0.4 },
  alt: { weight: 6, opacity: 0.6 },
  selected: { weight: 8, opacity: 0.98 },
  calm: { weight: 9, opacity: 1 },
  navigating: { weight: 9, opacity: 1 },
};

const FALLBACK = {
  muted: "#8a969c",
  alt: "#5b7c8a",
  selected: "#1f7a6a",
  calm: "#17685c",
  navigating: "#0d5c4f",
};

function dashForMode(mode: string): string | undefined {
  if (mode === "walk") return "10 12";
  if (mode === "cycle") return "16 8";
  if (mode === "drive") return undefined;
  if (mode === "tram") return undefined;
  if (mode === "train") return "18 6";
  if (mode === "bus") return "6 8";
  if (mode === "transit") return "4 8";
  return undefined;
}

function weightForMode(mode: string, base: number): number {
  if (mode === "walk") return Math.max(4, base - 1.5);
  if (mode === "tram" || mode === "train") return base + 1.5;
  if (mode === "bus") return base + 1;
  if (mode === "drive") return base + 1.5;
  if (mode === "cycle") return base + 0.5;
  return base;
}

function segmentColor(seg: RouteSegment, style: RouteStyle): string {
  if (style === "muted") return seg.color || FALLBACK.muted;
  if (style === "calm") return "#1f7a6a";
  return seg.color || FALLBACK[style];
}

export default function RouteLayer({
  path,
  segments,
  style = "muted",
  showLabels = false,
  calm = false,
}: {
  path: [number, number][];
  segments?: RouteSegment[];
  style?: RouteStyle;
  showLabels?: boolean;
  calm?: boolean;
}) {
  const resolved: RouteStyle =
    calm && (style === "selected" || style === "navigating") ? "calm" : style;
  const opts = WEIGHT[resolved];

  const glow =
    calm && path.length >= 2 ? (
      <Polyline
        positions={path}
        pathOptions={{
          color: "#7eb8ab",
          weight: opts.weight + 10,
          opacity: 0.32,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
    ) : null;

  if (segments && segments.length > 0) {
    return (
      <>
        {glow}
        {segments.map((seg, i) =>
          seg.positions.length < 2 ? null : (
            <Polyline
              key={`${seg.mode}-${i}-${seg.positions[0]?.join(",")}-${seg.positions.length}`}
              positions={seg.positions}
              pathOptions={{
                color: segmentColor(seg, resolved),
                weight: weightForMode(seg.mode, opts.weight),
                opacity:
                  resolved === "muted"
                    ? seg.mode === "walk"
                      ? 0.4
                      : 0.55
                    : opts.opacity,
                dashArray: dashForMode(seg.mode),
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              {showLabels && seg.label && seg.positions.length > 4 ? (
                <Tooltip sticky opacity={0.95}>
                  {seg.label}
                </Tooltip>
              ) : null}
            </Polyline>
          )
        )}
      </>
    );
  }

  if (path.length < 2) return null;
  return (
    <>
      {glow}
      <Polyline
        positions={path}
        pathOptions={{
          color: FALLBACK[resolved],
          weight: opts.weight,
          opacity: opts.opacity,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
    </>
  );
}
