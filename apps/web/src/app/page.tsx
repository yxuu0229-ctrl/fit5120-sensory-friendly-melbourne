import { getSupabase, hasSupabaseEnv } from "@/lib/supabase";
import type { Place, SensorDensityCurrent, SyncRun } from "@/lib/types";

export const dynamic = "force-dynamic";

async function countTable(table: string): Promise<number | null> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(`count ${table}:`, error.message);
    return null;
  }
  return count ?? 0;
}

export default async function HomePage() {
  if (!hasSupabaseEnv()) {
    return (
      <main>
        <h1>Melbourne Sensory Map — Data Status</h1>
        <p className="lead">
          Minimal shell for verifying Supabase backend data. Full map UI is
          built separately.
        </p>
        <div className="banner">
          Missing <code>NEXT_PUBLIC_SUPABASE_URL</code> or{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Copy{" "}
          <code>.env.example</code> to <code>apps/web/.env.local</code> and
          restart the dev server.
        </div>
      </main>
    );
  }

  const tables = [
    "sensors",
    "sensor_density_current",
    "pedestrian_live",
    "quiet_windows",
    "places",
    "sync_runs",
  ] as const;

  const countsEntries = await Promise.all(
    tables.map(async (name) => [name, await countTable(name)] as const)
  );
  const counts = Object.fromEntries(countsEntries) as Record<
    (typeof tables)[number],
    number | null
  >;

  const supabase = getSupabase();

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

  const sync = lastSync as SyncRun | null;
  const density = (densitySample || []) as SensorDensityCurrent[];
  const places = (placesSample || []) as Place[];

  return (
    <main>
      <h1>Melbourne Sensory Map — Data Status</h1>
      <p className="lead">
        Backend smoke-test page. Open the{" "}
        <a href="/map">
          <strong>quieter walking map</strong>
        </a>{" "}
        for A→B routing. Tables for the map UI:{" "}
        <code>sensor_density_current</code>, <code>places</code>,{" "}
        <code>quiet_windows</code>, <code>sensors</code>.
      </p>

      <section>
        <h2>Row counts</h2>
        <div className="grid">
          {tables.map((name) => (
            <div className="card" key={name}>
              <span className="label">{name}</span>
              <span className="value">
                {counts[name] === null ? "—" : counts[name]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Last sync run</h2>
        {sync ? (
          <pre>{JSON.stringify(sync, null, 2)}</pre>
        ) : (
          <p className="meta">
            No sync runs yet. Apply the migration, set secrets, then run{" "}
            <code>npm run sync:full</code> or the GitHub Action.
          </p>
        )}
      </section>

      <section>
        <h2>Sample sensor density (busiest)</h2>
        {density.length === 0 ? (
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
              {density.map((row) => (
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
        {places.length === 0 ? (
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
              {places.map((row) => (
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
    </main>
  );
}
