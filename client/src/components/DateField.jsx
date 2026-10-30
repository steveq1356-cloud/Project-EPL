import { shortDate } from '../utils/format.js';

// A date shown as text ("Oct 3") that opens the native picker on click.
export default function DateField({ value, onChange, placeholder = 'Set date', label }) {
  return (
    <label className={`date-field ${value ? '' : 'empty'}`} title={label}>
      <span>{value ? shortDate(value) : placeholder}</span>
      <input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)} aria-label={label} />
    </label>
  );
}
