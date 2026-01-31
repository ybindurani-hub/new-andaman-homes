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
    <header className="bg-white px-5 py-4 flex justify-between items-center sticky top-0 z-[1100] border-b border-slate-50">
      <div 
        className="cursor-pointer active:scale-95 transition-transform"
        onClick={() => onViewChange('home')}
      >
        <h1 className="text-2xl font-black tracking-tighter">
          <span className="text-[#4CAF50]">Andaman</span>
          <span className="text-slate-900">Homes</span>
        </h1>
      </div>
      
      <button 
        onClick={onOpenLocation}
        className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 active:scale-95 transition-all group"
      >
        <div className="text-[#4CAF50] group-hover:scale-110 transition-transform"><Icons.Location /></div>
        <div className="text-left max-w-[120px]">
           <p className="text-[10px] font-black text-slate-900 truncate leading-none mb-0.5">{currentLocation}</p>
           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter leading-none">Change Locality</p>
        </div>
      </button>
    </header>
  );
};

export default Navbar;