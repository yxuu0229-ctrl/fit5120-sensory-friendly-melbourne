import { Polyline } from "react-leaflet";

export type RouteStyle = "muted" | "selected" | "navigating" | "alt";

const STYLES: Record<
  RouteStyle,
  { color: string; weight: number; opacity: number; dashArray?: string }
> = {
  muted: { color: "#8a969c", weight: 4, opacity: 0.4, dashArray: "6 10" },
  alt: { color: "#5b7c8a", weight: 5, opacity: 0.55 },
  selected: { color: "#1f7a6a", weight: 7, opacity: 0.95 },
  navigating: { color: "#0d5c4f", weight: 8, opacity: 1 },
};

export default function RouteLayer({
  path,
  style = "muted",
}: {
  path: [number, number][];
  style?: RouteStyle;
}) {
  if (path.length < 2) return null;
  const opts = STYLES[style];
  return (
    <Polyline
      positions={path}
      pathOptions={{
        color: opts.color,
        weight: opts.weight,
        opacity: opts.opacity,
        dashArray: opts.dashArray,
        lineCap: "round",
        lineJoin: "round",
      }}
    />
  );
}
