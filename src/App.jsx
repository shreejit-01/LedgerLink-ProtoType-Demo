import { useState } from 'react';
import { getSession, clearSession } from './lib/storage';
import AuthScreen    from './components/auth/AuthScreen';
import CADashboard   from './components/ca/CADashboard';
import MSMEDashboard from './components/msme/MSMEDashboard';

/**
 * App — root component.
 *
 * State machine (all via useState, no routing library):
 *
 *   session === null          → <AuthScreen />
 *   session.role === 'ca'     → <CADashboard />
 *   session.role === 'msme'   → <MSMEDashboard />
 *
 * The session object is hydrated from localStorage on first render so that
 * a page refresh keeps the user logged in.
 */
export default function App() {
  // Initialise from whatever is already in localStorage (null if no one is logged in)
  const [session, setSession] = useState(() => getSession());

  // Called by AuthScreen once login / register succeeds
  const handleAuthSuccess = (newSession) => {
    setSession(newSession);
  };

  // Called by the "Sign out" button in either dashboard
  const handleLogout = () => {
    clearSession();   // wipe localStorage
    setSession(null); // return to auth screen
  };

  // ── No session → show auth ───────────────────────────────────────────────
  if (!session) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // ── CA portal ────────────────────────────────────────────────────────────
  if (session.role === 'ca') {
    return <CADashboard session={session} onLogout={handleLogout} />;
  }

  // ── MSME portal ──────────────────────────────────────────────────────────
  if (session.role === 'msme') {
    return <MSMEDashboard session={session} onLogout={handleLogout} />;
  }

  // Fallback: corrupt session — clear and restart
  clearSession();
  return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
}
