import { Check } from 'lucide-react';
import { ACCENTS, THEMES } from '../hooks/useTheme.js';
import Modal from './Modal.jsx';

// Appearance settings: theme, accent color, density, celebrations.
export default function SettingsDialog({ appearance, update, onClose }) {
  return (
    <Modal title="Settings" onClose={onClose} className="settings-modal">
      <div className="settings">
        <section>
          <h3>Theme</h3>
          <div className="theme-grid" role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => (
              <button key={t.id} role="radio" aria-checked={appearance.theme === t.id} className={`theme-card ${appearance.theme === t.id ? 'selected' : ''}`} onClick={() => update({ theme: t.id })}>
                <span className={`theme-preview preview-${t.id}`} style={{ '--p-bg': t.swatch[0], '--p-surface': t.swatch[1] }} aria-hidden>
                  <span className="pv-side" />
                  <span className="pv-card" />
                  <span className="pv-card short" />
                </span>
                <strong>{t.label}</strong>
                <span className="muted small">{t.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>Accent color</h3>
          <div className="accent-row" role="radiogroup" aria-label="Accent color">
            {Object.entries(ACCENTS).map(([name, pair]) => (
              <button
                key={name}
                role="radio"
                aria-checked={appearance.accent === name}
                className={`swatch accent-swatch ${name === 'default' ? 'default' : ''}`}
                style={pair ? { '--swatch': pair[0] } : undefined}
                title={name === 'default' ? 'Theme default' : name}
                onClick={() => update({ accent: name })}
              >
                {appearance.accent === name && <Check size={14} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-toggles">
          <label className="toggle-row">
            <span>
              <strong>Compact layout</strong>
              <span className="muted small">Tighter spacing, so more fits on screen</span>
            </span>
            <input type="checkbox" className="switch" checked={appearance.density === 'compact'} onChange={(e) => update({ density: e.target.checked ? 'compact' : 'comfortable' })} />
          </label>
          <label className="toggle-row">
            <span>
              <strong>Celebrations</strong>
              <span className="muted small">Confetti when you finish every task or log a milestone</span>
            </span>
            <input type="checkbox" className="switch" checked={appearance.celebrations} onChange={(e) => update({ celebrations: e.target.checked })} />
          </label>
        </section>

        <p className="muted small">These are saved in this browser. Your projects are not affected.</p>
      </div>
    </Modal>
  );
}
