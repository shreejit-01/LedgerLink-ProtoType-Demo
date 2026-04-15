// ─────────────────────────────────────────────────────────────────────────────
// LedgerLink – Gemini AI helper
//
// Usage:
//   import { extractTransactions } from './lib/gemini';
//   const rows = await extractTransactions(base64String, 'application/pdf');
//
// Requires:  VITE_GEMINI_API_KEY in your .env file
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenAI } from '@google/genai';

// ─── Client (singleton) ───────────────────────────────────────────────────────

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

// ─── Response schema ──────────────────────────────────────────────────────────
// Forces Gemini to return a strict JSON array — no markdown fencing, no prose.

const TRANSACTION_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'Transaction date in YYYY-MM-DD format',
      },
      description: {
        type: 'string',
        description: 'Short, clean, human-readable name (e.g. "Reliance Petrol" not "UPI/123456/RELIANCE PETROL/...")',
      },
      amount: {
        type: 'number',
        description: 'Absolute transaction amount (always positive)',
      },
      type: {
        type: 'string',
        enum: ['debit', 'credit'],
        description: '"debit" for money out, "credit" for money in',
      },
      paymentType: {
        type: 'string',
        enum: ['UPI', 'NEFT', 'RTGS', 'IMPS', 'Card', 'Cash', 'ACH', 'Cheque', 'Other'],
        description: 'Payment channel / instrument used',
      },
      expenseCategory: {
        type: 'string',
        enum: [
          'Meals & Entertainment', 'Fuel & Gas', 'Purchases', 'Payroll',
          'GST Payments', 'Utilities', 'Rent', 'Travel & Transport',
          'Office Supplies', 'Professional Fees', 'Insurance',
          'Loan / EMI', 'Taxes & Duties', 'Uncategorised',
        ],
        description: 'Expense or income category',
      },
      rawText: {
        type: 'string',
        description: 'Verbatim text of this line from the source document',
      },
    },
    required: ['date', 'description', 'amount', 'type', 'paymentType', 'expenseCategory', 'rawText'],
  },
};

// ─── extractTransactions ──────────────────────────────────────────────────────

/**
 * Sends a document (PDF, image, etc.) to Gemini and extracts every transaction.
 *
 * @param {string} base64Data  – Base-64 encoded file content (no data-URL prefix)
 * @param {string} mimeType    – e.g. 'application/pdf', 'image/png', 'image/jpeg'
 * @returns {Promise<Array<{
 *   date:        string,   // YYYY-MM-DD
 *   description: string,
 *   amount:      number,   // always positive
 *   type:        'debit' | 'credit',
 *   rawText:     string,
 * }>>}
 */
export async function extractTransactions(base64Data, mimeType) {
  // Check API key is configured
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured. Add VITE_GEMINI_API_KEY to your .env file.');
  }

  // Using gemini-3-flash-preview as requested
  const model = 'gemini-2.5-flash';

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: { mimeType, data: base64Data },
            },
            {
              text: `Extract ALL transactions from this document.
Rules:
- date: YYYY-MM-DD format
- description: short clean human-readable name (e.g. "Reliance Petrol" not "UPI/123456/RELIANCE PETROL/...")
- amount: always positive number
- type: "debit" or "credit"
- paymentType: detect from UPI/NEFT/RTGS/IMPS/Card/Cash/ACH/Cheque/Other
- expenseCategory: classify as Meals & Entertainment, Fuel & Gas, Purchases, Payroll, GST Payments, Utilities, Rent, Travel & Transport, Office Supplies, Professional Fees, Insurance, Loan / EMI, Taxes & Duties, or Uncategorised
- rawText: verbatim original text from document
- Skip summary/total/balance lines.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: TRANSACTION_SCHEMA,
        temperature: 0,
      },
    });
  } catch (err) {
    // ── Friendly error messages for common API failures ──────────────────────
    const msg = err?.message ?? String(err);

    // 429 – quota / rate limit
    if (err?.status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      // Try to extract retry delay from the error body
      const retryMatch = msg.match(/retry[^0-9]*(\d+)/i);
      const retrySecs = retryMatch ? retryMatch[1] : '60';
      throw new Error(
        `Gemini API quota exceeded (free tier limit reached). ` +
        `Please wait ${retrySecs} seconds and try again, or enable billing at ` +
        `https://ai.google.dev to get higher limits.`
      );
    }

    // 401 / 403 – bad API key
    if (err?.status === 401 || err?.status === 403 || msg.includes('API_KEY_INVALID')) {
      throw new Error('Gemini API key is invalid or missing. Check your VITE_GEMINI_API_KEY.');
    }

    // 404 – wrong model name
    if (err?.status === 404 || msg.includes('NOT_FOUND')) {
      throw new Error('Gemini model not found. Please contact support.');
    }

    // Generic network / unknown error
    throw new Error(`Gemini API error: ${msg}`);
  }

  // ── Parse the response ─────────────────────────────────────────────────────
  // The SDK returns text differently depending on model/version.
  // We try multiple access paths to be resilient.
  console.log('[gemini] Raw response object:', response);

  let raw = '';

  // Path 1: response.text (string property — most common)
  if (typeof response?.text === 'string' && response.text.length > 0) {
    raw = response.text;
    console.log('[gemini] Got text from response.text');
  }
  // Path 2: response.text() (function in some SDK versions)
  else if (typeof response?.text === 'function') {
    raw = response.text();
    console.log('[gemini] Got text from response.text()');
  }
  // Path 3: candidates array
  else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    raw = response.candidates[0].content.parts[0].text;
    console.log('[gemini] Got text from candidates[0]');
  }
  // Path 4: response.response (some SDK wrappers nest it)
  else if (response?.response?.text) {
    raw = typeof response.response.text === 'function'
      ? response.response.text()
      : response.response.text;
    console.log('[gemini] Got text from response.response.text');
  }

  console.log('[gemini] Extracted raw text:', raw?.substring?.(0, 500));

  if (!raw) {
    console.error('[gemini] No text found in response. Full object:', JSON.stringify(response, null, 2));
    throw new Error('Gemini returned an empty response. Check the browser console for details.');
  }

  // Strip everything outside the JSON array.
  // Thinking models (gemini-2.5-flash) include reasoning text before the JSON.
  // We find the first '[' and last ']' to extract just the array.
  const firstBracket = raw.indexOf('[');
  const lastBracket  = raw.lastIndexOf(']');

  if (firstBracket !== -1 && lastBracket > firstBracket) {
    raw = raw.substring(firstBracket, lastBracket + 1);
    console.log('[gemini] Extracted JSON array from position', firstBracket, 'to', lastBracket);
  } else {
    // Fallback: try stripping markdown fences
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error('[gemini] Failed to parse JSON. Raw text:', raw.substring(0, 1000));
    throw new Error(`Gemini returned invalid JSON. Check browser console for details.`);
  }

  if (!Array.isArray(parsed)) {
    console.error('[gemini] Expected array, got:', typeof parsed, parsed);
    throw new Error('Gemini response was not a JSON array of transactions.');
  }

  console.log(`[gemini] Successfully extracted ${parsed.length} transactions`);
  return parsed;
}
