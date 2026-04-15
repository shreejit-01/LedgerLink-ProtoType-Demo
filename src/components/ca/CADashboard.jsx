import { useState } from 'react';
import ClientList        from './ClientList';
import TransactionTable  from './TransactionTable';
import { getTransactions } from '../../lib/storage';
import { generateTallyXML, downloadTallyXML } from '../../lib/tally';

// ─── Top navigation bar ───────────────────────────────────────────────────────
function TopBar({ session, onLogout }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
      {/* brand */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white">
          LL
        </span>
        <span className="text-sm font-semibold tracking-tight text-white">LedgerLink</span>
        <span className="ml-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
          CA Portal
        </span>
      </div>

      {/* right: user pill + logout */}
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

// ─── Client detail panel (right pane) ────────────────────────────────────────
function ClientPanel({ client }) {
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  if (!client) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center bg-slate-950 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 text-3xl">
          📂
        </div>
        <p className="text-sm font-medium text-slate-300">No client selected</p>
        <p className="mt-1 text-xs text-slate-600">
          Pick a client from the list to view their transactions.
        </p>
      </main>
    );
  }

  // ── Export handler ─────────────────────────────────────────────────────────
  const handleExport = () => {
    setExportMsg('');

    // a. Get all transactions for this client
    const transactions = getTransactions((tx) => tx.clientId === client.id);

    if (transactions.length === 0) {
      setExportMsg('No transactions to export for this client.');
      return;
    }

    try {
      // b. Generate Tally XML using the client's business name as the company
      const xmlData = generateTallyXML(transactions, client.businessName || client.name);

      // c+d. Download via the helper (Blob + temporary <a> click)
      const filename = `${(client.businessName || client.name).replace(/\s+/g, '-')}-tally-export.xml`;
      downloadTallyXML(xmlData, filename);

      setExporting(true);
      setExportMsg(`✓ Exported ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}.`);
      setTimeout(() => { setExporting(false); setExportMsg(''); }, 3000);
    } catch (err) {
      setExportMsg(`Export failed: ${err.message}`);
    }
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-slate-950">
      {/* ── Client header ──────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Client info */}
          <div>
            <h1 className="text-base font-semibold text-white">{client.name}</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              {client.businessName}
              {client.gstin && (
                <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                  GST: {client.gstin}
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{client.email}</p>
          </div>

          {/* Export button */}
          <div className="flex flex-col items-end gap-1.5">
            <button
              id="export-tally-btn"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition
                hover:bg-emerald-500 active:scale-95
                disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Exporting…
                </>
              ) : (
                <>
                  <span>📤</span>
                  Export to Tally (.xml)
                </>
              )}
            </button>

            {/* Inline feedback */}
            {exportMsg && (
              <p
                className={`text-[11px] font-medium ${
                  exportMsg.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {exportMsg}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Transactions section ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-slate-800 px-6 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Transactions
          </h2>
        </div>
        <TransactionTable clientId={client.id} clientName={client.name} />
      </div>
    </main>
  );
}

// ─── CADashboard (shell) ──────────────────────────────────────────────────────

/**
 * Top-level CA dashboard shell.
 *
 * Props:
 *   session   {{ id, role, email, name }}  – active session (from localStorage)
 *   onLogout  {() => void}                 – called when user clicks Sign out
 */
export default function CADashboard({ session, onLogout }) {
  const [selectedClient, setSelectedClient] = useState(null);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100 antialiased">
      <TopBar session={session} onLogout={onLogout} />

      {/* body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        <ClientList
          session={session}
          selectedClientId={selectedClient?.id ?? null}
          onSelectClient={setSelectedClient}
        />
        <ClientPanel client={selectedClient} />
      </div>
    </div>
  );
}
