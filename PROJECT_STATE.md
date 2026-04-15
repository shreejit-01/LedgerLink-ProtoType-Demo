# LedgerLink — Project State

> **Last updated:** April 15, 2026  
> **Live URL:** https://ledger-link-proto-type-demo.vercel.app  
> **Deployment:** Vercel (auto from CLI: `vercel --prod`)  
> **Framework:** Vite + React (no TypeScript)  
> **Styling:** Tailwind CSS  
> **Storage:** 100% client-side localStorage (no backend)  
> **AI:** Gemini 2.5-flash via `@google/genai` SDK (browser → API direct)

---

## Architecture

```
src/
├── App.jsx                    # Router: login vs dashboard (CA/MSME by role)
├── main.jsx                   # Entry point, calls initStorage()
├── lib/
│   ├── storage.js             # localStorage CRUD (users, session, transactions, requests)
│   ├── gemini.js              # Gemini AI extraction (base64 → structured JSON)
│   ├── categories.js          # Two-tier categorisation engine (payment type + expense category)
│   └── tally.js               # Transaction → Tally-compatible XML export
├── components/
│   ├── auth/
│   │   └── LoginPage.jsx      # Login + Registration (CA / MSME roles)
│   ├── ca/
│   │   ├── CADashboard.jsx    # CA shell with sidebar + transaction view + Tally export
│   │   ├── ClientList.jsx     # Sidebar: client list, send request flow, per-client stats
│   │   └── TransactionTable.jsx # Editable table: payment type, expense category, AI/Edited badges, dedup, manual entry
│   └── msme/
│       ├── MSMEDashboard.jsx  # MSME shell: stats, connect to CA, upload, transactions, request history
│       ├── DocumentUpload.jsx # Drag-drop upload → Gemini extraction → categorise → save
│       └── RequestBanner.jsx  # Pending CA request alerts
```

---

## Data Schemas (localStorage)

### Users (`ll_users`)
```js
{
  id, role: 'ca' | 'msme', email, password, name,
  firmName?, caNumber?,             // CA-only
  businessName?, gstin?, caEmail?   // MSME-only (caEmail = linked CA)
}
```

### Session (`ll_session`)
```js
{ id, role, email, name } | null
```

### Transactions (`ll_transactions`)
```js
{
  id, clientId, caId,
  date,              // YYYY-MM-DD
  description,       // Clean, human-readable (from AI)
  amount,            // Always positive number
  type,              // 'debit' | 'credit'
  paymentType,       // 'UPI' | 'NEFT' | 'RTGS' | 'IMPS' | 'Card' | 'Cash' | 'ACH' | 'Cheque' | 'Other'
  expenseCategory,   // 'Meals & Entertainment' | 'Fuel & Gas' | 'Purchases' | 'Payroll' | 'GST Payments' | 'Utilities' | 'Rent' | 'Travel & Transport' | 'Office Supplies' | 'Professional Fees' | 'Insurance' | 'Loan / EMI' | 'Taxes & Duties' | 'Uncategorised'
  category,          // Backward compat alias = expenseCategory
  confidence,        // 0–1 float
  overridden,        // boolean — true if CA edited category
  rawText,           // Verbatim text from source document
  sourceFile,        // Filename of uploaded document
  notes?,            // Optional (manual entry only)
  referenceNumber?,  // Optional (manual entry only)
}
```

### Requests (`ll_requests`)
```js
{ id, caId, clientId, period, status: 'pending' | 'uploaded' }
```

---

## Key Implementation Details

### AI Pipeline (gemini.js)
- **Model:** `gemini-2.5-flash` (thinking model — slower but smarter)
- **SDK:** `@google/genai` → `ai.models.generateContent()`
- **Schema:** Forces structured JSON with `responseMimeType: 'application/json'` + `responseSchema`
- **Thinking model workaround:** Response includes reasoning text before JSON. Parser finds first `[` and last `]` to extract the array
- **Multi-path response:** Tries `response.text`, `response.text()`, `response.candidates[0]`, `response.response.text`
- **Error handling:** 429 quota → friendly message with retry time. 401/403 → API key invalid. 404 → model not found
- **Env var:** `VITE_GEMINI_API_KEY` (set in Vercel env vars for production)

### Categorisation (categories.js)
- **Two-tier system:**
  - `PAYMENT_TYPES` = ['UPI', 'NEFT', 'RTGS', 'IMPS', 'Card', 'Cash', 'ACH', 'Cheque', 'Other']
  - `EXPENSE_CATEGORIES` = ['Meals & Entertainment', 'Fuel & Gas', 'Purchases', 'Payroll', 'GST Payments', 'Utilities', 'Rent', 'Travel & Transport', 'Office Supplies', 'Professional Fees', 'Insurance', 'Loan / EMI', 'Taxes & Duties', 'Uncategorised']
- **`categorizeTransaction(rawText)`** returns `{ paymentType, expenseCategory, confidence }`
- AI extracts both fields directly; local rules are fallback

### DocumentUpload (DocumentUpload.jsx)
- Drag-drop or click to upload PDF/PNG
- FileReader → base64 → Gemini extraction → two-tier categorisation → save to localStorage
- Supports linked CA requests (marks request as "uploaded" after)

### CA TransactionTable (TransactionTable.jsx)
- **Columns:** Date | Description | Payment Type | Expense Category | Amount | Type
- **Payment Type:** Read-only color-coded badge
- **Expense Category:** Editable `<select>` dropdown → sets `overridden: true`
- **Badges:** 🤖 AI (indigo) or ✏️ Edited (amber) next to category
- **Deduplication:** Same date+amount+description → merged with ×N badge
- **Manual entry:** "+ Self Entry" button → modal with all fields + notes + reference number
- **Toolbar:** Count, dupes, AI vs edited stats

### MSME Dashboard (MSMEDashboard.jsx)
- **Stat cards (4):** Pending requests, Uploaded, Transaction count, Net position
- **Connect to CA:** Email input → looks up CA in ll_users → saves link
- **Upload section:** DocumentUpload component (standalone, no linked request)
- **My Transactions:** Same features as CA table (payment type badges, AI/Edited, dedup, summary bar) but read-only (no category editing)
- **Request history:** Table of CA requests with status badges

### Tally Export (tally.js)
- `generateTallyXML(transactions)` → Tally-compliant XML string
- Download triggered from CA dashboard

---

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_GEMINI_API_KEY` | `.env` (local) + Vercel env vars (prod) | Gemini API authentication |

---

## Known Issues & Limitations

1. **API quota:** Free-tier Gemini quota exhausts quickly. Enable billing at https://ai.google.dev
2. **API key in client bundle:** `VITE_GEMINI_API_KEY` is exposed in browser JS. Move to serverless function for production
3. **PDF speed:** 10-30s with gemini-2.5-flash. PNGs are 2-3s
4. **No persistence beyond browser:** All data in localStorage — clears on cache clear
5. **Old transactions:** Pre-upgrade transactions lack `paymentType`/`expenseCategory` — show as "Other"/"Uncategorised"

---

## Deployment

```bash
# Local dev
npm run dev

# Production deploy
vercel --prod
```

Vercel project: `coolshreejit2497-1482s-projects/ledger-link-proto-type-demo`
