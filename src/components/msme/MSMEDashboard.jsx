import { useState, useMemo } from 'react';
import RequestBanner from './RequestBanner';
import DocumentUpload from './DocumentUpload';
import { getRequests, getTransactions, getUsers, saveUser } from '../../lib/storage';
import { CATEGORIES } from '../../lib/categories';

// ─── Top bar ──────────────────────────────────────────────────────────────────
function TopBar({ session, onLogout }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-xs font-black text-white">
          LL
        </span>
        <span className="text-sm font-semibold tracking-tight text-white">LedgerLink</span>
        <span className="ml-1 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-400">
          Business Portal
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs font-medium text-slate-200">{session.name}</p>
          <p className="text-[11px] text-slate-500">{session.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-500 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

// ─── Summary stat ─────────────────────────────────────────────────────────────
function StatCard({ emoji, label, value, sub, accent = 'text-white' }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl">
        {emoji}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`mt-0.5 text-2xl font-bold ${accent}`}>{value}</p>
        {sub && <p className="mt-0.5 text-[11px] text-slate-600">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Connect to CA ────────────────────────────────────────────────────────────
function ConnectCA({ session, onRefresh }) {
  const [caEmail, setCaEmail] = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // Find current CA connection
  const currentUser = getUsers().find((u) => u.id === session.id);
  const linkedCAEmail = currentUser?.caEmail;
  const linkedCA = linkedCAEmail
    ? getUsers().find((u) => u.email === linkedCAEmail && u.role === 'ca')
    : null;

  const handleConnect = () => {
    setError('');
    setSuccess('');
    const email = caEmail.trim().toLowerCase();

    if (!email) {
      setError('Please enter your CA\'s email address.');
      return;
    }

    // Look up CA by email
    const ca = getUsers().find((u) => u.email === email && u.role === 'ca');
    if (!ca) {
      setError('No CA found with that email. Make sure they have registered on LedgerLink.');
      return;
    }

    // Save connection on MSME user
    saveUser({ ...currentUser, caEmail: email });
    setCaEmail('');
    setSuccess(`Connected to ${ca.name} (${ca.firmName || ca.email})`);
    onRefresh();
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDisconnect = () => {
    saveUser({ ...currentUser, caEmail: null });
    onRefresh();
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      {linkedCA ? (
        /* Connected state */
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-lg">
              🤝
            </div>
            <div>
              <p className="text-sm font-medium text-white">{linkedCA.name}</p>
              <p className="text-xs text-slate-400">
                {linkedCA.firmName || linkedCA.email}
                {linkedCA.caNumber && (
                  <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                    CA#{linkedCA.caNumber}
                  </span>
                )}
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
              Connected
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-rose-500/50 hover:text-rose-400"
          >
            Disconnect
          </button>
        </div>
      ) : (
        /* Unconnected state */
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-lg">
              🔗
            </div>
            <div>
              <p className="text-sm font-medium text-white">Connect to your CA</p>
              <p className="text-xs text-slate-400">
                Enter your Chartered Accountant's email to link your account
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="email"
              value={caEmail}
              onChange={(e) => setCaEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              placeholder="ca@example.com"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
            />
            <button
              onClick={handleConnect}
              className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 active:scale-95"
            >
              Connect
            </button>
          </div>

          {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
          {success && <p className="mt-2 text-xs text-emerald-400">{success}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Payment type badge ───────────────────────────────────────────────────────
const PAYMENT_COLORS = {
  UPI:    'bg-violet-500/15 text-violet-400',
  NEFT:   'bg-blue-500/15 text-blue-400',
  RTGS:   'bg-blue-500/15 text-blue-400',
  IMPS:   'bg-cyan-500/15 text-cyan-400',
  Card:   'bg-orange-500/15 text-orange-400',
  Cash:   'bg-green-500/15 text-green-400',
  ACH:    'bg-teal-500/15 text-teal-400',
  Cheque: 'bg-amber-500/15 text-amber-400',
  Other:  'bg-slate-500/15 text-slate-400',
};

function PaymentTypeBadge({ type }) {
  const t = type || 'Other';
  const color = PAYMENT_COLORS[t] || PAYMENT_COLORS.Other;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}>
      {t}
    </span>
  );
}

// ─── AI / Edited badge ────────────────────────────────────────────────────────
function SourceBadge({ overridden }) {
  if (overridden) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
        ✏️ Edited
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
      🤖 AI
    </span>
  );
}

// ─── Deduplication ────────────────────────────────────────────────────────────
function deduplicateTransactions(transactions) {
  const map = new Map();
  const result = [];
  for (const tx of transactions) {
    const key = `${tx.date}|${tx.amount}|${(tx.description || '').toLowerCase().trim()}`;
    if (map.has(key)) {
      map.get(key).count += 1;
    } else {
      const entry = { tx, count: 1 };
      map.set(key, entry);
      result.push(entry);
    }
  }
  return result;
}

// ─── Transaction list ─────────────────────────────────────────────────────────
function MyTransactions({ session, refreshKey }) {
  const transactions = useMemo(() => {
    return getTransactions((tx) => tx.clientId === session.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, refreshKey]);

  const dedupedRows = useMemo(() => deduplicateTransactions(transactions), [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-10 text-center">
        <div className="mb-3 text-3xl">📄</div>
        <p className="text-sm font-medium text-slate-400">No transactions yet</p>
        <p className="mt-1 text-xs text-slate-600">Upload a bank statement or invoice to get started.</p>
      </div>
    );
  }

  // Summary
  const totalDebit  = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);
  const totalCredit = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);
  const aiCount     = transactions.filter((t) => !t.overridden).length;
  const editedCount = transactions.filter((t) => t.overridden).length;

  const fmt = (n) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-3 text-xs">
        <span className="text-slate-500">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </span>
        {dedupedRows.length < transactions.length && (
          <span className="text-amber-400">
            ({transactions.length - dedupedRows.length} dupe{transactions.length - dedupedRows.length !== 1 ? 's' : ''} merged)
          </span>
        )}
        <span className="text-emerald-400">↑ {fmt(totalCredit)} in</span>
        <span className="text-rose-400">↓ {fmt(totalDebit)} out</span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-indigo-400">🤖</span>{aiCount}
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-400">✏️</span>{editedCount}
        </span>
        <span className="ml-auto font-semibold text-white">
          Net: <span className={totalCredit - totalDebit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {fmt(Math.abs(totalCredit - totalDebit))} {totalCredit - totalDebit >= 0 ? 'surplus' : 'deficit'}
          </span>
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10">
              <tr>
                {['Date', 'Description', 'Payment', 'Category', 'Amount', 'Source'].map((col) => (
                  <th
                    key={col}
                    className="border-b border-slate-800 bg-slate-900 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dedupedRows.map(({ tx, count }, idx) => (
                <tr
                  key={tx.id}
                  className={`transition-colors hover:bg-slate-800/40 ${
                    idx % 2 === 0 ? '' : 'bg-slate-900/30'
                  } ${tx.overridden ? 'bg-amber-500/5' : ''}`}
                >
                  {/* Date */}
                  <td className="whitespace-nowrap px-4 py-2.5 pl-5 text-xs text-slate-400">
                    {tx.date || '—'}
                  </td>

                  {/* Description */}
                  <td className="max-w-[220px] px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-slate-200" title={tx.rawText || tx.description}>
                        {tx.description || '—'}
                      </span>
                      {count > 1 && (
                        <span className="shrink-0 rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                          ×{count}
                        </span>
                      )}
                    </div>
                    {tx.notes && (
                      <p className="mt-0.5 truncate text-[10px] text-slate-500 italic">📝 {tx.notes}</p>
                    )}
                    {tx.referenceNumber && (
                      <p className="mt-0.5 font-mono text-[10px] text-slate-600">Ref: {tx.referenceNumber}</p>
                    )}
                  </td>

                  {/* Payment Type */}
                  <td className="px-4 py-2.5">
                    <PaymentTypeBadge type={tx.paymentType} />
                  </td>

                  {/* Category + AI/Edited badge */}
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <SourceBadge overridden={tx.overridden} />
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                        {tx.expenseCategory || tx.category || 'Uncategorised'}
                      </span>
                    </span>
                  </td>

                  {/* Amount */}
                  <td className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold ${
                    tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.type === 'credit' ? '+' : '−'} {fmt(tx.amount || 0)}
                  </td>

                  {/* Source */}
                  <td className="px-4 py-2.5 pr-5">
                    {tx.sourceFile && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-500">
                        📎 {tx.sourceFile.length > 20 ? tx.sourceFile.slice(0, 20) + '…' : tx.sourceFile}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Upload modal ─────────────────────────────────────────────────────────────
function UploadModal({ session, request, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Upload Documents</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Fulfilling CA request for&nbsp;
              <span className="font-medium text-slate-300">{request?.period ?? 'this period'}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <DocumentUpload session={session} request={request} onDone={onClose} />
      </div>
    </div>
  );
}

// ─── Request history ──────────────────────────────────────────────────────────
function RequestHistory({ session }) {
  const all = getRequests((r) => r.clientId === session.id).sort(
    (a, b) => (b.id > a.id ? 1 : -1)
  );

  if (all.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-10 text-center">
        <p className="text-sm text-slate-500">No requests from your CA yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {['Request ID', 'Period', 'Status', 'CA Reference'].map((col) => (
              <th
                key={col}
                className="border-b border-slate-800 bg-slate-900 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 first:pl-6 last:pr-6"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {all.map((req, idx) => (
            <tr
              key={req.id}
              className={`hover:bg-slate-800/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-900/30'}`}
            >
              <td className="px-5 py-3 pl-6 font-mono text-xs text-slate-400">{req.id}</td>
              <td className="px-5 py-3 text-slate-300">{req.period ?? '—'}</td>
              <td className="px-5 py-3">
                {req.status === 'uploaded' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Uploaded
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                    Pending
                  </span>
                )}
              </td>
              <td className="px-5 py-3 pr-6 font-mono text-xs text-slate-500">{req.caId ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MSMEDashboard (shell) ────────────────────────────────────────────────────

/**
 * Top-level MSME dashboard shell.
 *
 * Props:
 *   session   {{ id, role, email, name }}  – active session (from localStorage)
 *   onLogout  {() => void}
 */
export default function MSMEDashboard({ session, onLogout }) {
  const [activeRequest, setActiveRequest] = useState(null);
  const [refreshKey, setRefreshKey]       = useState(0);

  const handleUploadDone = () => {
    setActiveRequest(null);
    setRefreshKey((k) => k + 1);
  };

  const refresh = () => setRefreshKey((k) => k + 1);

  // Quick stats derived from storage
  const allRequests    = getRequests((r) => r.clientId === session.id);
  const pending        = allRequests.filter((r) => r.status === 'pending').length;
  const uploaded       = allRequests.filter((r) => r.status === 'uploaded').length;
  const allTx          = getTransactions((tx) => tx.clientId === session.id);
  const totalDebit     = allTx.filter((t) => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);
  const totalCredit    = allTx.filter((t) => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 antialiased">
      <TopBar session={session} onLogout={onLogout} />

      {/* scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* ── pending request banner(s) */}
        <RequestBanner
          key={refreshKey}
          session={session}
          onUploadClick={(req) => setActiveRequest(req)}
        />

        {/* ── main content */}
        <div className="mx-auto max-w-5xl space-y-8 px-6 py-6">

          {/* greeting */}
          <div>
            <h1 className="text-xl font-bold text-white">
              Welcome back, <span className="text-violet-400">{session.name.split(' ')[0]}</span> 👋
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Here's an overview of your filing activity, transactions, and pending tasks.
            </p>
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              emoji="📋"
              label="Pending requests"
              value={pending}
              sub="from your CA"
              accent={pending > 0 ? 'text-amber-400' : 'text-white'}
            />
            <StatCard
              emoji="✅"
              label="Uploaded"
              value={uploaded}
              sub="documents received"
              accent="text-emerald-400"
            />
            <StatCard
              emoji="📊"
              label="Transactions"
              value={allTx.length}
              sub={`₹${(totalCredit + totalDebit).toLocaleString('en-IN')} total`}
              accent="text-violet-400"
            />
            <StatCard
              emoji="💰"
              label="Net position"
              value={`₹${Math.abs(totalCredit - totalDebit).toLocaleString('en-IN')}`}
              sub={totalCredit - totalDebit >= 0 ? 'surplus' : 'deficit'}
              accent={totalCredit - totalDebit >= 0 ? 'text-emerald-400' : 'text-rose-400'}
            />
          </div>

          {/* Connect to CA */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-300">
              Your Chartered Accountant
            </h2>
            <ConnectCA session={session} onRefresh={refresh} />
          </div>

          {/* standalone upload */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-300">
              Upload a document
            </h2>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
              <DocumentUpload session={session} request={null} onDone={refresh} />
            </div>
          </div>

          {/* My Transactions */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-300">My Transactions</h2>
            <MyTransactions session={session} refreshKey={refreshKey} />
          </div>

          {/* request history */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-300">Request history</h2>
            <RequestHistory key={refreshKey} session={session} />
          </div>

        </div>
      </div>

      {/* upload modal (triggered from banner) */}
      {activeRequest && (
        <UploadModal session={session} request={activeRequest} onClose={handleUploadDone} />
      )}
    </div>
  );
}
