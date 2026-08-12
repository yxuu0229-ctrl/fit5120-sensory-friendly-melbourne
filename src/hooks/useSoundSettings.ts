import { useEffect, useState } from "react";
import { isAudioMuted, setAudioMuted } from "../lib/soothingSound";

export function useSoundSettings() {
  const [muted, setMuted] = useState<boolean>(() => isAudioMuted());

  useEffect(() => {
    setAudioMuted(muted);
  }, [muted]);

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      setAudioMuted(next);
      return next;
    });
  };

  return {
    muted,
    setMuted,
    toggleMute,
  };
}
