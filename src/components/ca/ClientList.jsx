import { useState, useMemo } from 'react';
import { getUsers, saveUser, getRequests, saveRequest, getTransactions } from '../../lib/storage';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
      {initials}
    </span>
  );
}

// ─── Add Client Modal ─────────────────────────────────────────────────────────
function AddClientModal({ caEmail, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', businessName: '', gstin: '' });
  const [error, setError] = useState('');

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.businessName) {
      setError('Name, email, password and business name are required.');
      return;
    }
    if (getUsers().find((u) => u.email === form.email)) {
      setError('A user with this email already exists.');
      return;
    }
    const newUser = {
      id: `msme_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role: 'msme',
      email: form.email,
      password: form.password,
      name: form.name,
      businessName: form.businessName,
      gstin: form.gstin,
      caEmail,
    };
    saveUser(newUser);
    onSaved(newUser);
    onClose();
  };

  const inputCls = 'w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Add New Client</h2>
            <p className="mt-0.5 text-xs text-slate-400">Client will be linked to your account automatically.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition">✕</button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{error}</p>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Full Name *</label>
              <input name="name" value={form.name} onChange={handle} placeholder="Ravi Kumar" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Business Name *</label>
              <input name="businessName" value={form.businessName} onChange={handle} placeholder="Ravi Traders" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Email *</label>
            <input name="email" type="email" value={form.email} onChange={handle} placeholder="ravi@ravitraders.com" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Password *</label>
            <input name="password" type="password" value={form.password} onChange={handle} placeholder="Set login password" className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">GSTIN (optional)</label>
            <input name="gstin" value={form.gstin} onChange={handle} placeholder="27AAPFU0939F1ZV" className={inputCls} />
          </div>
          <button type="submit" className="mt-2 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]">
            Add Client
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Send Request Modal ───────────────────────────────────────────────────────
function SendRequestModal({ caId, client, onClose, onSent }) {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [period, setPeriod] = useState(currentMonth);
  const [error, setError]   = useState('');

  // Check if there's already a pending request for this period
  const alreadyExists = getRequests(
    (r) => r.clientId === client.id && r.caId === caId && r.period === period && r.status === 'pending'
  ).length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!period) { setError('Please select a period.'); return; }
    if (alreadyExists) { setError(`A pending request for ${period} already exists.`); return; }

    const newRequest = {
      id:       uid(),
      caId,
      clientId: client.id,
      period,
      status:   'pending',
    };
    saveRequest(newRequest);
    onSent(newRequest);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Request Documents</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Send a statement upload request to&nbsp;
              <span className="font-medium text-slate-300">{client.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition">✕</button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">{error}</p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Statement period (YYYY-MM)
            </label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {alreadyExists && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
              ⚠ A pending request for this period already exists.
            </p>
          )}

          <button
            type="submit"
            disabled={alreadyExists}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send Request
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── ClientList ───────────────────────────────────────────────────────────────

/**
 * Left sidebar showing all MSME clients linked to this CA.
 *
 * Props:
 *   session          {{ id, role, email, name }}
 *   selectedClientId {string | null}
 *   onSelectClient   {(client) => void}
 */
export default function ClientList({ session, selectedClientId, onSelectClient }) {
  const [showAddModal, setShowAddModal]     = useState(false);
  const [requestTarget, setRequestTarget]   = useState(null); // client to send request to
  const [clients, setClients]               = useState(() =>
    getUsers().filter((u) => u.role === 'msme' && u.caEmail === session.email)
  );
  const [requestTick, setRequestTick]       = useState(0); // forces badge re-read

  const handleClientSaved = (newUser) => setClients((prev) => [...prev, newUser]);

  const handleRequestSent = () => setRequestTick((n) => n + 1);

  // Per-client stats (pending requests + transaction count)
  const clientStats = useMemo(() => {
    const stats = {};
    for (const c of clients) {
      const reqs    = getRequests((r) => r.clientId === c.id && r.caId === session.id);
      const pending = reqs.filter((r) => r.status === 'pending').length;
      const txCount = getTransactions((tx) => tx.clientId === c.id).length;
      stats[c.id]   = { pending, txCount };
    }
    return stats;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, requestTick]);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Clients</h2>
          <p className="text-xs text-slate-500">{clients.length} linked</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 active:scale-95"
        >
          <span className="text-base leading-none">+</span> Add
        </button>
      </div>

      {/* Label */}
      <div className="px-4 py-3">
        <p className="text-[11px] uppercase tracking-wider text-slate-600">All Clients</p>
      </div>

      {/* Client rows */}
      <ul className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {clients.length === 0 ? (
          <li className="mt-6 text-center text-xs text-slate-600">
            No clients yet. Click&nbsp;<strong>+ Add</strong>&nbsp;to begin.
          </li>
        ) : (
          clients.map((client) => {
            const isActive = client.id === selectedClientId;
            const stats    = clientStats[client.id] ?? { pending: 0, txCount: 0 };
            return (
              <li key={client.id}>
                <div
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                    isActive ? 'bg-indigo-600/20 ring-1 ring-indigo-500/40' : 'hover:bg-slate-800/60'
                  }`}
                >
                  {/* Left: avatar + name — click to select */}
                  <button
                    onClick={() => onSelectClient(client)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Avatar name={client.name} />
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${isActive ? 'text-indigo-300' : 'text-slate-200'}`}>
                        {client.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{client.businessName}</p>
                      {/* Mini stats */}
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-600">
                        <span>{stats.txCount} tx</span>
                        {stats.pending > 0 && (
                          <span className="text-amber-400">{stats.pending} pending</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Right: Send Request button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setRequestTarget(client); }}
                    title="Request document upload"
                    className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-400 transition hover:border-indigo-500 hover:text-indigo-300"
                  >
                    📨
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* Add Client modal */}
      {showAddModal && (
        <AddClientModal
          caEmail={session.email}
          onClose={() => setShowAddModal(false)}
          onSaved={handleClientSaved}
        />
      )}

      {/* Send Request modal */}
      {requestTarget && (
        <SendRequestModal
          caId={session.id}
          client={requestTarget}
          onClose={() => setRequestTarget(null)}
          onSent={handleRequestSent}
        />
      )}
    </aside>
  );
}
