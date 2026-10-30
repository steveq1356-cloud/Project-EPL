// A friendly empty section: an icon, one line of encouragement, and the next step.
export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty-block">
      {Icon && (
        <span className="empty-icon" aria-hidden>
          <Icon size={20} strokeWidth={1.75} />
        </span>
      )}
      <div className="empty-text">
        <strong>{title}</strong>
        {children && <span>{children}</span>}
      </div>
      {action}
    </div>
  );
}
