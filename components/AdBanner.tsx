import React, { useState, useEffect } from 'react';

const MOCK_ADS = [
  { id: 1, title: 'Dream Home Awaits!', desc: 'Lowest interest rates on Home Loans starting at 8.4%.', color: 'bg-teal-600' },
  { id: 2, title: 'Professional Movers', desc: 'Book verified packers & movers. 5-star service guaranteed.', color: 'bg-indigo-600' },
  { id: 3, title: 'Interior Design Sale', desc: 'Flat 20% off on all furniture and home decor this week!', color: 'bg-rose-600' },
  { id: 4, title: 'Invest in Land', desc: 'Buy plots in upcoming Port Blair smart city extension.', color: 'bg-emerald-700' }
];

interface AdBannerProps {
  position: 'top' | 'bottom';
  triggerRefresh?: any;
}

const AdBanner: React.FC<AdBannerProps> = ({ position, triggerRefresh }) => {
  const [ad, setAd] = useState(MOCK_ADS[0]);

  useEffect(() => {
    // Refresh ad when trigger changes
    const randomIndex = Math.floor(Math.random() * MOCK_ADS.length);
    setAd(MOCK_ADS[randomIndex]);
  }, [triggerRefresh]);

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 ${position === 'top' ? 'pt-4 mb-2' : 'pt-2 mb-24'}`}>
      <div className={`${ad.color} rounded-2xl p-4 text-white shadow-lg relative overflow-hidden flex items-center justify-between group cursor-pointer transition-transform active:scale-[0.98]`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
        <div className="relative z-10 flex-grow pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-white/20 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/20">Sponsored</span>
            <h4 className="text-xs font-black uppercase tracking-widest leading-none">{ad.title}</h4>
          </div>
          <p className="text-[10px] font-medium opacity-90 line-clamp-1">{ad.desc}</p>
        </div>
        <button className="bg-white text-slate-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap shadow-xl">
          Learn More
        </button>
      </div>
    </div>
  );
};

export default AdBanner;