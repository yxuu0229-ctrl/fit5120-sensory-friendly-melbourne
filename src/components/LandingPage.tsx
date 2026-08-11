import React, { useState, useEffect, useRef } from "react";

function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const baseWidth = 1301;
      const baseHeight = 885;

      // Scale to fit the viewport width and height with padding for header and footer overlays
      const scaleX = (vw - 40) / baseWidth;
      const scaleY = (vh - 180) / baseHeight;
      const newScale = Math.max(0.2, Math.min(scaleX, scaleY));

      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <h1 className="hero-text">
          <span className="hero-bold">Relax Maps,</span> The Calm and Composed Way to Navigate Your City
        </h1>
      </header>

      <main className="landing-main">
        <div
          ref={containerRef}
          className="mockup-container"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            position: "absolute",
          }}
        >
          <img
            src="/images/mockup.png"
            className="mockup-image"
            alt="Relax Maps Interactive Phone Mockup"
          />

          <div className="hint-container">
            <p className="hint-text">you can use the app through this mockup</p>
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
              src="/?embed=true"
              className="phone-screen-iframe"
              allow="geolocation"
              title="Relax Maps App Screen"
            />
          </div>
        </div>
      </main>

    </div>
  );
}

export default LandingPage;
