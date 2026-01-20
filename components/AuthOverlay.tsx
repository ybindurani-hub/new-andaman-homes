
import React, { useState, useEffect } from 'react';
import { signUpWithEmail, signInWithEmail, loginWithGoogle, sendOTP, setupRecaptcha } from '../services/firebase';
import { User } from '../types';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSet: (user: User) => void;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose, onUserSet }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'phone'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setupRecaptcha('recaptcha-container'), 500);
    }
  }, [isOpen]);

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
      const res = await sendOTP('+91' + phone);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div id="recaptcha-container"></div>
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="relative h-24 bg-slate-900 flex items-center justify-center text-white overflow-hidden">
           <h2 className="text-xl font-display font-bold relative z-10">Andaman<span className="text-teal-400">Homes</span></h2>
           <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div className="p-8">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl">{error}</div>}

          {authMode === 'phone' ? (
            <div className="space-y-4">
              {!confirmationResult ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile Number</label>
                    <div className="flex gap-2">
                      <span className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl font-bold">+91</span>
                      <input 
                        type="tel" 
                        placeholder="Enter 10-digit number"
                        className="flex-grow bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-teal-500 font-bold"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleSendOTP}
                    disabled={loading || phone.length < 10}
                    className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold hover:bg-teal-500 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Verification Code'}
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-2 text-center">
                    <p className="text-xs text-slate-500 font-medium">Enter the 6-digit code sent to your phone</p>
                    <input 
                      type="text" 
                      placeholder="000000"
                      className="w-full bg-slate-50 border border-slate-100 px-4 py-4 rounded-xl text-center text-2xl font-black tracking-[0.5em] outline-none"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length < 6}
                    className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold hover:bg-teal-500 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input required type="text" placeholder="John Doe" className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-teal-500 font-bold" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                <input required type="email" placeholder="john@example.com" className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-teal-500 font-bold" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                <input required type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl outline-none focus:border-teal-500 font-bold" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all text-xs uppercase tracking-widest disabled:opacity-50">
                {loading ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          )}

          <div className="my-6 flex items-center gap-4">
            <div className="flex-grow h-px bg-slate-100"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase">or continue with</span>
            <div className="flex-grow h-px bg-slate-100"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleGoogleAuth} className="flex items-center justify-center gap-2 bg-white border border-slate-100 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" /> Google
            </button>
            <button onClick={() => setAuthMode('phone')} className="flex items-center justify-center gap-2 bg-white border border-slate-100 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
              Phone
            </button>
          </div>

          <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="ml-2 text-teal-600 hover:text-teal-700 underline">
              {authMode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthOverlay;
