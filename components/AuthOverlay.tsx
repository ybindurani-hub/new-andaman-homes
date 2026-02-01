import React, { useState, useEffect } from 'react';
import { signUpWithEmail, signInWithEmail, loginWithGoogle, getAuthErrorMessage } from '../services/firebase.ts';
import { User } from '../types.ts';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSet: (user: User) => void;
  message?: string;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose, onUserSet, message }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setError(''); }, [authMode]);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Strong validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email.');
      return;
    }
    if (authMode === 'signup' && name.trim().length < 2) {
      setError('Full name is required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const user = authMode === 'signup' 
        ? await signUpWithEmail(email, password, name)
        : await signInWithEmail(email, password);
      onUserSet(user);
      onClose();
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col bg-white animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <div className="flex-grow flex flex-col overflow-y-auto px-8 py-20 relative">
        <button 
          onClick={onClose}
          disabled={loading}
          className="absolute top-8 right-8 p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 active:scale-90 disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="mb-12 text-center max-w-sm mx-auto">
           <div className="w-20 h-20 bg-slate-900 rounded-[2rem] mx-auto flex items-center justify-center mb-8 shadow-2xl">
              <h1 className="text-3xl font-black text-white">A<span className="text-emerald-500">H</span></h1>
           </div>
           <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">
             {authMode === 'login' ? 'Welcome Back' : 'Join the Community'}
           </h2>
           <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] leading-relaxed">
             {message || 'The islands leading real estate marketplace'}
           </p>
        </div>

        <div className="w-full max-w-sm mx-auto">
          {error && (
            <div className="mb-6 p-5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-3xl text-center border border-rose-100 animate-in zoom-in">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <input required disabled={loading} type="text" placeholder="Full Name" className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-100 focus:bg-white px-8 py-5 rounded-[1.8rem] outline-none font-bold text-slate-700 transition-all disabled:opacity-50" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <input required disabled={loading} type="email" placeholder="Email Address" className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-100 focus:bg-white px-8 py-5 rounded-[1.8rem] outline-none font-bold text-slate-700 transition-all disabled:opacity-50" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input required disabled={loading} type="password" placeholder="Password (8+ chars)" className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-100 focus:bg-white px-8 py-5 rounded-[1.8rem] outline-none font-bold text-slate-700 transition-all disabled:opacity-50" value={password} onChange={(e) => setPassword(e.target.value)} />
            
            <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[1.8rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl disabled:opacity-50 active:scale-95 transition-all mt-6 flex items-center justify-center gap-3">
              {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              {loading ? 'Securing Session...' : authMode === 'login' ? 'Login Securely' : 'Sign Up Free'}
            </button>
          </form>

          <div className="my-10 flex items-center gap-6">
            <div className="flex-grow h-px bg-slate-100"></div>
            <span className="text-[9px] font-black uppercase text-slate-300 tracking-[0.4em]">or</span>
            <div className="flex-grow h-px bg-slate-100"></div>
          </div>

          <button onClick={() => loginWithGoogle().then(() => onClose())} disabled={loading} className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-50 py-5 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50">
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" /> 
            Continue with Google
          </button>

          <div className="mt-12 text-center pb-10">
            <button disabled={loading} onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-500 transition-colors">
              {authMode === 'login' ? "New around here? Create Account" : "Already a member? Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthOverlay;