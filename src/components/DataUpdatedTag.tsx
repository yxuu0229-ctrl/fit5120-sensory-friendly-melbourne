export default function DataUpdatedTag({
  label,
}: {
  label: string | null;
}) {
  if (!label) return null;
  return <p className="data-updated-tag">Data updated {label}</p>;
}
