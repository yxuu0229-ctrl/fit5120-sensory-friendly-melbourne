export default function NearestRefugeButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={disabled}
      onClick={onClick}
    >
      Nearest refuge
    </button>
  );
}
