import React, { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Popup,
  useMap,
  Marker,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { inCbd } from "../lib/densityBands";
import { planRoute } from "../lib/planRoute";
import { getSupabase, hasSupabaseEnv } from "../lib/supabase";
import { cbdLocations } from "../lib/cbdLocations";
import type { Place, SensorDensityCurrent } from "../lib/types";
import type { Page } from "./TopNav";
import { filterPlacesAlongRoute } from "../lib/geo";
import {
  ChillIcon,
  HeatIcon,
  NavigateIcon,
  SearchIcon,
  SoundIcon,
  CrowdIcon,
  SettingsIcon,
} from "./Icons";

// Carlton center coordinate (Pelham St & Berkeley St area, where Seven Seeds & The Spot are located)
const CARLTON = { lat: -37.8030, lng: 144.9598 };

// Map center fallback for Carlton
const CARLTON_COORDS: [number, number] = [CARLTON.lat, CARLTON.lng];

// Custom Leaflet warning icon
const warningIcon = typeof window !== "undefined" ? L.divIcon({
  html: `
    <div class="map-warning-marker">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#FF7B00" stroke-width="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#FFF2CC" />
        <line x1="12" y1="9" x2="12" y2="13" stroke="#FF7B00" stroke-width="3" stroke-linecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" stroke="#FF7B00" stroke-width="3" stroke-linecap="round" />
      </svg>
    </div>
  `,
  className: "custom-warning-div-icon",
  iconSize: [28, 28],
  iconAnchor: [14, 24],
}) : null;

// Custom Leaflet Route Start Icon (Green)
const startMarkerIcon = typeof window !== "undefined" ? L.divIcon({
  html: `
    <div class="map-route-marker start-marker">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#10B981" stroke-width="2.5">
        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill="#D1FAE5" />
        <circle cx="12" cy="10" r="3" fill="#10B981" />
      </svg>
      <span class="marker-label-tooltip start-tooltip">Start</span>
    </div>
  `,
  className: "custom-route-marker-icon",
  iconSize: [30, 45],
  iconAnchor: [15, 30],
}) : null;

// Custom Leaflet Route End Icon (Red)
const endMarkerIcon = typeof window !== "undefined" ? L.divIcon({
  html: `
    <div class="map-route-marker end-marker">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#EF4444" stroke-width="2.5">
        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill="#FEE2E2" />
        <circle cx="12" cy="10" r="3" fill="#EF4444" />
      </svg>
      <span class="marker-label-tooltip end-tooltip">End</span>
    </div>
  `,
  className: "custom-route-marker-icon",
  iconSize: [30, 45],
  iconAnchor: [15, 30],
}) : null;

interface HomeMapProps {
  onNavigatePage: (page: Page) => void;
}

// Controller to smoothly pan the map when search or center changes
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true, duration: 1.0 });
  }, [center, map]);
  return null;
}

