import { labelForSegmentMode } from "../../lib/modeColors";
import type { RouteSegment } from "../../lib/types";

/** Compact colour key for multi-modal transit routes. */
export default function TransitModeKey({
  segments,
}: {
  segments?: RouteSegment[] | null;
}) {
  if (!segments?.length) return null;

  const seen = new Map<string, { mode: string; color: string; label: string }>();
  for (const seg of segments) {
    const key = `${seg.mode}-${seg.color}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      mode: seg.mode,
      color: seg.color,
      label: seg.label || labelForSegmentMode(seg.mode),
    });
  }

  if (seen.size < 2) return null;

  return (
    <div className="transit-mode-key" aria-label="Transit line colours">
      {[...seen.values()].map((item) => (
        <span key={`${item.mode}-${item.color}`} className="transit-mode-key-item">
          <span
            className={`transit-mode-swatch mode-${item.mode}`}
            style={{ background: item.color }}
            aria-hidden="true"
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
