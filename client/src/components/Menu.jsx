import { MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// A small dropdown: `items` are { label, icon, onClick, href, download, danger, disabled }, 'divider', or null.
export default function Menu({ label, title = 'More', items, align = 'right', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const content = (item) => (
    <>
      {item.icon && <item.icon size={15} strokeWidth={1.75} aria-hidden />}
      {item.label}
    </>
  );

  return (
    <div className={`menu ${className}`} ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} title={title} aria-label={title}>
        {label ?? <MoreHorizontal size={17} />}
      </button>
      {open && (
        <div className={`menu-list align-${align}`} role="menu">
          {items.filter(Boolean).map((item, i) =>
            item === 'divider' ? (
              <hr key={i} />
            ) : item.href ? (
              <a key={i} role="menuitem" href={item.href} download={item.download} className={item.danger ? 'danger' : ''} onClick={() => setOpen(false)}>
                {content(item)}
              </a>
            ) : (
              <button
                key={i}
                role="menuitem"
                disabled={item.disabled}
                className={item.danger ? 'danger' : ''}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {content(item)}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
