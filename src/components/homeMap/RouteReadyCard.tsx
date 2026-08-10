interface RouteReadyCardProps {
  routeDetails: { distance: string; duration: string };
  onStart: () => void;
}

// "Calmer route ready" overlay shown in non-navigate modes once a route is planned
export default function RouteReadyCard({ routeDetails, onStart }: RouteReadyCardProps) {
  return (
    <div className="routing-card-overlay">
      <div className="routing-info">
        <div className="routing-headline">Calmer route ready</div>
        <div className="routing-stats">
          <span>{routeDetails.duration}</span>
          <span className="dot-sep">&bull;</span>
          <span>{routeDetails.distance}</span>
        </div>
      </div>
      <button className="start-journey-btn" onClick={onStart}>
        Start
      </button>
    </div>
  );
}
