export default function GoButton({
  navigating,
  onGo,
  onStop,
  progress,
}: {
  disabled?: boolean;
  navigating: boolean;
  onGo: () => void;
  onStop: () => void;
  progress: number;
}) {
  if (navigating) {
    return (
      <button type="button" className="btn btn-stop" onClick={onStop}>
        Stop navigation · {progress}%
      </button>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-go"
      onClick={onGo}
      title="Recenter to CBD"
    >
      🎯 Recenter
    </button>
  );
}

