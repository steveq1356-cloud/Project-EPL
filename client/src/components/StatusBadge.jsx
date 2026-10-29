export const statusClass = (status) => `status-${status.toLowerCase().replace(/\s+/g, '-')}`;

export default function StatusBadge({ status, solid = false }) {
  return <span className={`status ${statusClass(status)} ${solid ? 'solid' : ''}`}>{status}</span>;
}
