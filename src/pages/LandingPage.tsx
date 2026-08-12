import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      setIsMobile(vw < 768);

      const baseWidth = 1301;
      const baseHeight = 885;

      const scaleX = (vw - 40) / baseWidth;
      const scaleY = (vh - 180) / baseHeight;
      const newScale = Math.max(0.2, Math.min(scaleX, scaleY));

      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  if (isMobile) {
    return <Navigate to="/map" replace />;
  }

  return (
    <div className="landing-page">
      <div className="landing-wash" aria-hidden="true" />

      <header className="landing-header">
        <div className="landing-brand">
          <img
            src="/images/relax-maps-logo.svg"
            alt=""
            className="landing-brand-mark"
            width={56}
            height={56}
          />
          <span className="landing-brand-name">
            <span className="landing-brand-relax">Relax</span>{" "}
            <span className="landing-brand-maps">Maps</span>
          </span>
        </div>
        <h1 className="hero-text">
          Quiet paths through the city
        </h1>
        <p className="hero-subtitle">
          Plan walking routes that respect your sensory limits | crowd density, calmer corridors, and nearby places to reset
        </p>
      </header>

      <main className="landing-main">
        <div
          ref={containerRef}
          className="mockup-container"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <img
            src="/images/mockup.png"
            className="mockup-image"
            alt="Relax Maps Interactive Phone Mockup"
          />

          <div className="hint-container">
            <p className="hint-text">You Can Use The App Through This Mockup</p>
            <svg
              className="hint-arrow"
              viewBox="0 0 120 70"
              fill="none"
              stroke="currentColor"
              xmlns="http://www.w3.org/2000/svg"
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
          </div>

          <div className="phone-screen-container">
            <div className="dynamic-island" />
            <iframe
              src="/map?embed=true"
              className="phone-screen-iframe"
              allow="geolocation"
              title="Relax Maps App Screen"
            />
          </div>
        </div>
      </main>

      <div className="landing-bottom-cta">
        <Link className="landing-cta" to="/map">
          Open map →
        </Link>
      </div>

      <footer className="landing-foot">
        Melbourne CBD · Pedestrian Sensors · Open Data
      </footer>
    </div>
  );
}



