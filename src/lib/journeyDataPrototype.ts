import type { LatLng } from "./geo";
import type { PlannedRoute, RouteCandidate } from "./journeyPlanning";
import type {
  GeocodeResult,
  JourneyData,
  RefugePlace,
  SensorReading,
  WalkingRoutesResult,
} from "./journeyData";

const cbdLocations = [
  { name: "Southern Cross Station", lat: -37.8183, lng: 144.9525 },
  { name: "State Library Victoria", lat: -37.8098, lng: 144.9652 },
  { name: "Flagstaff Station", lat: -37.812, lng: 144.9562 },
  { name: "Melbourne Town Hall", lat: -37.815, lng: 144.9667 },
  { name: "Bourke Street Mall", lat: -37.8136, lng: 144.9645 },
];
const melbourneCenter: LatLng = { lat: -37.8136, lng: 144.9631 };
const densityLevels: SensorReading["density_level"][] = ["Low", "Medium", "High"];

export const prototypeRouteOptions: PlannedRoute[] = [
  {
    name: "Route A",
    label: "Prototype route via Flagstaff Station",
    sensoryLevel: "Low",
    distanceMeters: 480,
    durationSeconds: 31 * 60,
    sensoryLoad: 12,
    positions: [],
    worstSegment: { level: "Low", sensorName: "Flagstaff_Station" },
    exceedsTolerance: false,
    reason:
      "Busiest segment: Low pedestrian volume near Flagstaff Station. Within your Medium crowd tolerance.",
  },
  {
    name: "Route B",
    label: "Prototype route via Parliament Station",
    sensoryLevel: "Medium",
    distanceMeters: 620,
    durationSeconds: 35 * 60,
    sensoryLoad: 48,
    positions: [],
    worstSegment: { level: "Medium", sensorName: "Parliament_Station" },
    exceedsTolerance: false,
    reason:
      "Busiest segment: Medium pedestrian volume near Parliament Station. Within your Medium crowd tolerance.",
  },
  {
    name: "Route C",
    label: "Prototype route via Swanston Street",
    sensoryLevel: "High",
    distanceMeters: 220,
    durationSeconds: 24 * 60,
    sensoryLoad: 84,
    positions: [],
    worstSegment: { level: "High", sensorName: "Swanston_St" },
    exceedsTolerance: true,
    reason:
      "Busiest segment: High pedestrian volume near Swanston St. Ranked below calmer options because it exceeds your Medium crowd tolerance.",
  },
];

export function createPrototypeJourneyData(): JourneyData {
  return {
    async sensorReadings(limit?: number): Promise<SensorReading[]> {
      const readings = cbdLocations.map((location, index) => ({
        location_id: index,
        sensor_name: location.name,
        latitude: location.lat,
        longitude: location.lng,
        density_level: densityLevels[index % densityLevels.length],
      }));
      return limit != null && limit > 0 ? readings.slice(0, limit) : readings;
    },

    async sensoryRefuges(): Promise<RefugePlace[]> {
      return [
        {
          id: "state-library",
          name: "State Library Victoria",
          category: "Library",
          theme: "Quiet study space",
          sub_theme: null,
          source: "Prototype",
          latitude: -37.8098,
          longitude: 144.9652,
        },
        {
          id: "flagstaff-gardens",
          name: "Flagstaff Gardens",
          category: "Park",
          theme: "Open space",
          sub_theme: null,
          source: "Prototype",
          latitude: -37.812,
          longitude: 144.9562,
        },
        {
          id: "town-hall-arcade",
          name: "Melbourne Town Hall",
          category: "Public",
          theme: "Sheltered seating",
          sub_theme: null,
          source: "Prototype",
          latitude: -37.815,
          longitude: 144.9667,
        },
      ];
    },

    async walkingRoutes(from: LatLng, to: LatLng): Promise<WalkingRoutesResult> {
      const candidates: RouteCandidate[] = [
        {
          label: "Prototype direct route",
          distanceMeters: 500,
          durationSeconds: 6 * 60,
          positions: [
            [from.lat, from.lng],
            [to.lat, to.lng],
          ],
        },
      ];

      return { candidates, error: null, trip: null, dataProvenance: null };
    },

    async geocode(query: string): Promise<GeocodeResult | null> {
      const normalized = query.toLowerCase();
      const match = cbdLocations.find((location) => normalized.includes(location.name.toLowerCase()));
      if (match) {
        return { label: match.name, point: { lat: match.lat, lng: match.lng } };
      }

      return { label: query, point: melbourneCenter };
    },
  };
}
