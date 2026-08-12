import { Polygon, Popup } from "react-leaflet";
import {
  RISK_META,
  SENSORY_RISK_ZONES,
  type SensoryRiskZone,
} from "../../data/sensoryRiskZones";

export default function RiskZoneLayer({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <>
      {SENSORY_RISK_ZONES.map((zone) => (
        <RiskPolygon key={zone.id} zone={zone} />
      ))}
    </>
  );
}

function RiskPolygon({ zone }: { zone: SensoryRiskZone }) {
  const meta = RISK_META[zone.kind];
  return (
    <Polygon
      positions={zone.positions}
      pathOptions={{
        color: meta.color,
        weight: 1.2,
        opacity: 0.4,
        fillColor: meta.color,
        fillOpacity: meta.fillOpacity * 0.85,
        dashArray: "5 9",
        lineJoin: "round",
      }}
    >
      <Popup>
        <div className="risk-popup">
          <p className="eyebrow">{meta.label}</p>
          <strong>{zone.name}</strong>
          <p>{zone.blurb}</p>
        </div>
      </Popup>
    </Polygon>
  );
}
