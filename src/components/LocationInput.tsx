import { cbdLocations } from "../lib/cbdLocations";
import type { AddressField } from "../lib/useAddressField";

function LocationInput({
  id,
  label,
  placeholder,
  field,
  isMenuOpen,
  onOpenMenu,
  onCloseMenu,
  onFocus,
}: {
  id: "origin" | "destination";
  label: string;
  placeholder: string;
  field: AddressField;
  isMenuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onFocus: () => void;
}) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <div className="location-field">
        <input
          id={id}
          name={id}
          onBlur={() => {
            void field.validate();
          }}
          onClick={onOpenMenu}
          placeholder={placeholder}
          type="text"
          value={field.value}
          onChange={(event) => {
            field.setValue(event.target.value);
            onOpenMenu();
          }}
          onFocus={onFocus}
        />
        {isMenuOpen && (
          <div className="location-menu">
            {cbdLocations.map((location) => (
              <button
                key={location.name}
                onMouseDown={(event) => {
                  event.preventDefault();
                  field.choose(location.name, { lat: location.lat, lng: location.lng });
                  onCloseMenu();
                }}
                type="button"
              >
                {location.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {field.status !== "idle" && (
        <p className={`address-note address-note-${field.status}`}>{field.message}</p>
      )}
    </div>
  );
}

export default LocationInput;
