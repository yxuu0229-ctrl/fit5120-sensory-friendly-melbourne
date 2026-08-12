import { useEffect, useState } from "react";

/** Bump when tip copy/placement changes so returning users see the tour again. */
const DONE_KEY = "relax-maps-onboarding-v2";
const SESSION_KEY = "relax-maps-onboarding-session-v2";

type Tip = {
  id: string;
  text: string;
  place: "center" | "plan" | "modes" | "go" | "legend";
};

const TIPS: Tip[] = [
  {
    id: "welcome",
    text: "You can use the app through this map",
    place: "center",
  },
  {
    id: "plan",
    text: "Set Start Location and Destination in Plan",
    place: "plan",
  },
  {
    id: "modes",
    text: "Switch Walk, Cycle, Drive or Transit for different routes",
    place: "modes",
  },
  {
    id: "crowd",
    text: "Coloured areas show crowd density on streets & buildings",
    place: "legend",
  },
  {
    id: "go",
    text: "Press Go to start navigation — or find a Nearest refuge",
    place: "go",
  },
];

function forceTipsFromQuery() {
  try {
    return new URLSearchParams(window.location.search).get("tips") === "1";
  } catch {
    return false;
  }
}

/**
 * Hand-drawn style coach marks for new users.
 * Each tip auto-advances after 5 seconds.
 * Shows once per browser session until Skip (then permanently hidden).
 * Add ?tips=1 to force the tour again.
 */
export default function OnboardingTips({
  enabled = true,
}: {
  enabled?: boolean;
}) {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const forced = forceTipsFromQuery();
    if (forced) {
      try {
        localStorage.removeItem(DONE_KEY);
        localStorage.removeItem("relax-maps-onboarding-v1");
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // ignore
      }
    } else {
      try {
        if (localStorage.getItem(DONE_KEY) === "done") return;
        if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      } catch {
        // ignore
      }
    }

    // Brief delay so the map chrome is painted first.
    const start = window.setTimeout(() => setStep(0), 400);
    return () => window.clearTimeout(start);
  }, [enabled]);

  useEffect(() => {
    if (step == null) return;
    if (step >= TIPS.length) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // ignore
      }
      setStep(null);
      return;
    }
    const timer = window.setTimeout(
      () => setStep((s) => (s == null ? s : s + 1)),
      5000
    );
    return () => window.clearTimeout(timer);
  }, [step]);

  if (step == null || step >= TIPS.length) return null;

  const tip = TIPS[step];

  function dismiss() {
    try {
      localStorage.setItem(DONE_KEY, "done");
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
    setStep(null);
  }

  function skip() {
    setStep((s) => (s == null ? s : s + 1));
  }

  return (
    <div
      className={`coach-overlay coach-${tip.place}`}
      role="dialog"
      aria-label="App tips"
    >
      <div className="coach-card">
        <p className="coach-text">{tip.text}</p>
        <svg
          className="coach-arrow"
          viewBox="0 0 120 70"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            d="M15 15C35 45, 65 55, 100 35"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M87 35L100 35L97 48"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="coach-actions">
          <span className="coach-progress">
            {step + 1} / {TIPS.length}
          </span>
          <button type="button" className="coach-next" onClick={skip}>
            Next
          </button>
          <button type="button" className="coach-skip" onClick={dismiss}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
