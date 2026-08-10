"use client";

import dynamic from "next/dynamic";

const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <main style={{ padding: "2rem" }}>
      <p>Loading map…</p>
    </main>
  ),
});

export default function MapPageClient() {
  return <RouteMap />;
}
