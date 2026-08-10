import type { LatLng } from "./geo";

export type AddressStatus = "idle" | "checking" | "ready" | "error";

export type AddressResolution = {
  point: LatLng | null;
  status: "ready" | "error";
  message: string;
};

export type ResolveAddressDeps = {
  resolveLocal: (value: string) => LatLng | null;
  geocode: (query: string) => Promise<{ label: string; point: LatLng } | null>;
};

export async function resolveAddress(
  value: string,
  deps: ResolveAddressDeps
): Promise<AddressResolution> {
  const localMatch = deps.resolveLocal(value);
  if (localMatch) {
    return { point: localMatch, status: "ready", message: `Using: ${value}` };
  }

  try {
    const result = await deps.geocode(value);
    if (!result) {
      return {
        point: null,
        status: "error",
        message: "Address not recognised. Please choose a suggested location or enter more detail.",
      };
    }

    return { point: result.point, status: "ready", message: `Using: ${result.label}` };
  } catch {
    return {
      point: null,
      status: "error",
      message: "Address lookup failed. Please choose a suggested location.",
    };
  }
}

export function shouldSkipAddress(trimmed: string, opts: { skipDefaultOrigin: boolean }): boolean {
  if (!trimmed) return true;
  if (opts.skipDefaultOrigin && trimmed.toLowerCase() === "current location") return true;
  return false;
}
