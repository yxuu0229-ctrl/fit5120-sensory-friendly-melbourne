import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cbdLocations } from "../lib/cbdLocations";
import { inCbd } from "../lib/densityBands";
import { filterPlacesAlongRoute } from "../lib/geo";
import { planRoute } from "../lib/planRoute";
import type { PlannedTrip } from "../lib/planTypes";
import type { Page } from "./TopNav";
import { SearchIcon, SettingsIcon } from "./Icons";
import { carltonSuggestions } from "./homeMap/fallbackData";
import HeatSensorMarkers from "./homeMap/HeatSensorMarkers";
import MapController from "./homeMap/MapController";
import ModeSwitcher from "./homeMap/ModeSwitcher";
import NavigateRoutesLayer from "./homeMap/NavigateRoutesLayer";
import QuietSpaceMarkers from "./homeMap/QuietSpaceMarkers";
import RouteReadyCard from "./homeMap/RouteReadyCard";
import SingleRouteLayer from "./homeMap/SingleRouteLayer";
import SuggestedRoutesCard from "./homeMap/SuggestedRoutesCard";
import ThresholdsCard, { type ThresholdField } from "./homeMap/ThresholdsCard";
import UserLocationMarker from "./homeMap/UserLocationMarker";
import {
  CARLTON,
  CARLTON_COORDS,
  sensorSoundLevel,
  type HomeMapMode,
  type LocationPoint,
  type RankedTrip,
} from "./homeMap/shared";
import { useHomeMapData } from "./homeMap/useHomeMapData";

interface HomeMapProps {
  onNavigatePage: (page: Page) => void;
}

