export default function NearestRefugeButton({
  disabled,
  active,
  compact,
  onClick,
}: {
  disabled: boolean;
  active?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn btn-refuge${active ? " is-active" : ""}${
        compact ? " is-compact" : ""
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="btn-refuge-icon" aria-hidden="true">
        ◈
      </span>
      <span className="btn-refuge-copy">
        <strong>Nearest refuge</strong>
        <small>
          {compact ? "Go to closest calm spot" : "Route to closest calm spot"}
        </small>
      </span>
    </button>
  );
}
