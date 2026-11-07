# LedgerLink — CA ↔ MSME bank-statement portal (prototype)

**Live demo:** https://ledger-link-proto-type-demo.vercel.app

LedgerLink connects Indian chartered accountants (CAs) with their small-business (MSME) clients. A CA requests a period's bank statements; the client uploads a PDF or image; Gemini turns it into structured transactions; the CA reviews, corrects and exports them to Tally.

I built this prototype end to end (UI, data model, AI pipeline, export) and demoed it to 10+ CA firms to test whether the workflow was worth building properly.

**Stack:** React 18 · Vite · Tailwind CSS · Google Gemini (`@google/genai`) · localStorage · Vercel

---

## What it does

**For the business (MSME)**
- Register, connect to your CA by email, and see pending statement requests
- Drag-and-drop a bank statement (PDF/PNG) → transactions are extracted and categorised automatically
- Read-only view of your transactions with credit/debit totals and net position

**For the CA**
- Client list with per-client stats and a "request statements" flow
- Editable transaction table: date, description, payment type, expense category, amount, type
- Every category shows whether it came from the AI (🤖) or was corrected by the CA (✏️), so it's clear what a human has checked
- Duplicate rows (same date + amount + description) are merged with a ×N badge
- Manual "self entry" for transactions missing from the statement
- One-click export to Tally-compatible XML

## How the AI pipeline works

1. The uploaded file is read in the browser and sent to `gemini-2.5-flash` as base64.
2. The request forces structured output (`responseMimeType: application/json` + a `responseSchema`), so the model must return an array of transactions with fixed enums for payment type (UPI, NEFT, RTGS, IMPS, Card, Cash, ACH, Cheque, Other) and 14 expense categories.
3. A defensive parser extracts the JSON array even when the model prepends reasoning text, and handles several SDK response shapes.
4. If the model leaves a field empty, a local keyword-rule categoriser (`src/lib/categories.js`) fills it in.
5. The original statement text is kept alongside the cleaned description, so any row can be checked against the source.

## Project structure

```
src/
├── App.jsx                     # Routes to CA or MSME dashboard by role
├── lib/
│   ├── gemini.js               # Statement → structured transactions (schema-forced JSON)
│   ├── categories.js           # Two-tier rule-based categoriser (fallback)
│   ├── tally.js                # Tally XML export
│   └── storage.js              # localStorage data layer
└── components/
    ├── auth/AuthScreen.jsx     # Login / registration (CA or MSME)
    ├── ca/                     # CADashboard, ClientList, TransactionTable
    └── msme/                   # MSMEDashboard, DocumentUpload, RequestBanner
```

## Run locally

```bash
npm install
cp .env.example .env        # add your Gemini API key
npm run dev
```

To try it: register one CA account and one MSME account (use the CA's email when connecting), then upload a statement from the MSME side.

## Known limitations (it's a prototype)

- **API key is in the client bundle.** Fine for a demo; a production version would call Gemini from a serverless function.
- **No backend.** All data lives in the browser's localStorage, so it's per-device and clears with the cache. Passwords are stored in plain text locally — do not use real credentials.
- **PDFs are slow** (10–30 s with a thinking model); images take 2–3 s.
- **The real product direction** is to pull statements through India's RBI Account Aggregator framework instead of uploads, with deterministic matching for reconciliation. This prototype tested the CA–client workflow, not that integration.

See `PROJECT_STATE.md` for data schemas and implementation notes.
