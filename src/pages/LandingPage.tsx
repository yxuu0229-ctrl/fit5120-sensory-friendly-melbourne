import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <main className="landing">
      <div className="landing-wash" aria-hidden="true" />
      <header className="landing-top">
        <p className="brand">Relax Maps</p>
      </header>
      <section className="landing-hero">
        <h1>Quiet paths through the city</h1>
        <p>
          Plan walking routes that respect your sensory limits — crowd density,
          calmer corridors, and nearby places to reset.
        </p>
        <Link className="btn btn-primary landing-cta" to="/map">
          Open map
        </Link>
      </section>
      <footer className="landing-foot">
        Melbourne CBD · pedestrian sensors · open data
      </footer>
    </main>
  );
}
