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
      <button type="button" className="btn btn-stop" onClick={onStop}>
        Stop navigation · {progress}%
      </button>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-go"
      disabled={disabled}
      onClick={onGo}
    >
      Go
    </button>
  );
}
