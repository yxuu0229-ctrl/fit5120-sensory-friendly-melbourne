import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import MapPage from "./pages/MapPage";

export default function App() {
  useEffect(() => {
    const isEmbedded =
      typeof window !== "undefined" &&
      (window.location.search.includes("embed=true") || window.self !== window.top);

    if (isEmbedded) {
      document.body.classList.add("embedded");
    } else {
      document.body.classList.remove("embedded");
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

