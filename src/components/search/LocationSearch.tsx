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
  const inputId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { suggestions, loading, pick } = useLocationSearch(typing ? value : "");

  const showList = open && typing && (loading || suggestions.length > 0);

  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setTyping(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function handleSelect(index: number) {
    const s = suggestions[index];
    if (!s) {
      await commitText();
      return;
    }
    const resolved = await pick(s);
    onChange(resolved.label);
    onResolved(resolved);
    setOpen(false);
    setTyping(false);
    setActiveIndex(-1);
  }

  async function commitText() {
    const q = value.trim();
    if (q.length < 2) return;
    const target = activeIndex >= 0 && suggestions[activeIndex] ? suggestions[activeIndex] : suggestions[0];
    const hit = target ? await pick(target) : await geocodeQuery(q);
    if (!hit) return;
    onChange(hit.label);
    onResolved(hit);
    setOpen(false);
    setTyping(false);
    setActiveIndex(-1);
  }

  return (
    <div className="field" ref={rootRef}>
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder="Any Melbourne place or address"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        aria-controls={showList ? listboxId : undefined}
        aria-activedescendant={
          showList && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
        }
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
            setActiveIndex(-1);
          } else if (e.key === "ArrowDown") {
            if (!showList) {
              setOpen(true);
              setTyping(true);
              return;
            }
            e.preventDefault();
            setActiveIndex((prev) =>
              prev < suggestions.length - 1 ? prev + 1 : 0
            );
          } else if (e.key === "ArrowUp") {
            if (!showList) return;
            e.preventDefault();
            setActiveIndex((prev) =>
              prev > 0 ? prev - 1 : suggestions.length - 1
            );
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex >= 0) {
              void handleSelect(activeIndex);
            } else {
              void commitText();
            }
          }
        }}
      />
      {showList && (
        <ul id={listboxId} className="suggest-list" role="listbox" aria-label={`${label} suggestions`}>
          {loading && <li className="suggest-muted" role="option" aria-selected="false">Searching Melbourne…</li>}
          {suggestions.map((s, idx) => {
            const isHighlighted = idx === activeIndex;
            return (
              <li
                id={`${listboxId}-opt-${idx}`}
                key={`${s.label}-${s.placeId ?? `${s.point.lat},${s.point.lng}`}`}
                role="option"
                aria-selected={isHighlighted}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className={isHighlighted ? "is-active" : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void handleSelect(idx)}
                >
                  {s.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

