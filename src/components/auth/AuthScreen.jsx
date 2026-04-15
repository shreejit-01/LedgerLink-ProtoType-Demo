import { useState } from 'react';
import { getUsers, saveUser, setSession } from '../../lib/storage';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function InputField({ id, label, type = 'text', value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-slate-400">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none ring-0 transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
      />
    </div>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const users = getUsers();
    const user  = users.find((u) => u.email === email.trim().toLowerCase());

    if (!user || user.password !== password) {
      setError('Invalid email or password.');
      return;
    }

    const session = { id: user.id, role: user.role, email: user.email, name: user.name };
    setSession(session);
    onSuccess(session);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <InputField
        id="login-email"
        label="Email address"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
      />
      <InputField
        id="login-password"
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="••••••••"
      />

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-1 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
      >
        Sign in
      </button>
    </form>
  );
}

// ─── Register form ────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }) {
  const [role, setRole]               = useState('ca');
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  // CA-only
  const [firmName, setFirmName]       = useState('');
  const [caNumber, setCaNumber]       = useState('');
  // MSME-only
  const [businessName, setBusiness]   = useState('');
  const [gstin, setGstin]             = useState('');
  const [caEmail, setCaEmail]         = useState('');
  const [error, setError]             = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimEmail = email.trim().toLowerCase();
    const existing  = getUsers().find((u) => u.email === trimEmail);
    if (existing) { setError('An account with this email already exists.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    const base = { id: uid(), role, email: trimEmail, password, name: name.trim() };
    const user  =
      role === 'ca'
        ? { ...base, firmName: firmName.trim(), caNumber: caNumber.trim() }
        : { ...base, businessName: businessName.trim(), gstin: gstin.trim().toUpperCase(), caEmail: caEmail.trim().toLowerCase() };

    saveUser(user);

    const session = { id: user.id, role: user.role, email: user.email, name: user.name };
    setSession(session);
    onSuccess(session);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Role toggle */}
      <div className="flex overflow-hidden rounded-lg border border-slate-700">
        {[
          { value: 'ca',   label: '⚖️ Chartered Accountant' },
          { value: 'msme', label: '🏪 Local Business'       },
        ].map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setRole(value)}
            className={`flex-1 py-2 text-xs font-semibold transition ${
              role === value
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <InputField id="reg-name"     label="Full name"       value={name}     onChange={setName}     placeholder="Ravi Kumar" />
      <InputField id="reg-email"    label="Email address"   type="email" value={email}    onChange={setEmail}    placeholder="you@example.com" />
      <InputField id="reg-password" label="Password"        type="password" value={password} onChange={setPassword} placeholder="Min. 6 characters" />

      {role === 'ca' && (
        <>
          <InputField id="reg-firm"     label="Firm name"   value={firmName} onChange={setFirmName} placeholder="Sharma & Associates" />
          <InputField id="reg-ca-num"   label="CA number"   value={caNumber} onChange={setCaNumber} placeholder="MRN-XXXXXX" />
        </>
      )}

      {role === 'msme' && (
        <>
          <InputField id="reg-biz"      label="Business name"  value={businessName} onChange={setBusiness} placeholder="Patel Traders" />
          <InputField id="reg-gstin"    label="GSTIN"          value={gstin}        onChange={setGstin}    placeholder="27AAAAA0000A1Z5" />
          <InputField id="reg-ca-email" label="Your CA's email" type="email" value={caEmail} onChange={setCaEmail} placeholder="ca@example.com" />
        </>
      )}

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-1 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
      >
        Create account
      </button>
    </form>
  );
}

// ─── AuthScreen ───────────────────────────────────────────────────────────────

/**
 * Full-page auth screen with Login / Register tabs.
 *
 * Props:
 *   onAuthSuccess  {(session) => void}  – called once session is written to storage
 */
export default function AuthScreen({ onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      {/* Glow backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-lg font-black text-white shadow-lg shadow-indigo-900/40">
            LL
          </span>
          <h1 className="text-xl font-bold tracking-tight text-white">LedgerLink</h1>
          <p className="text-xs text-slate-500">Connecting CAs & Businesses</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-sm">
          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-lg bg-slate-800/60 p-1">
            {[
              { key: 'login',    label: 'Sign in'  },
              { key: 'register', label: 'Register' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                  tab === key
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'login'
            ? <LoginForm    onSuccess={onAuthSuccess} />
            : <RegisterForm onSuccess={onAuthSuccess} />
          }
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-600">
          Data is stored locally in your browser — no server required.
        </p>
      </div>
    </div>
  );
}
