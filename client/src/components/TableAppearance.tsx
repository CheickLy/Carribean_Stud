import type { TableTheme } from './useTablePreferences';
import '../styles/TableTheme.css';

export default function TableAppearance({ theme, onChange }: { theme: TableTheme; onChange: (theme: TableTheme) => void }) {
  return <fieldset className="table-appearance"><legend>Appearance</legend>{(['light', 'dark'] as const).map(mode =>
    <label key={mode}><input type="radio" name="table-appearance" value={mode} checked={theme === mode} onChange={() => onChange(mode)} />{mode === 'light' ? 'Light' : 'Dark'}</label>
  )}</fieldset>;
}
