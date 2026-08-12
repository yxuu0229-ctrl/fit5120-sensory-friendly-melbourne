export default function NearestRefugeButton({
  disabled,
  active,
  onClick,
}: {
  disabled: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn btn-refuge${active ? " is-active" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="btn-refuge-icon" aria-hidden="true">
        ◈
      </span>
      <span className="btn-refuge-copy">
        <strong>Nearest refuge</strong>
        <small>3 calm options nearby</small>
      </span>
    </button>
  );
}
