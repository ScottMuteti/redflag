/* eslint-disable react/prop-types -- presentational primitive */
import { ShieldCheck } from 'lucide-react';

// Required before any launch or schedule; the server rejects launches without it
// and records who confirmed and when.
export const AUTHORISATION_TEXT =
  'I confirm every recipient is an enrolled employee of this organisation, and I am authorised to run this simulation on them.';

function AuthorisationCheck({ checked, onChange, error }) {
  return (
    <div className="grid gap-1">
      <label className="flex cursor-pointer items-start gap-2 rounded-control border border-line bg-page p-3 text-body text-ink-2">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 rounded border-line"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'authorisation-error' : undefined}
        />
        <span>
          <ShieldCheck size={14} className="mr-1 inline text-brand-700" aria-hidden="true" />
          {AUTHORISATION_TEXT}
        </span>
      </label>
      {error && (
        <p id="authorisation-error" role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default AuthorisationCheck;
