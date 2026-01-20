import React from 'react';
import { ViewState } from '../types.ts';

interface NavbarProps {
  onViewChange: (view: ViewState) => void;
  currentLocation: string;
}

const Navbar: React.FC<NavbarProps> = ({ onViewChange, currentLocation }) => {
  return (
    <header className="bg-white px-5 py-4 flex justify-between items-center sticky top-0 z-50">
      <div 
        className="cursor-pointer"
        onClick={() => onViewChange('home')}
      >
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-[#4CAF50]">Andaman</span>
          <span className="text-[#1A1C1E]">Homes</span>
        </h1>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold text-[#1A1C1E]">{currentLocation}</span>
      </div>
    </header>
  );
};

export default Navbar;