export default function HomeMap({ onNavigatePage }: HomeMapProps) {
  const [activeMode, setActiveMode] = useState<HomeMapMode>("chill");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(CARLTON);
  const [mapCenter, setMapCenter] = useState<[number, number]>(CARLTON_COORDS);
  const [zoomLevel, setZoomLevel] = useState(16);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [destination, setDestination] = useState<LocationPoint | null>(null);

  // Stacked search state for Navigate mode
  const [origin, setOrigin] = useState<LocationPoint | null>(null);
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [focusedInput, setFocusedInput] = useState<"origin" | "destination" | null>(null);

  // Planned routes state for Navigate mode
  const [plannedTrips, setPlannedTrips] = useState<PlannedTrip[]>([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(0);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Threshold settings state
  const [soundThreshold, setSoundThreshold] = useState(35);
  const [crowdThreshold, setCrowdThreshold] = useState(30);
  const [showThresholdCard, setShowThresholdCard] = useState(true);
  const [editingField, setEditingField] = useState<ThresholdField>("none");

  // Automatically show threshold card when entering heat mode
  useEffect(() => {
    if (activeMode === "heat") {
      setShowThresholdCard(true);
    } else {
      setShowThresholdCard(false);
      setEditingField("none");
    }
  }, [activeMode]);

  // Click outside thresholds card to stop editing
  useEffect(() => {
    if (editingField === "none") return;
    function handleGlobalClick(e: MouseEvent) {
      if (e.target instanceof Element && !e.target.closest(".thresholds-card-overlay")) {
        setEditingField("none");
      }
    }
    document.addEventListener("mousedown", handleGlobalClick);
    return () => document.removeEventListener("mousedown", handleGlobalClick);
  }, [editingField]);

  // Data states
  const { quietSpaces, sensors } = useHomeMapData();
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeDetails, setRouteDetails] = useState<{ distance: string; duration: string } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Load user location and center appropriately
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (inCbd(latitude, longitude)) {
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter([latitude, longitude]);
        } else {
          // If outside CBD, default to Carlton as requested
          setUserLocation(CARLTON);
          setMapCenter(CARLTON_COORDS);
        }
      },
      () => {
        // Fallback to Carlton on permission error or refusal
        setUserLocation(CARLTON);
        setMapCenter(CARLTON_COORDS);
      }
    );
  }, []);

  // Close search suggestions when clicking outside
  useEffect(() => {
    function handleDocumentClick(e: MouseEvent) {
      if (e.target instanceof Element && !e.target.closest(".search-header-overlay")) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  // Filter search suggestions
  const suggestions = useMemo(() => {
    // Combine standard suggestions and mock spaces
    const combinedSuggestions: LocationPoint[] = [
      ...cbdLocations.map(l => ({ name: l.name, lat: l.lat, lng: l.lng })),
      ...carltonSuggestions,
    ];

    const currentQuery = activeMode === "navigate"
      ? (focusedInput === "origin" ? originQuery : destinationQuery)
      : searchQuery;

    if (!currentQuery.trim()) return combinedSuggestions;
    const query = currentQuery.toLowerCase();

    return combinedSuggestions.filter(item =>
      item.name.toLowerCase().includes(query)
    );
  }, [searchQuery, originQuery, destinationQuery, activeMode, focusedInput]);

  // Helper to calculate the warnings along a given route path by combining sound and crowd levels
  const getRouteWarnings = (path: [number, number][]) => {
    if (!path || path.length === 0) return 0;

    // Find all sensors along the route within 150m
    const nearbySensors = filterPlacesAlongRoute(sensors, path, 150);

    let warnings = 0;
    nearbySensors.forEach(sensor => {
      // Calculate simulated sound level based on pedestrian counts
      const sensorSound = sensorSoundLevel(sensor.total_count);

      // Check if sound exceeds user threshold
      if (sensorSound >= soundThreshold) {
        warnings += 1;
      }
      // Check if crowd count exceeds user threshold
      if (sensor.total_count >= crowdThreshold) {
        warnings += 1;
      }
    });

    return warnings;
  };

  // Rank trips by sensory threshold warning counts (lowest first)
  const rankedTrips = useMemo<RankedTrip[]>(() => {
    if (!plannedTrips || plannedTrips.length === 0) return [];

    const tripsWithWarnings = plannedTrips.map(trip => {
      const warnings = getRouteWarnings(trip.allPositions);
      return {
        ...trip,
        warnings,
      };
    });

    return tripsWithWarnings.sort((a, b) => a.warnings - b.warnings);
  }, [plannedTrips, sensors, soundThreshold, crowdThreshold]);

  // Filter quiet spaces along active route (if active), otherwise show all
  const activeQuietSpaces = useMemo(() => {
    if (activeMode === "navigate" && rankedTrips[selectedRouteIdx]) {
      return filterPlacesAlongRoute(quietSpaces, rankedTrips[selectedRouteIdx].allPositions, 300);
    }
    if (routePath.length > 0) {
      return filterPlacesAlongRoute(quietSpaces, routePath, 300);
    }
    return quietSpaces;
  }, [quietSpaces, routePath, rankedTrips, selectedRouteIdx, activeMode]);

  // Filter sensors along active route (if active), otherwise show all
  const activeSensors = useMemo(() => {
    if (activeMode === "navigate" && rankedTrips[selectedRouteIdx]) {
      return filterPlacesAlongRoute(sensors, rankedTrips[selectedRouteIdx].allPositions, 300);
    }
    if (routePath.length > 0) {
      return filterPlacesAlongRoute(sensors, routePath, 300);
    }
    return sensors;
  }, [sensors, routePath, rankedTrips, selectedRouteIdx, activeMode]);

  // Filter sensors for Heat Zones mode based on sound & crowd thresholds
  const filteredHeatSensors = useMemo(() => {
    return activeSensors.filter((sensor) => {
      const sensorSound = sensorSoundLevel(sensor.total_count);
      return sensorSound >= soundThreshold || sensor.total_count >= crowdThreshold;
    });
  }, [activeSensors, soundThreshold, crowdThreshold]);

  // Plan route when destination changes (for non-navigate modes)
  useEffect(() => {
    if (activeMode === "navigate") return;
    if (!destination) {
      setRoutePath([]);
      setRouteDetails(null);
      return;
    }

    const planWalkRoute = async () => {
      setLoadingRoute(true);
      try {
        const res = await planRoute(userLocation, { lat: destination.lat, lng: destination.lng }, "walk");
        if (res.trip) {
          setRoutePath(res.trip.allPositions);
          const distanceKm = (res.trip.distanceMeters / 1000).toFixed(2);
          const durationMins = Math.round(res.trip.durationSeconds / 60);
          setRouteDetails({
            distance: `${distanceKm} km`,
            duration: `${durationMins} min`,
          });
        }
      } catch (err) {
        console.error("Failed to plan route", err);
      } finally {
        setLoadingRoute(false);
      }
    };

    planWalkRoute();
  }, [destination, userLocation, activeMode]);

  // Plan routes in Navigate mode when origin or destination changes
  useEffect(() => {
    if (activeMode !== "navigate") return;
    if (!origin || !destination) {
      setPlannedTrips([]);
      setSelectedRouteIdx(0);
      return;
    }

    const planNavigateRoutes = async () => {
      setLoadingRoutes(true);
      try {
        const res = await planRoute(
          { lat: origin.lat, lng: origin.lng },
          { lat: destination.lat, lng: destination.lng },
          "walk"
        );
        if (res.trips && res.trips.length > 0) {
          setPlannedTrips(res.trips);
          setSelectedRouteIdx(0);
        } else if (res.trip) {
          setPlannedTrips([res.trip]);
          setSelectedRouteIdx(0);
        } else {
          setPlannedTrips([]);
        }
      } catch (err) {
        console.error("Failed to plan navigate routes", err);
        setPlannedTrips([]);
      } finally {
        setLoadingRoutes(false);
      }
    };

    planNavigateRoutes();
  }, [origin, destination, activeMode]);

  // Once routes are planned, pan so the start point sits centered in the
  // visible map area below the suggested routes card
  useEffect(() => {
    if (activeMode !== "navigate" || !origin || rankedTrips.length === 0) return;

    const wrapper = document.querySelector(".home-mockup-wrapper");
    const card = document.querySelector(".routes-list-card-overlay");
    if (!wrapper || !card) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const cardBottom = card.getBoundingClientRect().bottom - wrapperRect.top;
    // Screen y where the start point should land: midpoint of the free space below the card
    const targetY = (cardBottom + wrapperRect.height) / 2;
    const offsetY = targetY - wrapperRect.height / 2;

    const originPoint = L.CRS.EPSG3857.latLngToPoint(L.latLng(origin.lat, origin.lng), zoomLevel);
    const shiftedCenter = L.CRS.EPSG3857.pointToLatLng(
      L.point(originPoint.x, originPoint.y - offsetY),
      zoomLevel
    );
    setMapCenter([shiftedCenter.lat, shiftedCenter.lng]);
  }, [activeMode, origin, rankedTrips.length, zoomLevel]);

  const handleSelectSuggestion = (item: { name: string; lat: number; lng: number }) => {
    if (activeMode === "navigate") {
      if (focusedInput === "origin") {
        setOrigin(item);
        setOriginQuery(item.name);
      } else {
        setDestination(item);
        setDestinationQuery(item.name);
      }
      setShowSuggestions(false);
      setMapCenter([item.lat, item.lng]);
    } else {
      setDestination(item);
      setSearchQuery(item.name);
      setShowSuggestions(false);
      setMapCenter([item.lat, item.lng]);
    }
  };

  const handleClearRoute = () => {
    setDestination(null);
    setSearchQuery("");
    setRoutePath([]);
    setRouteDetails(null);
  };

  const handleClearOrigin = () => {
    setOrigin(null);
    setOriginQuery("");
    setPlannedTrips([]);
  };

  const handleClearDestination = () => {
    setDestination(null);
    setDestinationQuery("");
    setPlannedTrips([]);
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(true);
  };

  const handleOriginQueryChange = (value: string) => {
    setOriginQuery(value);
    setFocusedInput("origin");
    setShowSuggestions(true);
  };

  const handleDestinationQueryChange = (value: string) => {
    setDestinationQuery(value);
    setFocusedInput("destination");
    setShowSuggestions(true);
  };

  const handleFocusInput = (field: "search" | "origin" | "destination") => {
    if (field !== "search") {
      setFocusedInput(field);
    }
    setShowSuggestions(true);
  };

  const handleSelectMode = (mode: HomeMapMode) => {
    setActiveMode(mode);
    if (mode === "chill") {
      if (destination) {
        setMapCenter([destination.lat, destination.lng]);
      } else {
        setMapCenter(CARLTON_COORDS);
      }
    }
  };

  // Open the planned walk in Google Maps (non-navigate modes)
  const handleStartWalk = () => {
    if (destination) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination.lat},${destination.lng}&travelmode=walking`;
      window.open(url, "_blank");
    }
  };

  // Open the selected suggested route in Google Maps (Navigate mode)
  const handleStartJourney = () => {
    if (origin && destination) {
      const trip = rankedTrips[selectedRouteIdx];
      const waypointsParam = trip?.via ? `&waypoints=${trip.via.lat},${trip.via.lng}` : "";
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}${waypointsParam}&travelmode=walking`;
      window.open(url, "_blank");
    }
  };

  return (
    <div className="home-mockup-wrapper">
      {/* Search Header Overlay */}
      <div className={`search-header-overlay ${activeMode === "navigate" ? "navigate-mode" : ""}`}>
        {activeMode === "heat" ? (
          <div
            className="thresholds-header-pill"
            onClick={() => setShowThresholdCard(!showThresholdCard)}
          >
            <div className="thresholds-title-container">
              <SettingsIcon size={18} fill="#111111" />
              <span className="thresholds-title-text">Thresholds</span>
            </div>
          </div>
        ) : activeMode === "navigate" ? (
          <div className="navigate-stacked-inputs">
            {/* From Input */}
            <div className="search-input-wrapper input-row">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#10B981" stroke-width="2.5" style={{ marginRight: 8, flexShrink: 0 }}>
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill="#D1FAE5" />
                <circle cx="12" cy="10" r="3" fill="#10B981" />
              </svg>
              <input
                type="text"
                className="search-destination-input"
                placeholder="Search start location..."
                value={originQuery}
                onChange={(e) => {
                  setOriginQuery(e.target.value);
                  setFocusedInput("origin");
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  setFocusedInput("origin");
                  setShowSuggestions(true);
                }}
              />
              {originQuery && (
                <button
                  className="clear-search-btn"
                  onClick={() => {
                    setOrigin(null);
                    setOriginQuery("");
                    setPlannedTrips([]);
                  }}
                >
                  &times;
                </button>
              )}
            </div>

            {/* To Input */}
            <div className="search-input-wrapper input-row">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" stroke-width="2.5" style={{ marginRight: 8, flexShrink: 0 }}>
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill="#FEE2E2" />
                <circle cx="12" cy="10" r="3" fill="#EF4444" />
              </svg>
              <input
                type="text"
                className="search-destination-input"
                placeholder="Search destination..."
                value={destinationQuery}
                onChange={(e) => {
                  setDestinationQuery(e.target.value);
                  setFocusedInput("destination");
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  setFocusedInput("destination");
                  setShowSuggestions(true);
                }}
              />
              {destinationQuery && (
                <button
                  className="clear-search-btn"
                  onClick={() => {
                    setDestination(null);
                    setDestinationQuery("");
                    setPlannedTrips([]);
                  }}
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="search-input-wrapper">
            <div className="search-icon-btn">
              <SearchIcon size={20} fill="#777777" />
            </div>
            <input
              type="text"
              className="search-destination-input"
              placeholder="Search destination..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={handleClearRoute}>
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
                onClick={() => handleSelectSuggestion(item)}
              >
                <div className="suggestion-icon-pin">📍</div>
                <div className="suggestion-name">{item.name}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Thresholds Card Overlay */}
      {activeMode === "heat" && showThresholdCard && (
        <ThresholdsCard
          soundThreshold={soundThreshold}
          crowdThreshold={crowdThreshold}
          editingField={editingField}
          onEditField={setEditingField}
          onSoundThresholdChange={setSoundThreshold}
          onCrowdThresholdChange={setCrowdThreshold}
        />
      )}

      {/* Navigation Route Card */}
      {activeMode !== "navigate" && routeDetails && (
        <RouteReadyCard routeDetails={routeDetails} onStart={handleStartWalk} />
      )}

      {/* Navigate Mode Routes List Card Overlay */}
      {activeMode === "navigate" && rankedTrips.length > 0 && (
        <SuggestedRoutesCard
          trips={rankedTrips}
          selectedIdx={selectedRouteIdx}
          onSelectRoute={setSelectedRouteIdx}
          onStartJourney={handleStartJourney}
        />
      )}

      {/* Leaflet Map */}
      <div className="fullscreen-home-map">
        <MapContainer
          center={mapCenter}
          zoom={zoomLevel}
          scrollWheelZoom={true}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          <MapController center={mapCenter} />

          {/* User Location Marker with Glowing Pulse Halo */}
          <UserLocationMarker location={userLocation} />

          {/* MODE 1: Chill Mode Quiet Places Highlights */}
          {activeMode === "chill" && <QuietSpaceMarkers spaces={activeQuietSpaces} />}

          {/* MODE 2: Heat Zone Pedestrian Sensors */}
          {activeMode === "heat" && (
            <HeatSensorMarkers
              sensors={filteredHeatSensors}
              soundThreshold={soundThreshold}
              crowdThreshold={crowdThreshold}
            />
          )}

          {/* Render Route Polyline & Destination/Origin in Navigate Mode */}
          {activeMode === "navigate" ? (
            <NavigateRoutesLayer
              origin={origin}
              destination={destination}
              trips={rankedTrips}
              selectedIdx={selectedRouteIdx}
              onSelectRoute={setSelectedRouteIdx}
              quietSpaces={activeQuietSpaces}
              sensors={activeSensors}
            />
          ) : (
            // Non-navigate modes (single route rendering)
            <SingleRouteLayer
              destination={destination}
              routePath={routePath}
              showQuietSpaces={activeMode !== "chill"}
              showSensors={activeMode !== "heat"}
              quietSpaces={activeQuietSpaces}
              sensors={activeSensors}
            />
          )}
        </MapContainer>
      </div>

      {/* Liquid Glass Bottom Switcher */}
      <ModeSwitcher activeMode={activeMode} onSelectMode={handleSelectMode} />
    </div>
  );
}
