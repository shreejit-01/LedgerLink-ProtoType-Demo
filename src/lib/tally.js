// ─────────────────────────────────────────────────────────────────────────────
// LedgerLink – Tally XML export helper
//
// Generates a Tally-compatible VOUCHER import XML from a transaction array.
// Compatible with Tally Prime / Tally ERP 9 (XML import via Gateway of Tally).
//
// Usage:
//   import { generateTallyXML, downloadTallyXML } from './lib/tally';
//   const xml = generateTallyXML(transactions, 'My Company Pvt Ltd');
//   downloadTallyXML(xml, 'april-2024.xml');
// ─────────────────────────────────────────────────────────────────────────────

// ─── Date formatter ───────────────────────────────────────────────────────────

/**
 * Converts an ISO date string (YYYY-MM-DD) to Tally's required YYYYMMDD format.
 * Falls back to today if the value is missing or unparseable.
 *
 * @param {string} isoDate  e.g. '2024-04-15'
 * @returns {string}        e.g. '20240415'
 */
function toTallyDate(isoDate) {
  const d = isoDate ? new Date(isoDate) : new Date();
  if (isNaN(d.getTime())) return toTallyDate(null); // invalid → today
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// ─── XML escape helper ────────────────────────────────────────────────────────

/**
 * Escapes reserved XML characters in text content so the output is valid XML.
 *
 * @param {string | number} value
 * @returns {string}
 */
function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

// ─── Amount formatter ─────────────────────────────────────────────────────────

/**
 * Formats a numeric amount to exactly 2 decimal places (Tally requires this).
 *
 * @param {number} amount
 * @returns {string}  e.g. '1500.00'
 */
function formatAmount(amount) {
  return Math.abs(Number(amount) || 0).toFixed(2);
}

// ─── Single voucher block ─────────────────────────────────────────────────────

/**
 * Renders one <TALLYMESSAGE> block (= one Tally voucher) for a transaction.
 *
 * Tally double-entry rules used here:
 *
 *  PAYMENT voucher  (tx.type === 'debit'  — money leaving the bank):
 *    • Expense ledger  (tx.category)  ISDEEMEDPOSITIVE="Yes"   amount = +abs
 *    • Bank Account                   ISDEEMEDPOSITIVE="No"    amount = -abs
 *
 *  RECEIPT voucher  (tx.type === 'credit' — money entering the bank):
 *    • Bank Account                   ISDEEMEDPOSITIVE="Yes"   amount = +abs
 *    • Income ledger  (tx.category)   ISDEEMEDPOSITIVE="No"    amount = -abs
 *
 * @param {Object} tx  – a LedgerLink transaction object
 * @returns {string}
 */
function voucherBlock(tx) {
  const isCredit  = tx.type === 'credit';
  const vchType   = isCredit ? 'Receipt' : 'Payment';
  const date      = toTallyDate(tx.date);
  const amount    = formatAmount(tx.amount);
  const category  = xmlEscape(tx.category || 'Uncategorised');
  const narration = xmlEscape(tx.description || '');

  // ── Ledger entries depend on voucher direction ─────────────────────────────
  //
  // Payment (debit):
  //   [0] Category ledger  — deemed positive (debit side)
  //   [1] Bank Account     — deemed negative (credit side, offset)
  //
  // Receipt (credit):
  //   [0] Bank Account     — deemed positive (debit side, where money arrives)
  //   [1] Category ledger  — deemed negative (credit side, income source)

  const entries = isCredit
    ? [
        { ledger: 'Bank Account', isDeemedPositive: 'Yes', sign: '' },
        { ledger: category,       isDeemedPositive: 'No',  sign: '-' },
      ]
    : [
        { ledger: category,       isDeemedPositive: 'Yes', sign: '' },
        { ledger: 'Bank Account', isDeemedPositive: 'No',  sign: '-' },
      ];

  const ledgerLines = entries
    .map(
      ({ ledger, isDeemedPositive, sign }) => `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${ledger}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${isDeemedPositive}</ISDEEMEDPOSITIVE>
          <AMOUNT>${sign}${amount}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`
    )
    .join('');

  return `
    <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="${vchType}" ACTION="Create">
        <DATE>${date}</DATE>
        <VOUCHERTYPENAME>${vchType}</VOUCHERTYPENAME>
        <NARRATION>${narration}</NARRATION>${ledgerLines}
      </VOUCHER>
    </TALLYMESSAGE>`;
}

// ─── generateTallyXML ────────────────────────────────────────────────────────

/**
 * Converts an array of LedgerLink transaction objects into a Tally-compatible
 * XML import string (ENVELOPE → BODY → IMPORTDATA → REQUESTDATA).
 *
 * @param {Array<{
 *   id:           string,
 *   date:         string,   // YYYY-MM-DD
 *   description:  string,
 *   amount:       number,
 *   type:         'debit' | 'credit',
 *   category:     string,
 * }>} transactions
 *
 * @param {string} companyName  – exact name as registered in Tally
 * @returns {string}            – full XML string, ready for Tally import
 */
export function generateTallyXML(transactions, companyName) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new Error('generateTallyXML: transactions array is empty or invalid.');
  }

  const safeCompany = xmlEscape(companyName || 'My Company');
  const vouchers    = transactions.map(voucherBlock).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${safeCompany}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>${vouchers}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ─── downloadTallyXML ────────────────────────────────────────────────────────

/**
 * Triggers a browser download of the XML string as a .xml file.
 *
 * @param {string} xmlString  – output of generateTallyXML()
 * @param {string} [filename] – default: 'ledgerlink-export.xml'
 */
export function downloadTallyXML(xmlString, filename = 'ledgerlink-export.xml') {
  const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
