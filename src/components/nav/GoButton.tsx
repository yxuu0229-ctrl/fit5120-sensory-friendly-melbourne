export default function GoButton({
  disabled,
  navigating,
  onGo,
  onStop,
  progress,
}: {
  disabled: boolean;
  navigating: boolean;
  onGo: () => void;
  onStop: () => void;
  progress: number;
}) {
  if (navigating) {
    return (
      <div className="go-stack">
        <button type="button" className="btn btn-primary" onClick={onStop}>
          End navigation
        </button>
        <p className="muted">Progress {progress}%</p>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={disabled}
      onClick={onGo}
    >
      Go
    </button>
  );
}
