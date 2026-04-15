import { useState, useRef, useCallback } from 'react';
import { saveRequest, saveTransaction } from '../../lib/storage';
import { extractTransactions }          from '../../lib/gemini';
import { categorizeTransaction }        from '../../lib/categories';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCEPTED_MIME = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const ACCEPTED_EXT  = '.pdf,.png,.jpg,.jpeg,.webp';
const MAX_SIZE_MB   = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
};

const fileIcon = (mime) => {
  if (mime === 'application/pdf') return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  return '📎';
};

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    idle:      { label: 'Ready',                 cls: 'bg-slate-700 text-slate-300' },
    analyzing: { label: 'Analyzing document…',  cls: 'bg-violet-500/20 text-violet-300 animate-pulse' },
    success:   { label: 'Done ✓',               cls: 'bg-emerald-500/20 text-emerald-400' },
    error:     { label: 'Error',                cls: 'bg-rose-500/20 text-rose-400' },
  };
  const { label, cls } = map[status] ?? map.idle;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
  );
}

// ─── File row ─────────────────────────────────────────────────────────────────
function FileRow({ file, onRemove }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5">
      <span className="text-xl">{fileIcon(file.type)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200">{file.name}</p>
        <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
      </div>
      <button
        onClick={onRemove}
        className="rounded-full p-1 text-slate-500 transition hover:bg-slate-800 hover:text-rose-400"
        title="Remove file"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Analyzing overlay (shown inside drop-zone while AI runs) ─────────────────
function AnalyzingOverlay({ fileName }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-violet-500/20" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/40 bg-slate-800 text-3xl">
          🤖
        </span>
      </div>
      <div>
        <p className="text-sm font-semibold text-violet-300">Analyzing document…</p>
        <p className="mt-0.5 text-xs text-slate-500 truncate max-w-xs">{fileName}</p>
      </div>
      <p className="text-[11px] text-slate-600">
        Gemini AI is extracting and categorising transactions
      </p>
    </div>
  );
}

// ─── DocumentUpload ───────────────────────────────────────────────────────────

/**
 * Drag-and-drop document uploader for MSME users.
 *
 * Props:
 *   session   {{ id, role, email, name }}         – active session (for clientId)
 *   request   {{ id, caId, clientId, period, status }} | null
 *             Pass null for a standalone upload widget (no linked CA request).
 *   onDone    {() => void}  – called after all files are processed successfully
 */
export default function DocumentUpload({ session, request, onDone }) {
  const [dragging, setDragging]       = useState(false);
  const [files, setFiles]             = useState([]);
  const [status, setStatus]           = useState('idle');
  const [currentFile, setCurrentFile] = useState('');   // name of file being analyzed
  const [message, setMessage]         = useState('');   // success or error text
  const inputRef                      = useRef(null);

  // ── File validation ─────────────────────────────────────────────────────────
  const validate = (fileList) => {
    const valid = [];
    for (const f of fileList) {
      if (!ACCEPTED_MIME.includes(f.type)) {
        setMessage(`"${f.name}" is not a supported format (PDF, PNG, JPG, WEBP).`);
        setStatus('error');
        return null;
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setMessage(`"${f.name}" exceeds the ${MAX_SIZE_MB} MB limit.`);
        setStatus('error');
        return null;
      }
      valid.push(f);
    }
    return valid;
  };

  const addFiles = (fileList) => {
    setMessage('');
    setStatus('idle');
    const validated = validate(Array.from(fileList));
    if (!validated) return;
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...validated.filter((f) => !names.has(f.name))];
    });
  };

  // ── Drag handlers ────────────────────────────────────────────────────────────
  const onDragOver  = useCallback((e) => { e.preventDefault(); setDragging(true);  }, []);
  const onDragLeave = useCallback((e) => { e.preventDefault(); setDragging(false); }, []);
  const onDrop      = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  // ── FileReader → base64 ──────────────────────────────────────────────────────
  const readAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result); // data:<mime>;base64,<data>
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsDataURL(file);
    });

  // ── Main upload handler ──────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage('Please select at least one file before uploading.');
      setStatus('error');
      return;
    }

    setMessage('');
    setStatus('analyzing');

    try {
      let totalExtracted = 0;

      for (const file of files) {
        // ── Show which file is being analyzed ──────────────────────────────────
        setCurrentFile(file.name);

        // ── Step 1: Read → base64 ──────────────────────────────────────────────
        const dataUrl  = await readAsBase64(file);
        const base64   = dataUrl.split(',')[1];  // strip data-URL prefix
        const mimeType = file.type;

        // ── Step 2: Gemini extraction ──────────────────────────────────────────
        const transactions = await extractTransactions(base64, mimeType);

        // ── Step 3: Categorise + persist each transaction ──────────────────────
        // clientId comes from the session (MSME user who is uploading).
        // caId comes from the linked request when one exists.
        const clientId = session?.id            ?? request?.clientId ?? null;
        const caId     = request?.caId          ?? null;

        for (const tx of transactions) {
          // Two-tier categorisation: prefer AI output, fallback to local rules
          const localCat = categorizeTransaction(tx.rawText || tx.description);
          const paymentType     = tx.paymentType     || localCat.paymentType     || 'Other';
          const expenseCategory = tx.expenseCategory  || localCat.expenseCategory || 'Uncategorised';
          const confidence      = tx.expenseCategory ? 0.95 : localCat.confidence;

          saveTransaction({
            id:              `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            clientId,
            caId,
            date:            tx.date,
            description:     tx.description,
            amount:          tx.amount,
            type:            tx.type,
            paymentType,
            expenseCategory,
            category:        expenseCategory,   // backward compat
            confidence,
            overridden:      false,
            rawText:         tx.rawText,
            sourceFile:      file.name,
          });
        }

        totalExtracted += transactions.length;
      }

      // ── Step 4: Mark the linked CA request as fulfilled ────────────────────
      if (request) {
        saveRequest({ ...request, status: 'uploaded' });
      }

      // ── Done ───────────────────────────────────────────────────────────────
      setStatus('success');
      setFiles([]);
      setCurrentFile('');
      setMessage(
        `✓ Extracted ${totalExtracted} transaction${totalExtracted !== 1 ? 's' : ''} and saved to your ledger.`
      );
      if (typeof onDone === 'function') onDone();

    } catch (err) {
      setStatus('error');
      setCurrentFile('');
      setMessage(err.message);
    }
  };

  const isAnalyzing = status === 'analyzing';

  return (
    <div className="flex flex-col gap-4">
      {/* ── Drop zone ───────────────────────────────────────────────────────── */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isAnalyzing && inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 ${
          isAnalyzing
            ? 'cursor-default border-violet-500/40 bg-violet-500/5'
            : dragging
            ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-950/30'
            : 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/70'
        }`}
      >
        {isAnalyzing ? (
          <AnalyzingOverlay fileName={currentFile} />
        ) : (
          <>
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-3xl transition-transform duration-200 ${
                dragging ? 'scale-110 border-indigo-500' : ''
              }`}
            >
              {dragging ? '📂' : '☁️'}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {dragging ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                or&nbsp;
                <span className="text-indigo-400 underline underline-offset-2">browse your device</span>
                &nbsp;· PDF, PNG, JPG, WEBP up to {MAX_SIZE_MB} MB each
              </p>
            </div>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXT}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* ── Queued files ────────────────────────────────────────────────────── */}
      {files.length > 0 && !isAnalyzing && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Queued · {files.length} file{files.length > 1 ? 's' : ''}
          </p>
          {files.map((f, idx) => (
            <FileRow key={`${f.name}-${idx}`} file={f} onRemove={() => removeFile(idx)} />
          ))}
        </div>
      )}

      {/* ── Status message ──────────────────────────────────────────────────── */}
      {message && status === 'error' && (
        <p className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-400">
          <span>⚠</span> {message}
        </p>
      )}
      {message && status === 'success' && (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400">
          <span>✓</span> {message}
        </p>
      )}

      {/* ── Action bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <StatusPill status={status} />
        <button
          onClick={handleUpload}
          disabled={isAnalyzing || files.length === 0}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isAnalyzing ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-300/30 border-t-violet-300" />
              Analyzing document…
            </>
          ) : (
            'Upload & extract'
          )}
        </button>
      </div>
    </div>
  );
}
