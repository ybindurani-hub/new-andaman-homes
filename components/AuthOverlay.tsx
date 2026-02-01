
import React, { useState, useEffect } from 'react';
import { signUpWithEmail, signInWithEmail, loginWithGoogleRedirect, getAuthErrorMessage } from '../services/firebase.ts';
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
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setError(''); }, [authMode]);

  if (!isOpen) return null;

  const validate = () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid island email address.');
      return false;
    }
    if (authMode === 'signup' && name.trim().length < 2) {
      setError('Please provide your full name.');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return false;
    }
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
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

  const handleGoogle = async () => {
    setError('');
    setIsRedirecting(true);
    try {
      // Redirect ONLY. Popups are blocked on most mobile environments.
      await loginWithGoogleRedirect();
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
      setIsRedirecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-t-[3rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
        <div className="p-10">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-none">
                {authMode === 'login' ? 'Aloha!' : 'Join Us'}
              </h2>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-3">
                {authMode === 'login' ? 'Login to your dashboard' : 'Create island identity'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              disabled={loading || isRedirecting}
              className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all disabled:opacity-30"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {error && (
            <div className="mb-8 p-5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-2xl text-center border border-rose-100 animate-in zoom-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <input 
                required 
                disabled={loading || isRedirecting} 
                type="text" 
                placeholder="Full Name" 
                className="w-full bg-slate-50 px-6 py-5 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white border-2 border-transparent focus:border-emerald-100 transition-all text-sm disabled:opacity-50" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            )}
            <input 
              required 
              disabled={loading || isRedirecting} 
              type="email" 
              placeholder="Email Address" 
              className="w-full bg-slate-50 px-6 py-5 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white border-2 border-transparent focus:border-emerald-100 transition-all text-sm disabled:opacity-50" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
              required 
              disabled={loading || isRedirecting} 
              type="password" 
              placeholder="Password" 
              className="w-full bg-slate-50 px-6 py-5 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white border-2 border-transparent focus:border-emerald-100 transition-all text-sm disabled:opacity-50" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            
            <button 
              disabled={loading || isRedirecting} 
              type="submit" 
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl disabled:opacity-50 active:scale-95 transition-all mt-4 flex items-center justify-center gap-3"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              {loading ? 'Authenticating...' : authMode === 'login' ? 'Sign In Securely' : 'Create Account'}
            </button>
          </form>

          <div className="my-10 flex items-center gap-5">
            <div className="flex-grow h-px bg-slate-100"></div>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">Secure Link</span>
            <div className="flex-grow h-px bg-slate-100"></div>
          </div>

          <button 
            onClick={handleGoogle} 
            disabled={loading || isRedirecting} 
            className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-100 py-4.5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:border-slate-300 transition-all active:scale-95 disabled:opacity-50 group"
          >
            {isRedirecting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
                <span className="text-slate-900">Redirecting to Google...</span>
              </>
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" alt="" /> 
                <span className="text-slate-500 group-hover:text-slate-900">Sign in with Google</span>
              </>
            )}
          </button>

          <div className="mt-10 text-center">
            <button 
              disabled={loading || isRedirecting}
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} 
              className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-500 transition-colors disabled:opacity-30"
            >
              {authMode === 'login' ? "New islander? Join marketplace" : "Already registered? Login here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthOverlay;
