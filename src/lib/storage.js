// ─────────────────────────────────────────────────────────────────────────────
// LedgerLink – localStorage helper layer
//
// Keys:
//   ll_users        → Array<User>
//   ll_session      → Session | null
//   ll_transactions → Array<Transaction>
//   ll_requests     → Array<Request>
//
// Schemas:
//   User        { id, role ('ca'|'msme'), email, password, name,
//                 firmName?, caNumber?,            ← CA-only
//                 businessName?, gstin?, caEmail?  ← MSME-only }
//
//   Session     { id, role, email, name }
//
//   Transaction { id, clientId, caId, date, description,
//                 amount, type ('debit'|'credit'), category,
//                 overridden (boolean) }
//
//   Request     { id, caId, clientId, period, status ('pending'|'uploaded') }
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = {
  USERS: 'll_users',
  SESSION: 'll_session',
  TRANSACTIONS: 'll_transactions',
  REQUESTS: 'll_requests',
};

// ─── Internal utilities ───────────────────────────────────────────────────────

/**
 * Safely parse a JSON string stored in localStorage.
 * Returns `fallback` when the key is absent or the value is invalid JSON.
 */
function _read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Serialize `value` and write it to localStorage under `key`.
 */
function _write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── initStorage ─────────────────────────────────────────────────────────────

/**
 * Bootstraps localStorage keys that do not yet exist.
 * Call once at app startup (e.g. in main.jsx) before rendering.
 *
 * Safe to call multiple times – existing data is never overwritten.
 */
export function initStorage() {
  if (localStorage.getItem(KEYS.USERS) === null) {
    _write(KEYS.USERS, []);
  }
  if (localStorage.getItem(KEYS.SESSION) === null) {
    _write(KEYS.SESSION, null);
  }
  if (localStorage.getItem(KEYS.TRANSACTIONS) === null) {
    _write(KEYS.TRANSACTIONS, []);
  }
  if (localStorage.getItem(KEYS.REQUESTS) === null) {
    _write(KEYS.REQUESTS, []);
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * Returns the full users array.
 * @returns {Array<Object>}
 */
export function getUsers() {
  return _read(KEYS.USERS, []);
}

/**
 * Persists a user object.
 * - If a user with the same `id` already exists it is replaced (upsert).
 * - If no matching user is found the user is appended.
 *
 * Expected shape (CA):
 *   { id, role: 'ca', email, password, name, firmName, caNumber }
 *
 * Expected shape (MSME):
 *   { id, role: 'msme', email, password, name, businessName, gstin, caEmail }
 *
 * @param {Object} user
 */
export function saveUser(user) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...user };
  } else {
    users.push(user);
  }
  _write(KEYS.USERS, users);
}

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Returns the active session or `null` when no user is logged in.
 * @returns {{ id: string, role: string, email: string, name: string } | null}
 */
export function getSession() {
  return _read(KEYS.SESSION, null);
}

/**
 * Persists the session object for the logged-in user.
 * @param {{ id: string, role: string, email: string, name: string }} session
 */
export function setSession(session) {
  _write(KEYS.SESSION, session);
}

/**
 * Clears the active session (logout).
 */
export function clearSession() {
  _write(KEYS.SESSION, null);
}

// ─── Transactions ─────────────────────────────────────────────────────────────

/**
 * Returns all transactions.
 * Pass an optional predicate to filter inline.
 *
 * @param {((tx: Object) => boolean) | undefined} filterFn
 * @returns {Array<Object>}
 *
 * @example
 * // All transactions for a specific CA
 * getTransactions((tx) => tx.caId === session.id)
 */
export function getTransactions(filterFn) {
  const all = _read(KEYS.TRANSACTIONS, []);
  return typeof filterFn === 'function' ? all.filter(filterFn) : all;
}

/**
 * Persists a transaction object (upsert by `id`).
 *
 * Expected shape:
 *   { id, clientId, caId, date, description, amount,
 *     type: 'debit'|'credit', category, overridden: boolean }
 *
 * @param {Object} transaction
 */
export function saveTransaction(transaction) {
  const transactions = getTransactions();
  const idx = transactions.findIndex((t) => t.id === transaction.id);
  if (idx !== -1) {
    transactions[idx] = { ...transactions[idx], ...transaction };
  } else {
    transactions.push(transaction);
  }
  _write(KEYS.TRANSACTIONS, transactions);
}

// ─── Requests ─────────────────────────────────────────────────────────────────

/**
 * Returns all statement-upload requests.
 * Pass an optional predicate to filter inline.
 *
 * @param {((req: Object) => boolean) | undefined} filterFn
 * @returns {Array<Object>}
 *
 * @example
 * // Pending requests for a specific CA
 * getRequests((r) => r.caId === session.id && r.status === 'pending')
 */
export function getRequests(filterFn) {
  const all = _read(KEYS.REQUESTS, []);
  return typeof filterFn === 'function' ? all.filter(filterFn) : all;
}

/**
 * Persists a request object (upsert by `id`).
 *
 * Expected shape:
 *   { id, caId, clientId, period, status: 'pending'|'uploaded' }
 *
 * @param {Object} request
 */
export function saveRequest(request) {
  const requests = getRequests();
  const idx = requests.findIndex((r) => r.id === request.id);
  if (idx !== -1) {
    requests[idx] = { ...requests[idx], ...request };
  } else {
    requests.push(request);
  }
  _write(KEYS.REQUESTS, requests);
}
