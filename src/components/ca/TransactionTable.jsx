import { useState, useMemo } from 'react';
import { getTransactions, saveTransaction } from '../../lib/storage';
import { EXPENSE_CATEGORIES, PAYMENT_TYPES } from '../../lib/categories';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatAmount = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount ?? 0);

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Visual dedup: group transactions with identical (date, amount, description).
 * Returns array of { tx, count } — duplicates merged, count > 1 shown as badge.
 */
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

// ─── Type badge (debit / credit) ──────────────────────────────────────────────

function TypeBadge({ type }) {
  const isCredit = type === 'credit';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isCredit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
      }`}
    >
      {isCredit ? '↑' : '↓'} {isCredit ? 'Credit' : 'Debit'}
    </span>
  );
}

// ─── AI / Edited badge ────────────────────────────────────────────────────────

function SourceBadge({ overridden }) {
  if (overridden) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
        ✏️ Edited
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
      🤖 AI
    </span>
  );
}

// ─── Category select ──────────────────────────────────────────────────────────

function CategorySelect({ tx, onChange }) {
  const cat = tx.expenseCategory || tx.category || 'Uncategorised';
  return (
    <div className="flex items-center gap-2">
      <SourceBadge overridden={tx.overridden} />
      <select
        value={cat}
        onChange={(e) => onChange(tx, e.target.value)}
        className={`rounded-lg border px-2 py-1 text-xs font-medium outline-none transition
          focus:ring-1 focus:ring-indigo-500/50
          ${
            tx.overridden
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 focus:border-amber-400'
              : cat !== 'Uncategorised'
              ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 focus:border-indigo-400'
              : 'border-slate-700 bg-slate-800/60 text-slate-500 focus:border-slate-500'
          }`}
      >
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c} value={c} className="bg-slate-900 text-slate-100">
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Manual entry modal ───────────────────────────────────────────────────────

function ManualEntryModal({ clientId, onClose, onSaved }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: '',
    type: 'debit',
    paymentType: 'Other',
    expenseCategory: 'Uncategorised',
    notes: '',
    referenceNumber: '',
  });

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.description || !form.amount) return;
    saveTransaction({
      id:              `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      clientId,
      caId:            null,
      date:            form.date,
      description:     form.description,
      amount:          parseFloat(form.amount) || 0,
      type:            form.type,
      paymentType:     form.paymentType,
      expenseCategory: form.expenseCategory,
      category:        form.expenseCategory,
      confidence:      1.0,
      overridden:      true,
      rawText:         `[Manual] ${form.description}`,
      sourceFile:      'Manual Entry',
      notes:           form.notes || null,
      referenceNumber: form.referenceNumber || null,
    });
    onSaved();
    onClose();
  };

  const inputCls = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50';
  const selectCls = 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50';
  const labelCls = 'block mb-1 text-xs font-medium text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Add Transaction</h2>
            <p className="mt-0.5 text-xs text-slate-400">Manually enter a transaction</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition">✕</button>
        </div>

        <div className="space-y-3">
          {/* Row 1: Date + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Amount (₹)</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => update('amount', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <input type="text" placeholder="e.g. Office rent payment" value={form.description} onChange={(e) => update('description', e.target.value)} className={inputCls} />
          </div>

          {/* Row 2: Type + Payment Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={(e) => update('type', e.target.value)} className={selectCls}>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Payment Type</label>
              <select value={form.paymentType} onChange={(e) => update('paymentType', e.target.value)} className={selectCls}>
                {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Expense Category */}
          <div>
            <label className={labelCls}>Expense Category</label>
            <select value={form.expenseCategory} onChange={(e) => update('expenseCategory', e.target.value)} className={selectCls}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Row 3: Reference + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Reference No. <span className="text-slate-600">(optional)</span></label>
              <input type="text" placeholder="e.g. INV-2024-001" value={form.referenceNumber} onChange={(e) => update('referenceNumber', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Notes <span className="text-slate-600">(optional)</span></label>
              <input type="text" placeholder="Additional context..." value={form.notes} onChange={(e) => update('notes', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-400 transition hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!form.description || !form.amount}
            className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Transaction
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function NoClientSelected() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-center">
      <div>
        <div className="mb-3 text-4xl">👈</div>
        <p className="text-sm text-slate-400">Select a client to view their transactions.</p>
      </div>
    </div>
  );
}

function EmptyState({ clientName, onAddClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
        🧾
      </div>
      <p className="text-sm font-medium text-slate-300">No transactions found</p>
      <p className="mt-1 text-xs text-slate-600">
        {clientName ? `${clientName} has not uploaded any documents yet.` : 'No data available.'}
      </p>
      <button
        onClick={onAddClick}
        className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500"
      >
        + Add Manually
      </button>
    </div>
  );
}

// ─── TransactionTable ─────────────────────────────────────────────────────────

export default function TransactionTable({ clientId, clientName }) {
  const [overrideCount, setOverrideCount] = useState(0);
  const [showModal, setShowModal]         = useState(false);

  const transactions = useMemo(() => {
    if (!clientId) return [];
    return getTransactions((tx) => tx.clientId === clientId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, overrideCount]);

  // Deduplicated view
  const dedupedRows = useMemo(() => deduplicateTransactions(transactions), [transactions]);

  const handleCategoryChange = (tx, newCategory) => {
    saveTransaction({
      ...tx,
      expenseCategory: newCategory,
      category:        newCategory,
      overridden:      true,
    });
    setOverrideCount((n) => n + 1);
  };

  const handleSaved = () => setOverrideCount((n) => n + 1);

  if (!clientId) return <NoClientSelected />;
  if (transactions.length === 0) return <EmptyState clientName={clientName} onAddClick={() => setShowModal(true)} />;

  const overrideTotal = transactions.filter((t) => t.overridden).length;
  const aiTotal = transactions.length - overrideTotal;

  return (
    <div className="w-full overflow-x-auto">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-2.5">
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span>{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</span>
          {dedupedRows.length < transactions.length && (
            <span className="text-amber-400">
              ({transactions.length - dedupedRows.length} duplicate{transactions.length - dedupedRows.length !== 1 ? 's' : ''} merged)
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="inline-flex items-center gap-0.5 rounded bg-indigo-500/15 px-1.5 py-0.5 text-indigo-400">🤖 AI</span>
            {aiTotal}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-400">✏️ Edited</span>
            {overrideTotal}
          </span>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 active:scale-95"
        >
          + Self Entry
        </button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {['Date', 'Description', 'Payment', 'Expense Category', 'Amount', 'Type'].map((col) => (
              <th
                key={col}
                className="sticky top-0 border-b border-slate-800 bg-slate-950/90 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 backdrop-blur first:pl-6 last:pr-6"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {dedupedRows.map(({ tx, count }, idx) => {
            const isOverridden = tx.overridden === true;
            return (
              <tr
                key={tx.id}
                className={`group transition-colors ${
                  isOverridden
                    ? 'bg-amber-500/5 hover:bg-amber-500/10'
                    : idx % 2 === 0
                    ? 'bg-transparent hover:bg-slate-800/40'
                    : 'bg-slate-900/30 hover:bg-slate-800/40'
                }`}
              >
                {/* Date */}
                <td className="whitespace-nowrap px-4 py-3 pl-6 text-slate-400">
                  {formatDate(tx.date)}
                </td>

                {/* Description */}
                <td className="max-w-xs px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-slate-200">{tx.description || '—'}</p>
                    {count > 1 && (
                      <span className="shrink-0 rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                        ×{count}
                      </span>
                    )}
                  </div>
                  {tx.sourceFile && (
                    <p className="mt-0.5 truncate text-[10px] text-slate-600">
                      📎 {tx.sourceFile}
                    </p>
                  )}
                  {tx.notes && (
                    <p className="mt-0.5 truncate text-[10px] text-slate-500 italic">
                      📝 {tx.notes}
                    </p>
                  )}
                  {tx.referenceNumber && (
                    <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                      Ref: {tx.referenceNumber}
                    </p>
                  )}
                </td>

                {/* Payment Type */}
                <td className="px-4 py-3">
                  <PaymentTypeBadge type={tx.paymentType} />
                </td>

                {/* Expense Category — editable */}
                <td className="px-4 py-3">
                  <CategorySelect tx={tx} onChange={handleCategoryChange} />
                </td>

                {/* Amount */}
                <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">
                  <span className={tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}>
                    {tx.type === 'credit' ? '+' : '−'}{formatAmount(tx.amount)}
                  </span>
                </td>

                {/* Type */}
                <td className="px-4 py-3 pr-6">
                  <TypeBadge type={tx.type} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Manual entry modal ───────────────────────────────────────────── */}
      {showModal && (
        <ManualEntryModal
          clientId={clientId}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
