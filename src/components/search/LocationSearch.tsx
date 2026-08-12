import { useEffect, useId, useRef, useState } from "react";
import { geocodeQuery } from "../../api/googleGeocode";
import { useLocationSearch } from "../../hooks/useLocationSearch";
import type { PlaceResult } from "../../lib/types";

export default function LocationSearch({
  label,
  value,
  onChange,
  onResolved,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onResolved: (place: PlaceResult) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const { suggestions, loading, pick } = useLocationSearch(typing ? value : "");

  const showList = open && typing && (loading || suggestions.length > 0);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setTyping(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function commitText() {
    const q = value.trim();
    if (q.length < 2) return;
    const hit = suggestions[0]
      ? await pick(suggestions[0])
      : await geocodeQuery(q);
    if (!hit) return;
    onChange(hit.label);
    onResolved(hit);
    setOpen(false);
    setTyping(false);
  }

  return (
    <div className="field" ref={rootRef}>
      <label htmlFor={listId}>{label}</label>
      <input
        id={listId}
        type="text"
        value={value}
        placeholder="Any Melbourne place or address"
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setTyping(true);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          if (!value.trim()) setTyping(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setTyping(false);
          }
          if (e.key === "Enter") {
            e.preventDefault();
            void commitText();
          }
        }}
      />
      {showList && (
        <ul className="suggest-list" role="listbox">
          {loading && <li className="suggest-muted">Searching Melbourne…</li>}
          {suggestions.map((s) => (
            <li key={`${s.label}-${s.placeId ?? `${s.point.lat},${s.point.lng}`}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={async () => {
                  const resolved = await pick(s);
                  onChange(resolved.label);
                  onResolved(resolved);
                  setOpen(false);
                  setTyping(false);
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
