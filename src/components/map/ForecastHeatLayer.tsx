import { Circle, Popup } from "react-leaflet";
import type { ForecastHotspot } from "../../lib/forecastHotspots";

/** Next-hour busy forecast shown as soft heat discs on the map. */
export default function ForecastHeatLayer({
  hotspots,
  enabled,
}: {
  hotspots: ForecastHotspot[];
  enabled: boolean;
}) {
  if (!enabled || !hotspots.length) return null;

  return (
    <>
      {hotspots.map((h) => {
        const high = h.level === "High";
        const color = high ? "#a33b32" : "#b07d2a";
        return (
          <Circle
            key={h.locationId ?? `${h.point.lat}-${h.point.lng}`}
            center={[h.point.lat, h.point.lng]}
            radius={high ? 160 : 120}
            pathOptions={{
              color,
              weight: 1,
              opacity: 0.35,
              fillColor: color,
              fillOpacity: high ? 0.22 : 0.14,
            }}
          >
            <Popup>
              <div className="forecast-popup">
                <p className="eyebrow">Next-hour forecast</p>
                <strong>{h.areaName}</strong>
                <p>
                  Typically {h.level.toLowerCase()} around{" "}
                  <strong>{h.periodLabel}</strong>
                  {h.expectedMean != null
                    ? ` · ~${Math.round(h.expectedMean)} people`
                    : ""}
                </p>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}