export default function HomeMap({ onNavigatePage }: HomeMapProps) {
  const [activeMode, setActiveMode] = useState<"chill" | "heat" | "navigate">("chill");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(CARLTON);
  const [mapCenter, setMapCenter] = useState<[number, number]>(CARLTON_COORDS);
  const [zoomLevel, setZoomLevel] = useState(16);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [destination, setDestination] = useState<{ name: string; lat: number; lng: number } | null>(null);

  // Stacked search state for Navigate mode
  const [origin, setOrigin] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [focusedInput, setFocusedInput] = useState<"origin" | "destination" | null>(null);

  // Planned routes state for Navigate mode
  const [plannedTrips, setPlannedTrips] = useState<any[]>([]);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(0);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Threshold settings state
  const [soundThreshold, setSoundThreshold] = useState(35);
  const [crowdThreshold, setCrowdThreshold] = useState(30);
  const [showThresholdCard, setShowThresholdCard] = useState(true);
  const [editingField, setEditingField] = useState<"none" | "sound" | "crowd">("none");

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
  const [quietSpaces, setQuietSpaces] = useState<Place[]>([]);
  const [sensors, setSensors] = useState<SensorDensityCurrent[]>([]);
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

  // Fetch quiet spaces and pedestrian sensors from Supabase (or fallback to static data)
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      const dbConfigured = hasSupabaseEnv();
      let placesData: Place[] = [];
      let sensorsData: SensorDensityCurrent[] = [];

      if (dbConfigured) {
        try {
          const sb = getSupabase();
          const [placesRes, sensorsRes] = await Promise.all([
            sb.from("places").select("*").eq("is_sensory_refuge", true),
            sb.from("sensor_density_current").select("*"),
          ]);
          if (placesRes.data) placesData = placesRes.data as Place[];
          if (sensorsRes.data) sensorsData = sensorsRes.data as SensorDensityCurrent[];
        } catch (e) {
          console.error("Failed to load map data from Supabase", e);
        }
      }

      if (!active) return;

      // Inject standard quiet spaces fallback
      const standardRefuges: Place[] = [
        {
          id: "state-library",
          name: "State Library Forecourt",
          category: "Library",
          theme: "Calm outdoor library courtyard",
          sub_theme: "",
          source: "State Library Victoria",
          is_sensory_refuge: true,
          in_cbd: true,
          latitude: -37.8098,
          longitude: 144.9652,
          updated_at: new Date().toISOString(),
        },
        {
          id: "flagstaff-gardens",
          name: "Flagstaff Gardens path",
          category: "Park",
          theme: "Lush green trees and grassy paths",
          sub_theme: "",
          source: "Flagstaff",
          is_sensory_refuge: true,
          in_cbd: true,
          latitude: -37.8120,
          longitude: 144.9562,
          updated_at: new Date().toISOString(),
        },
        {
          id: "town-hall-arcade",
          name: "Town Hall arcade seating",
          category: "Public Seating",
          theme: "Quiet indoor arcade seating",
          sub_theme: "",
          source: "Melbourne City",
          is_sensory_refuge: true,
          in_cbd: true,
          latitude: -37.8150,
          longitude: 144.9667,
          updated_at: new Date().toISOString(),
        },
      ];

      // Inject Carlton Mock spaces to matches the Carlton mockup visual coordinates!
      const carltonRefuges: Place[] = [
        {
          id: "the-spot-refuge",
          name: "The Spot (Study Courtyard)",
          category: "University Quiet Space",
          theme: "Sunlit open courtyard with minimal foot traffic",
          sub_theme: "University of Melbourne",
          source: "UniMelb",
          is_sensory_refuge: true,
          in_cbd: false,
          latitude: -37.8023,
          longitude: 144.9592,
          updated_at: new Date().toISOString(),
        },
        {
          id: "seven-seeds-garden",
          name: "Seven Seeds (Quiet Garden)",
          category: "Cafe Courtyard",
          theme: "Cozy rear garden corner filled with lush plants",
          sub_theme: "Seven Seeds Coffee Roaster",
          source: "Independent",
          is_sensory_refuge: true,
          in_cbd: false,
          latitude: -37.8034,
          longitude: 144.9591,
          updated_at: new Date().toISOString(),
        },
      ];

      // Combine places, prioritizing fetched DB places but making sure Carlton mock places are present
      const combinedPlaces = [...placesData];
      carltonRefuges.forEach(c => {
        if (!combinedPlaces.some(p => p.id === c.id)) {
          combinedPlaces.push(c);
        }
      });
      standardRefuges.forEach(s => {
        if (!combinedPlaces.some(p => p.id === s.id)) {
          combinedPlaces.push(s);
        }
      });

      setQuietSpaces(combinedPlaces);

      // If no sensor data, inject mock Carlton sensors for visual effect in Carlton mockup
      if (sensorsData.length === 0) {
        sensorsData = [
          {
            location_id: 101,
            sensor_name: "Pelham St / Elizabeth St",
            latitude: -37.8035,
            longitude: 144.9585,
            in_cbd: false,
            total_count: 22,
            density_level: "Low",
            sensing_datetime: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            location_id: 102,
            sensor_name: "Grattan St / Berkeley St",
            latitude: -37.8015,
            longitude: 144.9595,
            in_cbd: false,
            total_count: 185,
            density_level: "High",
            sensing_datetime: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            location_id: 103,
            sensor_name: "Royal Parade / Pelham St",
            latitude: -37.8030,
            longitude: 144.9575,
            in_cbd: false,
            total_count: 75,
            density_level: "Medium",
            sensing_datetime: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      }
      setSensors(sensorsData);
    };

    loadData();
    return () => {
      active = false;
    };
  }, []);

  // Filter search suggestions
  const suggestions = useMemo(() => {
    // Combine standard suggestions and mock spaces
    const combinedSuggestions = [
      ...cbdLocations.map(l => ({ name: l.name, lat: l.lat, lng: l.lng })),
      { name: "Seven Seeds Coffee Roasters", lat: -37.8034, lng: 144.9591 },
      { name: "The Spot, UniMelb", lat: -37.8023, lng: 144.9592 },
      { name: "Carlton Gardens North", lat: -37.8017, lng: 144.9720 },
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
      const sensorSound = 30 + Math.min(55, Math.round(sensor.total_count * 0.3));
      
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
  const rankedTrips = useMemo(() => {
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
      // Simulated sound level: 30db to 85db
      const sensorSound = 30 + Math.min(55, Math.round(sensor.total_count * 0.3));
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
          setMapCenter([destination.lat, destination.lng]);
        } else if (res.trip) {
          setPlannedTrips([res.trip]);
          setSelectedRouteIdx(0);
          setMapCenter([destination.lat, destination.lng]);
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

  // Helper to format sensor details
  const getSensorColor = (level: string) => {
    if (level === "Low") return "#1EC700"; // Clean Green
    if (level === "Medium") return "#FFD11B"; // Warm Yellow
    return "#DD3333"; // Dangerous Red
  };

  return (
    <div className="home-mockup-wrapper">
      {/* Search Header Overlay */}
      <div className="search-header-overlay">
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
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10B981" stroke-width="2.5" style={{ marginRight: 6, flexShrink: 0 }}>
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill="#D1FAE5" />
                <circle cx="12" cy="10" r="3" fill="#10B981" />
              </svg>
              <span className="input-field-label start-label">Start</span>
              <input
                type="text"
                className="search-destination-input"
                placeholder="Choose start point..."
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
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#EF4444" stroke-width="2.5" style={{ marginRight: 6, flexShrink: 0 }}>
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" fill="#FEE2E2" />
                <circle cx="12" cy="10" r="3" fill="#EF4444" />
              </svg>
              <span className="input-field-label end-label">End</span>
              <input
                type="text"
                className="search-destination-input"
                placeholder="Choose destination..."
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
              <SearchIcon size={18} fill="#777777" />
            </div>
            <input
              type="text"
              className="search-destination-input"
              placeholder="Search Destination"
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
        <div className="thresholds-card-overlay">
          {/* Sound Threshold Row */}
          {editingField === "sound" ? (
            <div className="heat-threshold-row edit-mode">
              <SoundIcon size={20} fill="#111111" />
              <div className="custom-slider-container">
                <input
                  type="range"
                  min="30"
                  max="90"
                  value={soundThreshold}
                  onChange={(e) => setSoundThreshold(Number(e.target.value))}
                  className="custom-range-input"
                  autoFocus
                />
                <div className="custom-slider-track"></div>
                <div
                  className="custom-slider-thumb"
                  style={{ left: `calc(${((soundThreshold - 30) / (90 - 30)) * 100}% - 12px)` }}
                >
                  {soundThreshold}
                </div>
              </div>
              <span className="unit-label">db</span>
            </div>
          ) : (
            <div
              className="heat-threshold-row view-mode"
              onClick={() => setEditingField("sound")}
            >
              <SoundIcon size={20} fill="#111111" />
              <span className="heat-threshold-text">Sound Levels: {soundThreshold}db</span>
            </div>
          )}

          {/* Crowd Threshold Row */}
          {editingField === "crowd" ? (
            <div className="heat-threshold-row edit-mode">
              <CrowdIcon size={20} fill="#111111" />
              <div className="custom-slider-container">
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={crowdThreshold}
                  onChange={(e) => setCrowdThreshold(Number(e.target.value))}
                  className="custom-range-input"
                  autoFocus
                />
                <div className="custom-slider-track"></div>
                <div
                  className="custom-slider-thumb"
                  style={{ left: `calc(${((crowdThreshold - 10) / (150 - 10)) * 100}% - 12px)` }}
                >
                  {crowdThreshold}
                </div>
              </div>
              <span className="unit-label">p</span>
            </div>
          ) : (
            <div
              className="heat-threshold-row view-mode"
              onClick={() => setEditingField("crowd")}
            >
              <CrowdIcon size={20} fill="#111111" />
              <span className="heat-threshold-text">Crowd Strength: {crowdThreshold}p</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation Route Card */}
      {activeMode !== "navigate" && routeDetails && (
        <div className="routing-card-overlay">
          <div className="routing-info">
            <div className="routing-headline">Calmer route ready</div>
            <div className="routing-stats">
              <span>{routeDetails.duration}</span>
              <span className="dot-sep">&bull;</span>
              <span>{routeDetails.distance}</span>
            </div>
          </div>
          <button
            className="start-journey-btn"
            onClick={() => {
              if (destination) {
                const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination.lat},${destination.lng}&travelmode=walking`;
                window.open(url, "_blank");
              }
            }}
          >
            Start
          </button>
        </div>
      )}

      {/* Navigate Mode Routes List Card Overlay */}
      {activeMode === "navigate" && rankedTrips.length > 0 && (
        <div className="routes-list-card-overlay">
          <div className="routes-list-header">Suggested Routes</div>
          <div className="routes-list-container">
            {rankedTrips.map((trip, idx) => {
              const isCalmest = idx === 0;
              const isSelected = selectedRouteIdx === idx;
              const distanceKm = (trip.distanceMeters / 1000).toFixed(2);
              const durationMins = Math.round(trip.durationSeconds / 60);
              
              return (
                <div
                  key={idx}
                  className={`route-option-row ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedRouteIdx(idx)}
                >
                  <div className="route-option-left">
                    <div
                      className="route-color-indicator"
                      style={{ backgroundColor: isCalmest ? "#2563eb" : "#222222" }}
                    ></div>
                    <div className="route-name-container">
                      <div className="route-name">{isCalmest ? "Route A (Calmest)" : `Route B (Alternative)`}</div>
                      <div className="route-details-text">
                        {durationMins} min &bull; {trip.distanceMeters < 1000 ? `${Math.round(trip.distanceMeters)}m` : `${distanceKm} km`}
                      </div>
                    </div>
                  </div>
                  <div className={`route-warning-badge ${trip.warnings > 0 ? "has-warnings" : "no-warnings"}`}>
                    {trip.warnings === 0 ? "No warnings" : `${trip.warnings} warning${trip.warnings > 1 ? "s" : ""}`}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            className="start-journey-btn large-start-btn"
            onClick={() => {
              if (origin && destination) {
                const trip = rankedTrips[selectedRouteIdx];
                const waypointsParam = trip?.via ? `&waypoints=${trip.via.lat},${trip.via.lng}` : "";
                const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}${waypointsParam}&travelmode=walking`;
                window.open(url, "_blank");
              }
            }}
          >
            Start Journey
          </button>
        </div>
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
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            pathOptions={{
              color: "#3EBFFF",
              fillColor: "#3EBFFF",
              fillOpacity: 0.15,
              weight: 1,
              className: "user-location-halo",
            }}
            radius={28}
          />
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#2563eb",
              fillOpacity: 1,
              weight: 2.5,
            }}
            radius={8}
          >
            <Popup>
              <strong>Your location</strong>
              <br />
              {inCbd(userLocation.lat, userLocation.lng) ? "Melbourne CBD" : "Carlton"}
            </Popup>
          </CircleMarker>

          {/* MODE 1: Chill Mode Quiet Places Highlights */}
          {activeMode === "chill" && (
            <>

              {/* Render Standard Quiet Places */}
              {activeQuietSpaces.map((refuge) => (
                <React.Fragment key={refuge.id}>
                  {/* Glowing Blur Aura around each place */}
                  <CircleMarker
                    center={[refuge.latitude, refuge.longitude]}
                    pathOptions={{
                      fillColor: "#3EBFFF",
                      fillOpacity: 0.65,
                      color: "transparent",
                      weight: 0,
                      className: "quiet-highlight-space",
                    }}
                    radius={25}
                  />
                  {/* Small sharp core */}
                  <CircleMarker
                    center={[refuge.latitude, refuge.longitude]}
                    pathOptions={{
                      fillColor: "#3EBFFF",
                      fillOpacity: 1,
                      color: "#ffffff",
                      weight: 2,
                    }}
                    radius={7}
                  >
                    <Popup>
                      <strong>{refuge.name}</strong>
                      <br />
                      <span className="refuge-popup-category">{refuge.category ?? "Quiet Space"}</span>
                      <br />
                      <span className="refuge-popup-theme">{refuge.theme}</span>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              ))}
            </>
          )}

          {/* MODE 2: Heat Zone Pedestrian Sensors */}
          {activeMode === "heat" &&
            filteredHeatSensors.map((sensor) => {
              const sensorSound = 30 + Math.min(55, Math.round(sensor.total_count * 0.3));
              const isCrowdExceeded = sensor.total_count >= crowdThreshold;
              const isSoundExceeded = sensorSound >= soundThreshold;
              return (
                <React.Fragment key={sensor.location_id}>
                  {/* Dots (CircleMarkers) for when crowd exceeds threshold */}
                  {isCrowdExceeded && (
                    <>
                      <CircleMarker
                        center={[sensor.latitude, sensor.longitude]}
                        pathOptions={{
                          fillColor: getSensorColor(sensor.density_level),
                          fillOpacity: 0.75,
                          color: "transparent",
                          weight: 0,
                          className: "quiet-highlight-space",
                        }}
                        radius={sensor.density_level === "High" ? 35 : sensor.density_level === "Medium" ? 25 : 15}
                      />
                      {/* Solid Core */}
                      <CircleMarker
                        center={[sensor.latitude, sensor.longitude]}
                        pathOptions={{
                          fillColor: getSensorColor(sensor.density_level),
                          fillOpacity: 1,
                          color: "#ffffff",
                          weight: 1.5,
                        }}
                        radius={7}
                      >
                        <Popup>
                          <strong>{sensor.sensor_name || `Sensor ${sensor.location_id}`}</strong>
                          <br />
                          Density: <strong>{sensor.density_level}</strong>
                          <br />
                          Count: {sensor.total_count} peds/min
                          <br />
                          Crowd Threshold Exceeded! ({crowdThreshold}p)
                        </Popup>
                      </CircleMarker>
                    </>
                  )}

                  {/* Warning Triangle Marker for when sound exceeds threshold */}
                  {isSoundExceeded && warningIcon && (
                    <Marker
                      position={[sensor.latitude, sensor.longitude]}
                      icon={warningIcon}
                    >
                      <Popup>
                        <strong>{sensor.sensor_name || `Sensor ${sensor.location_id}`} WARNING</strong>
                        <br />
                        Sound level exceeds threshold!
                        <br />
                        Sound: {sensorSound} db (Threshold: {soundThreshold}db)
                      </Popup>
                    </Marker>
                  )}
                </React.Fragment>
              );
            })}

          {/* Render Route Polyline & Destination/Origin in Navigate Mode */}
          {activeMode === "navigate" ? (
            <>
              {/* Origin Pin */}
              {origin && startMarkerIcon && (
                <Marker
                  position={[origin.lat, origin.lng]}
                  icon={startMarkerIcon}
                >
                  <Popup>
                    <strong>{origin.name}</strong>
                    <br />
                    Start Location
                  </Popup>
                </Marker>
              )}

              {/* Destination Pin */}
              {destination && endMarkerIcon && (
                <Marker
                  position={[destination.lat, destination.lng]}
                  icon={endMarkerIcon}
                >
                  <Popup>
                    <strong>{destination.name}</strong>
                    <br />
                    Destination
                  </Popup>
                </Marker>
              )}

              {/* Multiple walking path polylines */}
              {rankedTrips.map((trip, idx) => {
                const isCalmest = idx === 0;
                const isSelected = selectedRouteIdx === idx;
                return (
                  <Polyline
                    key={idx}
                    positions={trip.allPositions}
                    eventHandlers={{
                      click: () => {
                        setSelectedRouteIdx(idx);
                      },
                    }}
                    pathOptions={{
                      color: isCalmest ? "#2563eb" : "#222222",
                      weight: isSelected ? 6 : 4,
                      opacity: isSelected ? 0.95 : 0.45,
                      dashArray: isSelected ? undefined : "5, 10",
                      lineCap: "round",
                      className: "interactive-route-line",
                    }}
                  />
                );
              })}

              {/* Render quiet spaces along the route */}
              {activeQuietSpaces.map((refuge) => (
                <React.Fragment key={refuge.id}>
                  {/* Glowing Blur Aura around each place */}
                  <CircleMarker
                    center={[refuge.latitude, refuge.longitude]}
                    pathOptions={{
                      fillColor: "#3EBFFF",
                      fillOpacity: 0.65,
                      color: "transparent",
                      weight: 0,
                      className: "quiet-highlight-space",
                    }}
                    radius={25}
                  />
                  {/* Small sharp core */}
                  <CircleMarker
                    center={[refuge.latitude, refuge.longitude]}
                    pathOptions={{
                      fillColor: "#3EBFFF",
                      fillOpacity: 1,
                      color: "#ffffff",
                      weight: 2,
                    }}
                    radius={7}
                  >
                    <Popup>
                      <strong>{refuge.name}</strong>
                      <br />
                      <span className="refuge-popup-category">{refuge.category ?? "Quiet Space"}</span>
                      <br />
                      <span className="refuge-popup-theme">{refuge.theme}</span>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              ))}

              {/* Render sensors along the route */}
              {activeSensors.map((sensor) => (
                <React.Fragment key={sensor.location_id}>
                  <CircleMarker
                    center={[sensor.latitude, sensor.longitude]}
                    pathOptions={{
                      fillColor: getSensorColor(sensor.density_level),
                      fillOpacity: 0.75,
                      color: "transparent",
                      weight: 0,
                      className: "quiet-highlight-space",
                    }}
                    radius={sensor.density_level === "High" ? 35 : sensor.density_level === "Medium" ? 25 : 15}
                  />
                  {/* Solid Core */}
                  <CircleMarker
                    center={[sensor.latitude, sensor.longitude]}
                    pathOptions={{
                      fillColor: getSensorColor(sensor.density_level),
                      fillOpacity: 1,
                      color: "#ffffff",
                      weight: 1.5,
                    }}
                    radius={7}
                  >
                    <Popup>
                      <strong>{sensor.sensor_name || `Sensor ${sensor.location_id}`}</strong>
                      <br />
                      Density: <strong>{sensor.density_level}</strong>
                      <br />
                      Count: {sensor.total_count} peds/min
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              ))}
            </>
          ) : (
            // Non-navigate modes (single route rendering)
            routePath.length > 0 && (
              <>
                {/* Destination Pin */}
                {destination && (
                  <CircleMarker
                    center={[destination.lat, destination.lng]}
                    pathOptions={{
                      fillColor: "#000000",
                      fillOpacity: 1,
                      color: "#ffffff",
                      weight: 2,
                    }}
                    radius={7}
                  >
                    <Popup>
                      <strong>{destination.name}</strong>
                      <br />
                      Destination
                    </Popup>
                  </CircleMarker>
                )}
                {/* Walking path polyline */}
                <Polyline
                  positions={routePath}
                  pathOptions={{
                    color: "#000000",
                    weight: 5,
                    opacity: 0.85,
                    dashArray: "1, 8",
                    lineCap: "round",
                  }}
                />

                {/* Render quiet spaces along the route (when not already in Chill Mode) */}
                {activeMode !== "chill" && activeQuietSpaces.map((refuge) => (
                  <React.Fragment key={refuge.id}>
                    {/* Glowing Blur Aura around each place */}
                    <CircleMarker
                      center={[refuge.latitude, refuge.longitude]}
                      pathOptions={{
                        fillColor: "#3EBFFF",
                        fillOpacity: 0.65,
                        color: "transparent",
                        weight: 0,
                        className: "quiet-highlight-space",
                      }}
                      radius={25}
                    />
                    {/* Small sharp core */}
                    <CircleMarker
                      center={[refuge.latitude, refuge.longitude]}
                      pathOptions={{
                        fillColor: "#3EBFFF",
                        fillOpacity: 1,
                        color: "#ffffff",
                        weight: 2,
                      }}
                      radius={7}
                    >
                      <Popup>
                        <strong>{refuge.name}</strong>
                        <br />
                        <span className="refuge-popup-category">{refuge.category ?? "Quiet Space"}</span>
                        <br />
                        <span className="refuge-popup-theme">{refuge.theme}</span>
                      </Popup>
                    </CircleMarker>
                  </React.Fragment>
                ))}

                {/* Render sensors along the route (when not already in Heat Zones Mode) */}
                {activeMode !== "heat" && activeSensors.map((sensor) => (
                  <React.Fragment key={sensor.location_id}>
                    <CircleMarker
                      center={[sensor.latitude, sensor.longitude]}
                      pathOptions={{
                        fillColor: getSensorColor(sensor.density_level),
                        fillOpacity: 0.75,
                        color: "transparent",
                        weight: 0,
                        className: "quiet-highlight-space",
                      }}
                      radius={sensor.density_level === "High" ? 35 : sensor.density_level === "Medium" ? 25 : 15}
                    />
                    {/* Solid Core */}
                    <CircleMarker
                      center={[sensor.latitude, sensor.longitude]}
                      pathOptions={{
                        fillColor: getSensorColor(sensor.density_level),
                        fillOpacity: 1,
                        color: "#ffffff",
                        weight: 1.5,
                      }}
                      radius={7}
                    >
                      <Popup>
                        <strong>{sensor.sensor_name || `Sensor ${sensor.location_id}`}</strong>
                        <br />
                        Density: <strong>{sensor.density_level}</strong>
                        <br />
                        Count: {sensor.total_count} peds/min
                      </Popup>
                    </CircleMarker>
                  </React.Fragment>
                ))}
              </>
            )
          )}
        </MapContainer>
      </div>

      {/* Liquid Glass Bottom Switcher */}
      <div className="glass-pill-container">
        <button
          className={`mode-btn ${activeMode === "chill" ? "active chill-active" : ""}`}
          onClick={() => {
            setActiveMode("chill");
            if (destination) {
              setMapCenter([destination.lat, destination.lng]);
            } else {
              setMapCenter(CARLTON_COORDS);
            }
          }}
          type="button"
        >
          <ChillIcon fill={activeMode === "chill" ? "#3EBFFF" : "#111111"} size={22} />
          {activeMode === "chill" && <span className="mode-text">Chill Mode</span>}
        </button>

        <button
          className={`mode-btn ${activeMode === "heat" ? "active heat-active" : ""}`}
          onClick={() => setActiveMode("heat")}
          type="button"
        >
          <HeatIcon fill={activeMode === "heat" ? "#FF7B00" : "#111111"} size={22} />
          {activeMode === "heat" && <span className="mode-text">Heat Zones</span>}
        </button>

        <button
          className={`mode-btn ${activeMode === "navigate" ? "active navigate-active" : ""}`}
          onClick={() => setActiveMode("navigate")}
          type="button"
        >
          <NavigateIcon fill={activeMode === "navigate" ? "#155724" : "#111111"} size={22} />
          {activeMode === "navigate" && <span className="mode-text">Navigate</span>}
        </button>
      </div>
    </div>
  );
}
