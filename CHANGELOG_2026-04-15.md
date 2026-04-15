# LedgerLink — Session Changelog (April 15, 2026)

**Live URL:** https://ledger-link-proto-type-demo.vercel.app  
**Session Date:** April 15, 2026  
**Deployments:** 8 production deploys to Vercel

---

## Files Modified

| File | What Changed |
|------|-------------|
| [gemini.js](file:///Users/shreejit/Desktop/LedgerLink-ProtoType-Demo/src/lib/gemini.js) | Model → `gemini-2.5-flash`, schema adds `paymentType` + `expenseCategory`, prompt instructs clean descriptions, robust JSON parser for thinking models |
| [categories.js](file:///Users/shreejit/Desktop/LedgerLink-ProtoType-Demo/src/lib/categories.js) | Two-tier system: `PAYMENT_TYPES` + `EXPENSE_CATEGORIES`, `categorizeTransaction()` returns both |
| [DocumentUpload.jsx](file:///Users/shreejit/Desktop/LedgerLink-ProtoType-Demo/src/components/msme/DocumentUpload.jsx) | Saves `paymentType`, `expenseCategory` from AI with local rule fallback |
| [MSMEDashboard.jsx](file:///Users/shreejit/Desktop/LedgerLink-ProtoType-Demo/src/components/msme/MSMEDashboard.jsx) | Added: My Transactions table, Connect to CA, payment type badges, AI/Edited badges, deduplication, stat cards upgrade |
| [TransactionTable.jsx](file:///Users/shreejit/Desktop/LedgerLink-ProtoType-Demo/src/components/ca/TransactionTable.jsx) | Full rewrite: payment type column, expense category dropdown, AI/Edited badges, dedup, manual entry modal with notes + reference number |

---

## Changes in Detail

### 1. Gemini Model & Parser (gemini.js)

- **Model:** Switched through `gemini-2.0-flash` → `gemini-3-flash-preview` → `gemini-2.5-flash` (settled on 2.5-flash)
- **Thinking model fix:** `gemini-2.5-flash` is a "thinking" model that prepends reasoning text before JSON. Parser now finds first `[` and last `]` to extract the array, instead of naively calling `JSON.parse()` on the full response
- **Multi-path response extraction:** Tries `response.text` (string), `response.text()` (function), `response.candidates[0]`, and `response.response.text` as fallbacks
- **Schema upgraded:** Added `paymentType` (enum: UPI/NEFT/RTGS/IMPS/Card/Cash/ACH/Cheque/Other) and `expenseCategory` (14 categories)
- **Prompt updated:** AI now returns clean descriptions (e.g. "Reliance Petrol" not "UPI/123456/RELIANCE PETROL/..."). rawText preserves the original

### 2. Two-Tier Categorization (categories.js)

- **Before:** Single `CATEGORIES` array mixing payment methods (UPI Payment, Bank Transfer) with expense types (Meals, Rent)
- **After:** Split into:
  - `PAYMENT_TYPES` — how money moved (UPI, NEFT, RTGS, IMPS, Card, Cash, ACH, Cheque, Other)
  - `EXPENSE_CATEGORIES` — what it was for (Meals & Entertainment, **Fuel & Gas** [new], Purchases, Payroll, etc.)
- `categorizeTransaction()` now returns `{ paymentType, expenseCategory, confidence }`
- Backward-compat `CATEGORIES` alias preserved

### 3. MSME Dashboard (MSMEDashboard.jsx)

- **My Transactions table:** Shows all extracted transactions sorted by date, with:
  - Payment type badges (color-coded by type)
  - 🤖 AI / ✏️ Edited badges
  - Deduplication (same date+amount+description → merged with ×N badge)
  - Notes and reference number display
  - Summary bar: count, dupes merged, credit/debit totals, AI/Edited counts, net position
- **Connect to CA:** MSME enters CA's email → looks up registered CAs → links account. Shows connected CA name/firm with green badge. Disconnect button available
- **Stat cards:** 4 cards now — Pending requests, Uploaded, Transaction count, Net position

### 4. CA TransactionTable (TransactionTable.jsx)

- **Columns:** Date | Description | Payment Type | Expense Category | Amount | Type
- **Payment Type:** Color-coded read-only badge (UPI=violet, NEFT=blue, Card=orange, etc.)
- **Expense Category:** `<select>` dropdown from EXPENSE_CATEGORIES
- **AI vs Edited badge:** `🤖 AI` (indigo) when auto-categorized, `✏️ Edited` (amber) when overridden
- **Deduplication:** Same date+amount+description → one row with ×N badge
- **Manual entry modal:** "+ Self Entry" button → full form with date, description, amount, type, payment type, expense category, **notes** (optional), **reference number** (optional)
- **Toolbar:** Transaction count, dupe count, AI/Edited counts

### 5. DocumentUpload Integration (DocumentUpload.jsx)

- Saves `paymentType` and `expenseCategory` from Gemini response
- Falls back to local `categorizeTransaction()` rule engine if AI doesn't provide them
- Backward-compat `category` field = `expenseCategory`

---

## Known Issues & Next Steps

1. **Quota:** Free-tier Gemini API quota may exhaust. Enable billing at https://ai.google.dev for higher limits
2. **API key exposure:** `VITE_GEMINI_API_KEY` is in client-side bundle. For production, move to Vercel serverless function
3. **PDF speed:** PDFs take 10-30s with gemini-2.5-flash (thinking model). PNGs are near-instant (~2-3s)
4. **Old transactions:** Previously uploaded transactions won't have `paymentType`/`expenseCategory` — they'll show "Other"/"Uncategorised" with backward-compat handling
