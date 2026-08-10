import { SearchIcon, SettingsIcon } from "../Icons";
import type { HomeMapMode, LocationPoint } from "./shared";

interface SearchHeaderProps {
  activeMode: HomeMapMode;
  searchQuery: string;
  originQuery: string;
  destinationQuery: string;
  showSuggestions: boolean;
  suggestions: LocationPoint[];
  onToggleThresholds: () => void;
  onSearchQueryChange: (value: string) => void;
  onOriginQueryChange: (value: string) => void;
  onDestinationQueryChange: (value: string) => void;
  onFocusInput: (field: "search" | "origin" | "destination") => void;
  onClearSearch: () => void;
  onClearOrigin: () => void;
  onClearDestination: () => void;
  onSelectSuggestion: (item: LocationPoint) => void;
}

// Small start/end pin glyph used beside the Navigate mode inputs
function RoutePinGlyph({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={stroke} strokeWidth="2.5" style={{ marginRight: 6, flexShrink: 0 }}>
      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill={fill} />
      <circle cx="12" cy="10" r="3" fill={stroke} />
    </svg>
  );
}

export default function SearchHeader({
  activeMode,
  searchQuery,
  originQuery,
  destinationQuery,
  showSuggestions,
  suggestions,
  onToggleThresholds,
  onSearchQueryChange,
  onOriginQueryChange,
  onDestinationQueryChange,
  onFocusInput,
  onClearSearch,
  onClearOrigin,
  onClearDestination,
  onSelectSuggestion,
}: SearchHeaderProps) {
  return (
    <div className="search-header-overlay">
      {activeMode === "heat" ? (
        <div className="thresholds-header-pill" onClick={onToggleThresholds}>
          <div className="thresholds-title-container">
            <SettingsIcon size={18} fill="#111111" />
            <span className="thresholds-title-text">Thresholds</span>
          </div>
        </div>
      ) : activeMode === "navigate" ? (
        <div className="navigate-stacked-inputs">
          {/* From Input */}
          <div className="search-input-wrapper input-row">
            <RoutePinGlyph stroke="#10B981" fill="#D1FAE5" />
            <span className="input-field-label start-label">Start</span>
            <input
              type="text"
              className="search-destination-input"
              placeholder="Choose start point..."
              value={originQuery}
              onChange={(e) => onOriginQueryChange(e.target.value)}
              onFocus={() => onFocusInput("origin")}
            />
            {originQuery && (
              <button className="clear-search-btn" onClick={onClearOrigin}>
                &times;
              </button>
            )}
          </div>

          {/* To Input */}
          <div className="search-input-wrapper input-row">
            <RoutePinGlyph stroke="#EF4444" fill="#FEE2E2" />
            <span className="input-field-label end-label">End</span>
            <input
              type="text"
              className="search-destination-input"
              placeholder="Choose destination..."
              value={destinationQuery}
              onChange={(e) => onDestinationQueryChange(e.target.value)}
              onFocus={() => onFocusInput("destination")}
            />
            {destinationQuery && (
              <button className="clear-search-btn" onClick={onClearDestination}>
                &times;
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="search-input-wrapper">
          <div className="search-icon-btn">
            <SearchIcon size={18} fill="#777777" />
          </div>
          <input
            type="text"
            className="search-destination-input"
            placeholder="Search Destination"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onFocus={() => onFocusInput("search")}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={onClearSearch}>
              &times;
            </button>
          )}
        </div>
      )}
      <div className="avatar-wrapper">
        <img
          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"
          alt="Profile Avatar"
          className="user-profile-avatar"
        />
      </div>

      {/* Suggestion Dropdown */}
      {activeMode !== "heat" && showSuggestions && suggestions.length > 0 && (
        <ul className={`search-suggestions-dropdown ${activeMode === "navigate" ? "navigate-mode" : ""}`}>
          {suggestions.map((item, idx) => (
            <li
              key={idx}
              className="suggestion-item"
              onClick={() => onSelectSuggestion(item)}
            >
              <div className="suggestion-icon-pin">📍</div>
              <div className="suggestion-name">{item.name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
