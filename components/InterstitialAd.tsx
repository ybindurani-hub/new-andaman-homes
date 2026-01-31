import React, { useState, useEffect } from 'react';

interface InterstitialAdProps {
  onClose: () => void;
}

const InterstitialAd: React.FC<InterstitialAdProps> = ({ onClose }) => {
  const [canClose, setCanClose] = useState(false);
  const [timer, setTimer] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setCanClose(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-slate-900 text-white p-6 animate-in fade-in duration-500">
      <div className="absolute top-8 right-8">
        <button 
          onClick={canClose ? onClose : undefined}
          className={`p-3 rounded-full flex items-center gap-2 transition-all ${
            canClose ? 'bg-white text-slate-900 shadow-2xl active:scale-90' : 'bg-white/10 text-white/40 cursor-not-allowed'
          }`}
        >
          {canClose ? (
            <>
              <span className="text-[10px] font-black uppercase tracking-widest">Close Ad</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </>
          ) : (
             <span className="text-[10px] font-black uppercase tracking-widest">Wait {timer}s...</span>
          )}
        </button>
      </div>

      <div className="max-w-md w-full space-y-8 text-center">
         <div className="aspect-square bg-white/5 rounded-[3rem] flex items-center justify-center mb-8 border border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-indigo-500/20 group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl">
                 <h2 className="text-4xl font-black text-slate-900">A<span className="text-teal-600">H</span></h2>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-teal-400">Featured App</p>
            </div>
         </div>

         <div className="space-y-3">
           <h2 className="text-4xl font-black tracking-tight leading-tight">Andaman Homes Plus+</h2>
           <p className="text-slate-400 text-sm font-medium leading-relaxed">Unlock premium listings, direct owner chat, and home inspection services with our pro membership.</p>
         </div>

         <button className="w-full bg-teal-500 text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-teal-500/20 transition-all hover:bg-teal-400 active:scale-[0.98]">
           Subscribe Now
         </button>
         
         <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ad • NoBroker Marketplace Simulation</p>
      </div>
    </div>
  );
};

export default InterstitialAd;