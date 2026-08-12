import { useMemo } from "react";
import { Circle, Tooltip } from "react-leaflet";
import {
  classifyRefuge,
  isCoreRefuge,
  walkMinutesFromMeters,
  type RefugeKind,
} from "../../lib/refugeCategories";
import type { LatLng, RefugePlace } from "../../lib/types";

type ResetTarget = {
  place: RefugePlace;
  meters: number;
  minutes: number;
  kind: RefugeKind;
};

/** Soft walk-time rings to the nearest calm reset spots. */
export default function ResetRingsLayer({
  origin,
  places,
  enabled,
}: {
  origin: LatLng | null;
  places: RefugePlace[];
  enabled: boolean;
}) {
  const targets = useMemo(() => {
    if (!origin || !places.length) return [] as ResetTarget[];
    return places
      .filter((p) => isCoreRefuge(classifyRefuge(p)))
      .map((place) => {
        const meters = place.distanceMeters;
        if (meters == null) return null;
        return {
          place,
          meters,
          minutes: walkMinutesFromMeters(meters),
          kind: classifyRefuge(place),
        };
      })
      .filter((t): t is ResetTarget => t != null)
      .sort((a, b) => a.meters - b.meters)
      .slice(0, 3);
  }, [origin, places]);

  if (!enabled || !origin || !targets.length) return null;

  return (
    <>
      {targets.map((t, index) => (
        <Circle
          key={t.place.id}
          center={[origin.lat, origin.lng]}
          radius={Math.max(50, t.meters)}
          pathOptions={{
            color: index === 0 ? "#1f7a6a" : "rgba(126, 184, 171, 0.85)",
            weight: index === 0 ? 1.6 : 1,
            dashArray: index === 0 ? undefined : "5 9",
            fillColor: "#1f7a6a",
            fillOpacity: index === 0 ? 0.05 : 0.025,
            opacity: index === 0 ? 0.65 : 0.4,
          }}
        >
          <Tooltip
            direction="center"
            permanent={index === 0}
            opacity={0.98}
            className="reset-ring-tooltip"
          >
            <span className="reset-ring-label">
              Reset ~{t.minutes} min
              {index === 0 ? ` · ${t.place.name}` : ""}
            </span>
          </Tooltip>
        </Circle>
      ))}
    </>
  );
}
