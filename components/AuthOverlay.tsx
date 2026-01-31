import React, { useState } from 'react';
import { signUpWithEmail, signInWithEmail, loginWithGoogle, sendOTP } from '../services/firebase.ts';
import { getRecaptchaVerifier } from '../services/recaptcha.ts';
import { User } from '../types.ts';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSet: (user: User) => void;
  message?: string;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose, onUserSet, message }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'phone'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let user;
      if (authMode === 'signup') {
        user = await signUpWithEmail(email, password, name);
      } else {
        user = await signInWithEmail(email, password);
      }
      onUserSet(user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      onUserSet(user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const verifier = getRecaptchaVerifier();
      const res = await sendOTP('+91' + phone, verifier);
      setConfirmationResult(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await confirmationResult.confirm(otp);
      const user: User = {
        id: result.user.uid,
        name: result.user.displayName || 'New User',
        email: result.user.email || '',
        phoneNumber: result.user.phoneNumber
      };
      onUserSet(user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-8 pb-4 text-center">
           <div className="w-16 h-16 bg-slate-50 rounded-2xl mx-auto flex items-center justify-center mb-6">
              <h1 className="text-2xl font-black text-slate-900">A<span className="text-[#4CAF50]">H</span></h1>
           </div>
           <h2 className="text-2xl font-black text-slate-900 mb-2">
             {authMode === 'login' ? 'Welcome Back' : authMode === 'signup' ? 'Join Community' : 'Phone Login'}
           </h2>
           <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
             {message || 'Sign in to access premium features'}
           </p>
        </div>

        <div className="px-8 pb-10">
          {error && <div className="mb-4 p-4 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-2xl text-center border border-red-100">{error}</div>}

          {authMode === 'phone' ? (
            <div className="space-y-4">
              {!confirmationResult ? (
                <>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="bg-slate-50 border border-slate-100 px-4 py-4 rounded-2xl font-black text-slate-400">+91</div>
                      <input 
                        type="tel" 
                        placeholder="10-digit number"
                        className="flex-grow bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-[#4CAF50] font-bold text-slate-700"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleSendOTP}
                    disabled={loading || phone.length < 10}
                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-2 text-center">
                    <input 
                      type="text" 
                      placeholder="000000"
                      className="w-full bg-slate-50 border border-slate-100 px-4 py-5 rounded-2xl text-center text-3xl font-black tracking-[0.5em] outline-none text-slate-800"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length < 6}
                    className="w-full bg-[#4CAF50] text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl disabled:opacity-50 active:scale-95 transition-all"
                  >
                    {loading ? 'Verifying...' : 'Sign In Now'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === 'signup' && (
                <input required type="text" placeholder="Your Full Name" className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-[#4CAF50] font-bold text-slate-700" value={name} onChange={(e) => setName(e.target.value)} />
              )}
              <input required type="email" placeholder="Email Address" className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-[#4CAF50] font-bold text-slate-700" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input required type="password" placeholder="Password" className="w-full bg-slate-50 border border-slate-100 px-5 py-4 rounded-2xl outline-none focus:border-[#4CAF50] font-bold text-slate-700" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl disabled:opacity-50 active:scale-95 transition-all">
                {loading ? 'Processing...' : authMode === 'login' ? 'Login to Account' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="my-8 flex items-center gap-4 text-slate-200">
            <div className="flex-grow h-px bg-slate-100"></div>
            <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest">social signin</span>
            <div className="flex-grow h-px bg-slate-100"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleGoogleAuth} className="flex items-center justify-center gap-2 bg-white border-2 border-slate-50 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" /> Google
            </button>
            <button onClick={() => setAuthMode('phone')} className="flex items-center justify-center gap-2 bg-white border-2 border-slate-50 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95">
              Phone
            </button>
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => {
              setAuthMode(authMode === 'login' ? 'signup' : 'login');
              setError('');
            }} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

export default AuthOverlay;