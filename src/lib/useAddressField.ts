import { useState } from "react";
import type { LatLng } from "./geo";
import { resolveAddress, shouldSkipAddress, type AddressStatus } from "./resolveAddress";

export type UseAddressFieldOptions = {
  resolveLocal: (value: string) => LatLng | null;
  geocode: (query: string) => Promise<{ label: string; point: LatLng } | null>;
  onValueEdited?: (value: string) => void;
  skipDefaultOrigin?: boolean;
};

export type AddressField = {
  value: string;
  point: LatLng | null;
  status: AddressStatus;
  message: string;
  setValue: (value: string) => void;
  choose: (name: string, point: LatLng) => void;
  validate: () => Promise<void>;
  setResult: (point: LatLng | null, message: string) => void;
};

export function useAddressField(options: UseAddressFieldOptions): AddressField {
  const [value, setValueState] = useState("");
  const [point, setPoint] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<AddressStatus>("idle");
  const [message, setMessage] = useState("");

  function setValue(nextValue: string) {
    setValueState(nextValue);
    setPoint(null);
    setStatus("idle");
    setMessage("");
    options.onValueEdited?.(nextValue);
  }

  function choose(name: string, chosenPoint: LatLng) {
    setValueState(name);
    setPoint(chosenPoint);
    setStatus("ready");
    setMessage(`Using: ${name}`);
    options.onValueEdited?.(name);
  }

  function setResult(nextPoint: LatLng | null, nextMessage: string) {
    setPoint(nextPoint);
    setStatus(nextPoint ? "ready" : "error");
    setMessage(nextMessage);
  }

  async function validate() {
    const trimmed = value.trim();
    if (shouldSkipAddress(trimmed, { skipDefaultOrigin: options.skipDefaultOrigin ?? false })) return;

    setStatus("checking");
    setMessage("Checking address...");

    const result = await resolveAddress(trimmed, {
      resolveLocal: options.resolveLocal,
      geocode: options.geocode,
    });
    setPoint(result.point);
    setStatus(result.status);
    setMessage(result.message);
  }

  return { value, point, status, message, setValue, choose, validate, setResult };
}
