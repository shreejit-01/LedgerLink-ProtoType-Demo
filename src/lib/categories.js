// ─────────────────────────────────────────────────────────────────────────────
// LedgerLink – Two-tier transaction categoriser for Indian MSMEs
//
// Tier 1: Payment Type  – HOW money moved (UPI, NEFT, Card, etc.)
// Tier 2: Expense Category – WHAT it was for (Fuel & Gas, Utilities, etc.)
//
// Usage:
//   import { categorizeTransaction, PAYMENT_TYPES, EXPENSE_CATEGORIES } from './categories';
//   const { paymentType, expenseCategory, confidence } = categorizeTransaction(rawText);
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How money moved — payment channel / instrument.
 */
export const PAYMENT_TYPES = [
  'UPI',
  'NEFT',
  'RTGS',
  'IMPS',
  'Card',
  'Cash',
  'ACH',
  'Cheque',
  'Other',
];

/**
 * What money was for — expense / income category.
 */
export const EXPENSE_CATEGORIES = [
  'Meals & Entertainment',
  'Fuel & Gas',
  'Purchases',
  'Payroll',
  'GST Payments',
  'Utilities',
  'Rent',
  'Travel & Transport',
  'Office Supplies',
  'Professional Fees',
  'Insurance',
  'Loan / EMI',
  'Taxes & Duties',
  'Uncategorised',
];

/**
 * Backward-compatible alias — used by MSME dashboard and older code.
 */
export const CATEGORIES = EXPENSE_CATEGORIES;

// ─── Payment type rules ──────────────────────────────────────────────────────

const PAYMENT_TYPE_RULES = [
  { type: 'UPI',    keywords: ['upi/', 'upi-', 'upi ref', 'upi transfer', 'upi payment', '@okaxis', '@okhdfcbank', '@okicici', '@oksbi', '@ybl', '@ibl', '@axl', '@paytm', 'gpay', 'phonepe', 'paytm', 'bhim'] },
  { type: 'NEFT',   keywords: ['neft', 'neft/'] },
  { type: 'RTGS',   keywords: ['rtgs', 'rtgs/'] },
  { type: 'IMPS',   keywords: ['imps', 'imps/'] },
  { type: 'ACH',    keywords: ['ach-', 'ach/', 'nach', 'ecs', 'auto debit', 'standing instruction'] },
  { type: 'Card',   keywords: ['pos/', 'pos ', 'atm/', 'atm ', 'debit card', 'credit card', 'card payment', 'visa', 'mastercard', 'rupay'] },
  { type: 'Cheque', keywords: ['chq', 'cheque', 'check', 'clg/'] },
  { type: 'Cash',   keywords: ['cash deposit', 'cash withdrawal', 'cash/'] },
];

// ─── Expense category rules ──────────────────────────────────────────────────

