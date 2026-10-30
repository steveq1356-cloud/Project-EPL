import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { colorName, PROJECT_COLORS } from '../utils/projectColor.js';

// Pick the project's accent color from a small palette.
export default function ColorPicker({ project, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = colorName(project);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className="color-picker" ref={ref}>
      <button className="color-trigger" style={{ '--swatch': PROJECT_COLORS[current] }} onClick={() => setOpen((o) => !o)} title="Project color" aria-label="Project color" aria-expanded={open} />
      {open && (
        <div className="color-pop" role="listbox" aria-label="Project color">
          {Object.entries(PROJECT_COLORS).map(([name, hex]) => (
            <button
              key={name}
              role="option"
              aria-selected={current === name}
              className="swatch"
              style={{ '--swatch': hex }}
              title={name}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
            >
              {current === name && <Check size={13} strokeWidth={3} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
