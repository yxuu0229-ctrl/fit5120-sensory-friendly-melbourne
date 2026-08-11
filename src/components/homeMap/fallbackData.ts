import type { Place, SensorDensityCurrent } from "../../lib/types";
import type { LocationPoint } from "./shared";

// Standard quiet spaces fallback
export const getStandardRefuges = (): Place[] => [
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

// Carlton Mock spaces to match the Carlton mockup visual coordinates
export const getCarltonRefuges = (): Place[] => [
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

// Mock Carlton sensors for visual effect in the Carlton mockup
export const getCarltonMockSensors = (): SensorDensityCurrent[] => [
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

// Extra Carlton search suggestions shown alongside the CBD locations
export const carltonSuggestions: LocationPoint[] = [
  { name: "Seven Seeds Coffee Roasters", lat: -37.8034, lng: 144.9591 },
  { name: "The Spot, UniMelb", lat: -37.8023, lng: 144.9592 },
  { name: "Carlton Gardens North", lat: -37.8017, lng: 144.9720 },
];