const EXPENSE_RULES = [
  // ── Meals & Entertainment
  {
    category:   'Meals & Entertainment',
    confidence: 0.95,
    keywords:   [
      'zomato', 'swiggy', 'blinkit', 'dunzo', 'zepto',
      'dominos', 'pizza hut', 'mcdonald', 'kfc', 'burger king',
      'starbucks', 'cafe coffee day', 'ccd', 'hotel', 'restaurant',
      'food', 'canteen', 'mess', 'lunch', 'dinner', 'breakfast',
    ],
  },

  // ── Fuel & Gas
  {
    category:   'Fuel & Gas',
    confidence: 0.93,
    keywords:   [
      'petrol', 'diesel', 'fuel', 'petroleum', 'hp petrol', 'bharat petroleum',
      'indian oil', 'iocl', 'bpcl', 'hpcl', 'reliance petrol',
      'petrol pump', 'gas station', 'cng', 'lpg',
    ],
  },

  // ── Payroll
  {
    category:   'Payroll',
    confidence: 0.95,
    keywords:   [
      'salary', 'salaries', 'payroll', 'wages', 'stipend',
      'staff payment', 'employee pay', 'hr payment',
    ],
  },

  // ── GST Payments
  {
    category:   'GST Payments',
    confidence: 0.97,
    keywords:   [
      'igst', 'cgst', 'sgst', 'utgst', 'gst payment',
      'gst challan', 'gstn', 'goods and services tax',
    ],
  },

  // ── Taxes & Duties
  {
    category:   'Taxes & Duties',
    confidence: 0.93,
    keywords:   [
      'tds', 'tcs', 'advance tax', 'income tax', 'income-tax',
      'direct tax', 'oltas', 'tax deducted', 'customs duty',
      'excise duty', 'professional tax',
    ],
  },

  // ── Utilities
  {
    category:   'Utilities',
    confidence: 0.93,
    keywords:   [
      'msedcl', 'tata power', 'adani electricity', 'bses', 'best undertaking',
      'torrent power', 'cesc', 'electricity bill', 'eb bill',
      'water bill', 'bwssb', 'mtnl', 'bsnl', 'broadband bill',
      'gas bill', 'mahanagar gas', 'indraprastha gas', 'gujarat gas',
      'internet bill', 'wifi bill', 'telephone bill',
    ],
  },

  // ── Purchases
  {
    category:   'Purchases',
    confidence: 0.88,
    keywords:   [
      'amazon', 'flipkart', 'meesho', 'myntra', 'snapdeal',
      'indiamart', 'tradeindia', 'jiomart', 'nykaa', 'ajio',
      'purchase', 'vendor payment', 'supplier', 'raw material',
      'wholesale', 'procurement',
    ],
  },

  // ── Travel & Transport
  {
    category:   'Travel & Transport',
    confidence: 0.88,
    keywords:   [
      'irctc', 'indian railways', 'uber', 'ola', 'rapido',
      'indigo', 'air india', 'vistara', 'spicejet', 'go air',
      'akasa', 'airline', 'flight', 'bus ticket', 'redbus',
      'makemytrip', 'cleartrip', 'goibibo', 'travel', 'toll',
      'fastag', 'cab',
    ],
  },

  // ── Rent
  {
    category:   'Rent',
    confidence: 0.92,
    keywords:   [
      'rent', 'house rent', 'office rent', 'shop rent',
      'lease payment', 'hra', 'tenancy',
    ],
  },

  // ── Office Supplies
  {
    category:   'Office Supplies',
    confidence: 0.80,
    keywords:   [
      'stationery', 'office supplies', 'printing', 'cartridge',
      'toner', 'paper', 'ink', 'pen', 'notepads',
    ],
  },

  // ── Professional Fees
  {
    category:   'Professional Fees',
    confidence: 0.85,
    keywords:   [
      'professional fee', 'consulting fee', 'consultant', 'legal fee',
      'advocate', 'lawyer', 'auditor', 'audit fee', 'ca fee',
      'accounting fee', 'retainer',
    ],
  },

  // ── Insurance
  {
    category:   'Insurance',
    confidence: 0.90,
    keywords:   [
      'insurance', 'lic', 'icici prudential', 'hdfc life',
      'bajaj allianz', 'star health', 'new india assurance',
      'policy premium', 'premium payment',
    ],
  },

  // ── Loan / EMI
  {
    category:   'Loan / EMI',
    confidence: 0.90,
    keywords:   [
      'emi', 'loan repayment', 'loan emi', 'home loan', 'car loan',
      'personal loan', 'business loan', 'msme loan', 'mudra loan',
      'equated monthly', 'principal repayment', 'interest payment',
    ],
  },
];

// ─── categorizeTransaction ────────────────────────────────────────────────────

/**
 * Two-tier categorisation: infers both payment type and expense category.
 *
 * @param {string} description  – raw transaction description / rawText
 * @returns {{ paymentType: string, expenseCategory: string, confidence: number }}
 */
export function categorizeTransaction(description) {
  if (!description || typeof description !== 'string') {
    return { paymentType: 'Other', expenseCategory: 'Uncategorised', confidence: 0 };
  }

  const lower = description.toLowerCase();

  // ── Infer payment type ─────────────────────────────────────────────────────
  let paymentType = 'Other';
  for (const rule of PAYMENT_TYPE_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        paymentType = rule.type;
        break;
      }
    }
    if (paymentType !== 'Other') break;
  }

  // ── Infer expense category ─────────────────────────────────────────────────
  let expenseCategory = 'Uncategorised';
  let confidence = 0;
  for (const rule of EXPENSE_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        expenseCategory = rule.category;
        confidence = rule.confidence;
        break;
      }
    }
    if (expenseCategory !== 'Uncategorised') break;
  }

  return { paymentType, expenseCategory, confidence };
}
