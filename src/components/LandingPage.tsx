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

      <footer className="landing-footer">
        <div className="download-badges">
          <a
            href="https://www.apple.com/app-store/"
            target="_blank"
            rel="noopener noreferrer"
            className="download-btn"
            aria-label="Download Relax Maps on the App Store"
          >
            <div className="badge-icon">
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="currentColor"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z" />
              </svg>
            </div>
            <div className="badge-text">
              <span className="badge-sub">Download on the</span>
              <span className="badge-main">App Store</span>
            </div>
          </a>

          <span className="badge-separator">|</span>

          <a
            href="https://play.google.com/store"
            target="_blank"
            rel="noopener noreferrer"
            className="download-btn"
            aria-label="Get Relax Maps on Google Play"
          >
            <div className="badge-icon">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path
                  d="M3.25 2.25c-.17.17-.25.45-.25.83v17.84c0 .38.08.66.25.83l.08.08 10.02-10.02v-.2L3.33 2.17l-.08.08z"
                  fill="#3bccff"
                />
                <path
                  d="M17.65 18.09l-4.32-4.32v-.2l4.32-4.32.09.05 5.11 2.9c1.46.83 1.46 2.18 0 3.01l-5.11 2.9-.09-.02z"
                  fill="#fccd00"
                />
                <path
                  d="M13.41 13.67l-3.33-3.33L3.25 20.92c.56.59 1.48.66 2.51.08l10.89-6.19-3.24-1.14z"
                  fill="#ff3a44"
                />
                <path
                  d="M13.41 10.33l3.24-3.24L5.76 2.9c-1.03-.58-1.95-.51-2.51.08l6.83 7.69 3.33-.34z"
                  fill="#00e676"
                />
              </svg>
            </div>
            <div className="badge-text">
              <span className="badge-sub">GET IT ON</span>
              <span className="badge-main">Google Play</span>
            </div>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
