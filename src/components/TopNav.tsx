const navItems = ["Plan journey", "Route options", "Journey monitor", "Quiet spaces", "Live map"];

export type Page =
  | "plan"
  | "routes"
  | "warning"
  | "confirm"
  | "monitor"
  | "predictive"
  | "quiet"
  | "refugeDetail"
  | "livemap"
  | "datastatus";

function TopNav({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  return (
    <header className="top-nav" aria-label="Primary navigation">
      <a className="brand" href="/" aria-label="Relax Maps home">
        Relax Maps
      </a>
      <nav className="nav-links">
        {navItems.map((item) => (
          <button
            className={
              (page === "plan" && item === "Plan journey") ||
              ((page === "routes" || page === "warning" || page === "confirm") &&
                item === "Route options") ||
              ((page === "monitor" || page === "predictive") && item === "Journey monitor") ||
              ((page === "quiet" || page === "refugeDetail") && item === "Quiet spaces") ||
              ((page === "livemap" || page === "datastatus") && item === "Live map")
                ? "nav-link nav-link-active"
                : "nav-link"
            }
            key={item}
            onClick={() => {
              if (item === "Plan journey") onNavigate("plan");
              if (item === "Route options") onNavigate("routes");
              if (item === "Journey monitor") onNavigate("monitor");
              if (item === "Quiet spaces") onNavigate("quiet");
              if (item === "Live map") onNavigate("livemap");
            }}
            type="button"
          >
            {item}
          </button>
        ))}
      </nav>
    </header>
  );
}

export default TopNav;
