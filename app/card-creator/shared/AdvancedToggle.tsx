/** Shared "Advanced options" switch. The form stays the same; advanced mode only reveals extra fields. */
export default function AdvancedToggle({ checked, onChange, classes }: {
  checked: boolean; onChange: (value: boolean) => void; classes: Record<string, string>;
}) {
  return <label className={classes.advancedToggle}>
    <input type="checkbox" role="switch" checked={checked} onChange={event => onChange(event.target.checked)} />
    <span>Advanced options <small>· show more fields</small></span>
  </label>;
}

/** End-of-form hint so people who scroll past the top switch can still find advanced fields. */
export function AdvancedHint({ advanced, onChange, examples, classes }: {
  advanced: boolean; onChange: (value: boolean) => void; examples: string; classes: Record<string, string>;
}) {
  return <div className={classes.advancedHint} role="status">
    <span>{advanced ? 'Advanced fields are now showing throughout the form.' : `Looking for ${examples}? Show advanced options.`}</span>
    <button type="button" onClick={() => onChange(!advanced)}>{advanced ? 'Hide advanced options' : 'Show advanced options'}</button>
  </div>;
}
