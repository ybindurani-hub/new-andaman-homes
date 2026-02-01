
import React, { useState, useEffect } from 'react';
import { 
  getAuthErrorMessage, 
  setupRecaptcha, 
  sendOtp, 
  checkUserByPhone,
  syncUserToFirestore 
} from '../services/firebase.ts';
import { User } from '../types.ts';
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSet: (user: User) => void;
  message?: string;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose, onUserSet }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'details' | 'otp'>('details');
  
  // Fields
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);

  useEffect(() => { 
    setError(''); 
    setStep('details');
    setOtp('');
  }, [authMode]);

  if (!isOpen) return null;

  const formatPhone = (p: string) => {
    const cleaned = p.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length > 10) return `+${cleaned}`;
    return `+91${cleaned.slice(-10)}`;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const formattedPhone = formatPhone(phone);
    if (phone.length < 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      // 1. Enforce "Register First" Rule
      const existingUser = await checkUserByPhone(formattedPhone);
      
      if (authMode === 'login' && !existingUser) {
        throw { code: 'user-not-found' };
      }
      if (authMode === 'signup' && existingUser) {
        throw { code: 'user-exists' };
      }
      if (authMode === 'signup' && (!name.trim() || !email.trim())) {
        setError('Name and Email are required for signup.');
        setLoading(false);
        return;
      }

      // 2. Setup Recaptcha and Send OTP
      const verifier = setupRecaptcha('recaptcha-container');
      const result = await sendOtp(formattedPhone, verifier);
      setConfirmResult(result);
      setStep('otp');
    } catch (err: any) {
      console.error(err);
      setError(getAuthErrorMessage(err.code || 'default'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    
    setLoading(true);
    setError('');
    try {
      const result = await confirmResult.confirm(otp);
      const firebaseUser = result.user;

      if (authMode === 'signup') {
        // Update Firebase profile
        await updateProfile(firebaseUser, { displayName: name });
        
        // Sync to Firestore
        const newUser: User = {
          id: firebaseUser.uid,
          name: name,
          email: email,
          phoneNumber: formatPhone(phone)
        };
        await syncUserToFirestore(newUser);
        onUserSet(newUser);
      } else {
        // Existing user - fetch profile
        const existingData = await checkUserByPhone(formatPhone(phone));
        if (existingData) {
          onUserSet(existingData);
        }
      }
      onClose();
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code || 'default'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-t-[3rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
        <div className="p-8 sm:p-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                {step === 'otp' ? 'Enter OTP' : authMode === 'login' ? 'Welcome Back' : 'Create Identity'}
              </h2>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mt-3">
                {step === 'otp' ? `Sent to +91 ${phone.slice(-10)}` : authMode === 'login' ? 'Login via Mobile OTP' : 'Register with Email & Mobile'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              disabled={loading}
              className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all disabled:opacity-30"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-2xl text-center border border-rose-100 animate-in zoom-in duration-200">
              {error}
            </div>
          )}

          {step === 'details' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {authMode === 'signup' && (
                <>
                  <input 
                    required 
                    type="text" 
                    placeholder="Full Name" 
                    className="w-full bg-slate-50 px-6 py-4.5 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white border-2 border-transparent focus:border-emerald-100 transition-all text-sm" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                  />
                  <input 
                    required 
                    type="email" 
                    placeholder="Email Address" 
                    className="w-full bg-slate-50 px-6 py-4.5 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white border-2 border-transparent focus:border-emerald-100 transition-all text-sm" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </>
              )}
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-sm">+91</span>
                <input 
                  required 
                  type="tel" 
                  maxLength={10}
                  placeholder="Mobile Number" 
                  className="w-full bg-slate-50 px-6 pl-14 py-4.5 rounded-2xl outline-none font-bold text-slate-700 focus:bg-white border-2 border-transparent focus:border-emerald-100 transition-all text-sm" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} 
                />
              </div>
              
              <button 
                disabled={loading} 
                type="submit" 
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl disabled:opacity-50 active:scale-95 transition-all mt-4 flex items-center justify-center gap-3"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                {loading ? 'Processing...' : 'Send Verification OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input 
                required 
                type="text" 
                maxLength={6}
                placeholder="6-Digit OTP" 
                className="w-full bg-slate-50 px-6 py-5 rounded-2xl outline-none font-black text-slate-900 text-center tracking-[1em] text-xl focus:bg-white border-2 border-transparent focus:border-emerald-100 transition-all" 
                value={otp} 
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                autoFocus
              />
              <button 
                disabled={loading || otp.length < 6} 
                type="submit" 
                className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl disabled:opacity-50 active:scale-95 transition-all mt-4"
              >
                Verify & Continue
              </button>
              <button 
                type="button"
                onClick={() => setStep('details')}
                className="w-full text-center text-[9px] font-black uppercase text-slate-300 tracking-widest mt-2"
              >
                Wrong number? Edit Phone
              </button>
            </form>
          )}

          <div className="mt-10 text-center pt-8 border-t border-slate-50">
            <button 
              disabled={loading}
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
