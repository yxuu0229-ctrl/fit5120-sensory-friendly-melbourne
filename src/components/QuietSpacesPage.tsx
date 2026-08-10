import type { LatLng } from "../lib/geo";
import type { NearbyRefuge, RefugeSearchMode } from "../lib/refuge";
import type { RouteEndpoints } from "./mapShared";
import RefugeMap from "./RefugeMap";

export const refugePageSize = 4;

function QuietSpacesPage({
  refugeSearchMode,
  currentLocation,
  usingDefaultReference,
  nearbyRefuges,
  refugePage,
  onRefugePageChange,
  selectedRefugeId,
  onSelectRefuge,
  selectedRoutePath,
  routeEndpoints,
  onSearchByCurrentLocation,
  onSearchByRoute,
  onBackToJourney,
  onViewDetail,
}: {
  refugeSearchMode: RefugeSearchMode;
  currentLocation: LatLng | null;
  /** AC 2.1.6 — location declined; distances use the documented default point. */
  usingDefaultReference: boolean;
  nearbyRefuges: NearbyRefuge[];
  refugePage: number;
  onRefugePageChange: (page: number) => void;
  selectedRefugeId: string;
  onSelectRefuge: (id: string) => void;
  selectedRoutePath: [number, number][];
  routeEndpoints: RouteEndpoints | null;
  onSearchByCurrentLocation: () => void;
  onSearchByRoute: () => void;
  onBackToJourney: () => void;
  onViewDetail: () => void;
}) {
  const totalRefugePages = Math.max(1, Math.ceil(nearbyRefuges.length / refugePageSize));
  const visibleRefuges = nearbyRefuges.slice(
    (refugePage - 1) * refugePageSize,
    refugePage * refugePageSize
  );

  return (
    <main className="quiet-page">
      <section className="intro quiet-intro" aria-labelledby="quiet-title">
        <h1 id="quiet-title">Nearby sensory refuge locations</h1>
        <p>
          Find parks, libraries and quiet public spaces on demand. Quietness is not guaranteed
          when data is unavailable.
        </p>
      </section>

      <section className="quiet-layout">
        <aside className="refuge-list" aria-label="Nearby sensory refuge options">
          <h2>Nearby options</h2>

          <div className="refuge-search-actions">
            <button
              className={refugeSearchMode === "current" ? "refuge-search-active" : ""}
              onClick={onSearchByCurrentLocation}
              type="button"
            >
              Use current location
            </button>
            <button
              className={refugeSearchMode === "route" ? "refuge-search-active" : ""}
              disabled={selectedRoutePath.length < 2}
              onClick={onSearchByRoute}
              type="button"
            >
              Search near route
            </button>
          </div>

          {refugeSearchMode === "current" && !currentLocation && usingDefaultReference && (
            <p className="backend-note" role="status">
              Location was not allowed — distances are measured from Melbourne CBD centre,
              the documented default reference point.
            </p>
          )}
          {refugeSearchMode === "current" && !currentLocation && !usingDefaultReference && (
            <p className="backend-note">Allow location access to find quiet spaces within 1km.</p>
          )}
          {refugeSearchMode === "current" && (currentLocation || usingDefaultReference) && nearbyRefuges.length === 0 && (
            <p className="backend-note">
              No tagged quiet spaces found within 1km of{" "}
              {usingDefaultReference ? "Melbourne CBD centre" : "your current location"}.
            </p>
          )}
          {refugeSearchMode === "route" && selectedRoutePath.length < 2 && (
            <p className="backend-note">Select a route before searching for quiet spaces near it.</p>
          )}
          {refugeSearchMode === "route" && selectedRoutePath.length > 1 && nearbyRefuges.length === 0 && (
            <p className="backend-note">No tagged quiet spaces found within 1km of the selected route.</p>
          )}

          {visibleRefuges.map((refuge, index) => (
            <article
              className={
                refuge.id === selectedRefugeId
                  ? "refuge-card refuge-card-selected"
                  : "refuge-card"
              }
              key={refuge.id}
              onClick={() => onSelectRefuge(refuge.id)}
            >
              <div className="refuge-card-header">
                <span className="refuge-marker">
                  {(refugePage - 1) * refugePageSize + index + 1}
                </span>
                <h3>{refuge.name}</h3>
                <span>{refuge.category ?? refuge.source}</span>
              </div>
              <div className="refuge-metrics">
                <div>
                  <span>{refugeSearchMode === "route" ? "From route" : "Distance"}</span>
                  <strong>{Math.round(refuge.distanceMeters)}m</strong>
                </div>
                <div><span>Source</span><strong>{refuge.source}</strong></div>
                <div><span>Data</span><strong>Tagged</strong></div>
              </div>
              <p>{refuge.theme ?? refuge.sub_theme ?? "Quietness is tagged, not guaranteed."}</p>
            </article>
          ))}

          {nearbyRefuges.length > refugePageSize && (
            <div className="refuge-pagination" aria-label="Quiet space result pages">
              <button
                className="secondary-button"
                disabled={refugePage === 1}
                onClick={() => onRefugePageChange(Math.max(1, refugePage - 1))}
                type="button"
              >
                Previous
              </button>
              <span>
                Page {refugePage} of {totalRefugePages}
              </span>
              <button
                className="secondary-button"
                disabled={refugePage === totalRefugePages}
                onClick={() => onRefugePageChange(Math.min(totalRefugePages, refugePage + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          )}
        </aside>

        <section className="refuge-map-panel" aria-labelledby="refuge-map-title">
          <h2 id="refuge-map-title">Refuge map</h2>
          <RefugeMap
            currentLocation={currentLocation}
            endpoints={routeEndpoints}
            focusMode={refugeSearchMode}
            onSelectRefuge={onSelectRefuge}
            refuges={nearbyRefuges}
            routePath={selectedRoutePath}
            selectedRefugeId={selectedRefugeId}
          />
          <div className="refuge-actions">
            <button className="secondary-button" onClick={onBackToJourney} type="button">
              Back to Journey
            </button>
            <button disabled={!nearbyRefuges.length} onClick={onViewDetail} type="button">View detail</button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default QuietSpacesPage;
