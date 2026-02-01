import React from 'react';
import { ViewState } from '../types.ts';
import { Icons } from '../constants.tsx';

interface NavbarProps {
  onViewChange: (view: ViewState) => void;
  onOpenLocation: () => void;
  currentLocation: string;
}

const Navbar: React.FC<NavbarProps> = ({ onViewChange, onOpenLocation, currentLocation }) => {
  return (
    <header className="bg-white/80 backdrop-blur-3xl px-6 py-5 flex justify-between items-center sticky top-0 z-[1100] border-b border-slate-50">
      <div 
        className="cursor-pointer active:scale-95 transition-transform flex items-center gap-3"
        onClick={() => onViewChange('home')}
      >
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-slate-900/10">A</div>
        <h1 className="text-2xl font-black tracking-tighter hidden sm:block">
          <span className="text-emerald-500">Andaman</span>
          <span className="text-slate-900">Homes</span>
        </h1>
      </div>
      
      <button 
        onClick={onOpenLocation}
        className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 active:scale-95 hover:bg-slate-100 transition-all group"
      >
        <div className="text-emerald-500 group-hover:scale-110 transition-transform"><Icons.Location /></div>
        <div className="text-left max-w-[140px]">
           <p className="text-[11px] font-black text-slate-900 truncate leading-none mb-1">{currentLocation}</p>
           <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest leading-none">Choose Location</p>
        </div>
      </button>
    </header>
  );
};

export default Navbar;