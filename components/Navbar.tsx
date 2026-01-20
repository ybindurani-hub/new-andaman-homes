
import React from 'react';
import { Icons } from '../constants.tsx';
import { User, ViewState } from '../types.ts';

interface NavbarProps {
  user: User | null;
  onViewChange: (view: ViewState) => void;
  onAuthOpen: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onViewChange, onAuthOpen }) => {
  return (
    <nav className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 md:h-14">
          <div 
            className="flex items-center cursor-pointer group transition-transform active:scale-95"
            onClick={() => onViewChange('home')}
          >
            <div className="bg-teal-600 text-white p-1.5 rounded-lg shadow-lg shadow-teal-500/20 group-hover:bg-teal-500 transition-all">
              <Icons.Home />
            </div>
            <div className="ml-2.5 flex flex-col">
              <span className="text-base font-bold font-display text-white leading-none tracking-tight">
                Andaman<span className="text-teal-400">Homes</span>
              </span>
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5 hidden sm:block">Marketplace</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <button 
              onClick={() => onViewChange('home')}
              className="text-slate-300 hover:text-white font-bold text-[10px] uppercase tracking-[0.15em] transition-colors"
            >
              Discover
            </button>
            <button 
              onClick={() => user ? onViewChange('post') : onAuthOpen()}
              className="group relative overflow-hidden bg-teal-600 text-white px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all hover:bg-teal-500 hover:shadow-lg active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <Icons.Plus />
                Post Property
              </span>
            </button>
            
            <div className="h-4 w-px bg-slate-700"></div>

            {user ? (
              <button 
                onClick={() => onViewChange('profile')}
                className="flex items-center space-x-2 group"
              >
                <div className="text-right">
                  <p className="text-[10px] font-bold text-white leading-none group-hover:text-teal-400 transition-colors">{user.name.split(' ')[0]}</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-teal-400 border border-slate-700 transition-all group-hover:bg-teal-600 group-hover:text-white">
                  <Icons.User />
                </div>
              </button>
            ) : (
              <button 
                onClick={onAuthOpen}
                className="text-slate-300 px-2 py-1.5 font-bold text-[10px] uppercase tracking-[0.2em] border-b border-transparent hover:text-white hover:border-teal-400 transition-all"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center gap-3">
             <button onClick={() => user ? onViewChange('post') : onAuthOpen()} className="p-1.5 text-teal-400 bg-slate-800 rounded-lg border border-slate-700">
                <Icons.Plus />
             </button>
             <button onClick={onAuthOpen} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
                <Icons.User />
             </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
