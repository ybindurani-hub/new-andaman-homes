
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
import { Icons } from '../constants.tsx';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSet: (user: User) => void;
}

const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose, onUserSet }) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<'details' | 'otp'>('details');
  
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
  }, [authMode, isOpen]);

  if (!isOpen) return null;

  const handlePhoneInput = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
  };

  const handleInitiateAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (phone.length !== 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    const formattedPhone = `+91${phone}`;
    setLoading(true);

    try {
      const existingUser = await checkUserByPhone(formattedPhone);
      
      if (authMode === 'login' && !existingUser) {
        throw { code: 'user-not-found' };
      }
      if (authMode === 'signup' && existingUser) {
        throw { code: 'user-exists' };
      }
      if (authMode === 'signup' && (!name.trim() || !email.trim())) {
        setError('Complete all fields to join.');
        setLoading(false);
        return;
      }

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

  const handleFinalizeAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    
    setLoading(true);
    setError('');
    try {
      const result = await confirmResult.confirm(otp);
      const firebaseUser = result.user;

      if (authMode === 'signup') {
        await updateProfile(firebaseUser, { displayName: name });
        const newUser: User = {
          id: firebaseUser.uid,
          name: name,
          email: email,
          phoneNumber: `+91${phone}`
        };
        await syncUserToFirestore(newUser);
        onUserSet(newUser);
      } else {
        const existingData = await checkUserByPhone(`+91${phone}`);
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
    <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-md rounded-t-[3.5rem] sm:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-12 duration-700">
        <div className="p-8 sm:p-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-none">
                {step === 'otp' ? 'Verification' : authMode === 'login' ? 'Market Access' : 'Register Identity'}
              </h2>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-2">
                {step === 'otp' ? `Verify +91 ${phone}` : 'Premium Property Marketplace'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              disabled={loading}
              className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-100 disabled:opacity-30 active:scale-90"
            >
              <Icons.Close />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.1em] rounded-2xl text-center border border-rose-100 flex items-center justify-center gap-2 animate-in zoom-in duration-300">
              <span className="w-1 h-1 bg-rose-400 rounded-full"></span>
              {error}
              <span className="w-1 h-1 bg-rose-400 rounded-full"></span>
            </div>
          )}

          {/* Form Content */}
          {step === 'details' ? (
            <div className="space-y-8">
              {/* Toggle */}
              <div className="bg-slate-50 p-1.5 rounded-2xl flex">
                 <button 
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'login' ? 'bg-white shadow-xl text-slate-900' : 'text-slate-400'}`}
                 >
                   Sign In
                 </button>
                 <button 
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMode === 'signup' ? 'bg-white shadow-xl text-slate-900' : 'text-slate-400'}`}
                 >
                   Register
                 </button>
              </div>

              <form onSubmit={handleInitiateAuth} className="space-y-5">
                {authMode === 'signup' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">Full Name</label>
                      <input 
                        required 
                        type="text" 
                        placeholder="e.g. Rahul Sharma" 
                        className="w-full bg-slate-50 px-8 py-5 rounded-[1.5rem] outline-none font-bold text-slate-700 focus:bg-white border-2 border-transparent focus:border-emerald-100 transition-all" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">Email Address</label>
                      <input 
                        required 
                        type="email" 
                        placeholder="you@example.com" 
                        className="w-full bg-slate-50 px-8 py-5 rounded-[1.5rem] outline-none font-bold text-slate-700 focus:bg-white border-2 border-transparent focus:border-emerald-100 transition-all" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">Mobile Identity</label>
                  <div className="relative">
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 font-black">+91</span>
                    <input 
                      required 
                      type="tel" 
                      placeholder="99332 XXXXX" 
                      className="w-full bg-slate-50 px-8 pl-20 py-5 rounded-[1.5rem] outline-none font-black text-slate-900 tracking-widest focus:bg-white border-2 border-transparent focus:border-emerald-100 transition-all" 
                      value={phone} 
                      onChange={(e) => handlePhoneInput(e.target.value)} 
                    />
                  </div>
                </div>
                
                <button 
                  disabled={loading || phone.length < 10} 
                  type="submit" 
                  className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-slate-900/20 disabled:opacity-50 active:scale-95 transition-all mt-6 flex items-center justify-center gap-4 group"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
                  {loading ? 'Authenticating...' : (
                    <>
                      Verify Mobile <div className="group-hover:translate-x-1 transition-transform"><Icons.ChevronRight /></div>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleFinalizeAuth} className="space-y-8 animate-in zoom-in duration-500">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center block">Authentication PIN</label>
                <input 
                  required 
                  type="text" 
                  maxLength={6}
                  placeholder="0 0 0 0 0 0" 
                  className="w-full bg-slate-50 px-6 py-8 rounded-[2rem] outline-none font-black text-slate-900 text-center tracking-[0.8em] text-3xl focus:bg-white border-2 border-transparent focus:border-emerald-200 transition-all shadow-inner" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                  autoFocus
                />
              </div>

              <div className="space-y-4">
                <button 
                  disabled={loading || otp.length < 6} 
                  type="submit" 
                  className="w-full bg-emerald-500 text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-emerald-500/20 disabled:opacity-50 active:scale-95 transition-all"
                >
                  Complete Secure Login
                </button>
                <button 
                  type="button"
                  onClick={() => setStep('details')}
                  className="w-full text-center text-[9px] font-black uppercase text-slate-300 tracking-[0.3em] hover:text-slate-900 transition-colors"
                >
                  Edit Number or Retry
                </button>
              </div>
            </form>
          )}

          <div className="mt-12 text-center pt-10 border-t border-slate-50">
            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-loose max-w-[200px] mx-auto">
              By continuing, you agree to Andaman Homes' 
              <span className="text-slate-900"> Terms & Privacy Framework</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthOverlay;
