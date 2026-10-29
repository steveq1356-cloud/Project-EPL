export const statusClass = (status) => `status-${status.toLowerCase().replace(/\s+/g, '-')}`;

export default function StatusBadge({ status }) {
  return <span className={`status ${statusClass(status)}`}>{status}</span>;
}
