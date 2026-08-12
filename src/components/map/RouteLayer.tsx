import { Polyline } from "react-leaflet";
import type { RouteSegment } from "../../lib/types";

export type RouteStyle = "muted" | "selected" | "navigating" | "alt";

const WEIGHT: Record<RouteStyle, { weight: number; opacity: number; dashArray?: string }> = {
  muted: { weight: 4, opacity: 0.35, dashArray: "6 10" },
  alt: { weight: 5, opacity: 0.55 },
  selected: { weight: 7, opacity: 0.95 },
  navigating: { weight: 8, opacity: 1 },
};

const FALLBACK = {
  muted: "#8a969c",
  alt: "#5b7c8a",
  selected: "#1f7a6a",
  navigating: "#0d5c4f",
};

export default function RouteLayer({
  path,
  segments,
  style = "muted",
}: {
  path: [number, number][];
  /** When set, draws each mode in its own colour. */
  segments?: RouteSegment[];
  style?: RouteStyle;
}) {
  const opts = WEIGHT[style];
  const solid = style === "selected" || style === "navigating";

  if (segments && segments.length > 0) {
    return (
      <>
        {segments.map((seg, i) =>
          seg.positions.length < 2 ? null : (
            <Polyline
              key={`${seg.mode}-${i}-${seg.positions[0]?.join(",")}`}
              positions={seg.positions}
              pathOptions={{
                color: style === "muted" ? FALLBACK.muted : seg.color,
                weight: opts.weight,
                opacity: opts.opacity,
                dashArray:
                  seg.mode === "walk" && solid
                    ? "8 10"
                    : opts.dashArray,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          )
        )}
      </>
    );
  }

  if (path.length < 2) return null;
  return (
    <Polyline
      positions={path}
      pathOptions={{
        color: FALLBACK[style],
        weight: opts.weight,
        opacity: opts.opacity,
        dashArray: opts.dashArray,
        lineCap: "round",
        lineJoin: "round",
      }}
    />
  );
}
