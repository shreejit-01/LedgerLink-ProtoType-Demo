import { useState } from 'react';
import { getRequests } from '../../lib/storage';

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatPeriod = (period) => {
  if (!period) return 'N/A';
  // Accept ISO date string, "YYYY-MM", or plain label and make it readable
  const d = new Date(period);
  if (!isNaN(d)) {
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  return period;
};

// ─── Single pending-request card ───────────────────────────────────────────────
function PendingCard({ request, onUploadClick }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 shadow-lg shadow-amber-950/20">
      {/* icon */}
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-xl">
        📋
      </div>

      {/* text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-300">
          Document upload requested
        </p>
        <p className="mt-0.5 text-xs text-amber-400/80">
          Your CA has requested bank statements or invoices for&nbsp;
          <span className="font-medium text-amber-300">{formatPeriod(request.period)}</span>.
          Please upload the relevant files to proceed with your filing.
        </p>
        <p className="mt-1 text-[11px] text-amber-500/60">
          Request ID&nbsp;·&nbsp;<span className="font-mono">{request.id}</span>
        </p>
      </div>

      {/* action */}
      <button
        onClick={() => onUploadClick(request)}
        className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-amber-950 transition hover:bg-amber-400 active:scale-95"
      >
        Upload now →
      </button>
    </div>
  );
}

// ─── RequestBanner ────────────────────────────────────────────────────────────

/**
 * Shows a prominent banner for every pending CA request belonging to the
 * logged-in MSME user.
 *
 * Props:
 *   session         {{ id, role, email, name }}
 *   onUploadClick   {(request) => void}  – called when user clicks "Upload now"
 */
export default function RequestBanner({ session, onUploadClick }) {
  // Re-read on every render so status changes (upload → uploaded) are reflected
  const [dismissed, setDismissed] = useState([]);

  const pending = getRequests(
    (r) => r.clientId === session.id && r.status === 'pending'
  ).filter((r) => !dismissed.includes(r.id));

  if (pending.length === 0) return null;

  return (
    <section className="space-y-3 px-6 pb-2 pt-5">
      {/* section label */}
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">
          Action Required · {pending.length} pending request{pending.length > 1 ? 's' : ''}
        </p>
      </div>

      {pending.map((req) => (
        <div key={req.id} className="relative">
          <PendingCard request={req} onUploadClick={onUploadClick} />
          {/* dismiss (hides locally, does NOT change storage status) */}
          <button
            onClick={() => setDismissed((d) => [...d, req.id])}
            className="absolute right-2 top-2 rounded-full p-1 text-amber-500/50 transition hover:text-amber-400"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </section>
  );
}
