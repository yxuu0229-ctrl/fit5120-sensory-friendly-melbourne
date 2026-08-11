import { useEffect, useState } from "react";
import { getSupabase, hasSupabaseEnv } from "../lib/supabase";
import type { Place, SensorDensityCurrent, SyncRun } from "../lib/types";

const TABLES = [
  "sensors",
  "sensor_density_current",
  "pedestrian_live",
  "quiet_windows",
  "places",
  "sync_runs",
] as const;

type TableName = (typeof TABLES)[number];

type StatusData = {
  counts: Record<TableName, number | null>;
  lastSync: SyncRun | null;
  densitySample: SensorDensityCurrent[];
  placesSample: Place[];
};

async function countTable(table: string): Promise<number | null> {
  const { count, error } = await getSupabase()
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(`count ${table}:`, error.message);
    return null;
  }
  return count ?? 0;
}

async function loadStatus(): Promise<StatusData> {
  const supabase = getSupabase();

  const countsEntries = await Promise.all(
    TABLES.map(async (name) => [name, await countTable(name)] as const)
  );
  const counts = Object.fromEntries(countsEntries) as Record<
    TableName,
    number | null
  >;

  const [{ data: lastSync }, { data: densitySample }, { data: placesSample }] =
    await Promise.all([
      supabase
        .from("sync_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sensor_density_current")
        .select("*")
        .order("total_count", { ascending: false })
        .limit(8),
      supabase
        .from("places")
        .select("*")
        .eq("is_sensory_refuge", true)
        .limit(8),
    ]);

  return {
    counts,
    lastSync: (lastSync as SyncRun | null) ?? null,
    densitySample: (densitySample || []) as SensorDensityCurrent[],
    placesSample: (placesSample || []) as Place[],
  };
}

export default function DataStatusPage() {
  const configured = hasSupabaseEnv();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    loadStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load status");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  if (!configured) {
    return (
      <main className="data-status">
        <h1>Melbourne Sensory Map — Data Status</h1>
        <p className="lead">
          Backend smoke-test page for verifying Supabase data.
        </p>
        <div className="banner">
          Missing <code>VITE_SUPABASE_URL</code> or{" "}
          <code>VITE_SUPABASE_ANON_KEY</code>. Copy <code>.env.example</code> to{" "}
          <code>.env.local</code> and restart the dev server.
        </div>
      </main>
    );
  }

  return (
    <main className="data-status">
      <h1>Melbourne Sensory Map — Data Status</h1>
      <p className="lead">
        Backend smoke-test page. Tables for the live map:{" "}
        <code>sensor_density_current</code>, <code>places</code>,{" "}
        <code>quiet_windows</code>, <code>sensors</code>.
      </p>

      {error && <div className="banner">{error}</div>}
      {!status && !error && <p className="meta">Loading…</p>}

      {status && (
        <>
          <section>
            <h2>Row counts</h2>
            <div className="status-grid">
              {TABLES.map((name) => (
                <div className="status-card" key={name}>
                  <span className="label">{name}</span>
                  <span className="value">
                    {status.counts[name] === null ? "—" : status.counts[name]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Last sync run</h2>
            {status.lastSync ? (
              <pre>{JSON.stringify(status.lastSync, null, 2)}</pre>
            ) : (
              <p className="meta">
                No sync runs yet. Apply the migration, set secrets, then run{" "}
                <code>npm run sync:full</code> or the GitHub Action.
              </p>
            )}
          </section>

          <section>
            <h2>Sample sensor density (busiest)</h2>
            {status.densitySample.length === 0 ? (
              <p className="meta">No rows in sensor_density_current yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Count</th>
                    <th>Density</th>
                    <th>Lat</th>
                    <th>Lng</th>
                  </tr>
                </thead>
                <tbody>
                  {status.densitySample.map((row) => (
                    <tr key={row.location_id}>
                      <td>{row.location_id}</td>
                      <td>{row.sensor_name || "—"}</td>
                      <td>{row.total_count}</td>
                      <td className={`density-${row.density_level}`}>
                        {row.density_level}
                      </td>
                      <td>{row.latitude.toFixed(5)}</td>
                      <td>{row.longitude.toFixed(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2>Sample sensory refuges</h2>
            {status.placesSample.length === 0 ? (
              <p className="meta">
                No sensory refuge places yet. Run a full sync (
                <code>--full</code>).
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Source</th>
                    <th>Lat</th>
                    <th>Lng</th>
                  </tr>
                </thead>
                <tbody>
                  {status.placesSample.map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td>{row.category || "—"}</td>
                      <td>{row.source}</td>
                      <td>{row.latitude.toFixed(5)}</td>
                      <td>{row.longitude.toFixed(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <footer>
            Data: City of Melbourne Open Data (CC BY). This page is a developer
            status shell only — not the final map UI.
          </footer>
        </>
      )}
    </main>
  );
}
