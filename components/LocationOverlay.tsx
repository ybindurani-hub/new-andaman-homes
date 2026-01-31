import React, { useState, useEffect } from 'react';
import { Icons, STATES_DATA } from '../constants.tsx';

interface LocationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: string) => void;
  currentLocation: string;
}

const LocationOverlay: React.FC<LocationOverlayProps> = ({ isOpen, onClose, onSelect, currentLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('recent_locations');
    if (saved) setRecentLocations(JSON.parse(saved));
  }, []);

  const handleSelect = (loc: string) => {
    onSelect(loc);
    const updated = [loc, ...recentLocations.filter(r => r !== loc)].slice(0, 5);
    setRecentLocations(updated);
    localStorage.setItem('recent_locations', JSON.stringify(updated));
    onClose();
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Simulation of reverse geocoding
          handleSelect('Port Blair, Andaman & Nicobar Islands');
        },
        (error) => {
          alert("Location access denied. Please select manually.");
        }
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1500] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100">
        <button onClick={onClose} className="p-1">
          <Icons.Close />
        </button>
        <h2 className="text-xl font-black text-slate-900">Location</h2>
      </div>

      {/* Search Input */}
      <div className="px-4 py-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-[#4CAF50]">
            <Icons.Search />
          </div>
          <input 
            type="text" 
            placeholder="Search city, area or neighbourhood"
            className="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#4CAF50] focus:bg-white py-4 pl-12 pr-6 rounded-xl outline-none transition-all font-bold text-slate-700 text-sm placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="flex-grow overflow-y-auto">
        {/* Current Location Trigger */}
        <button 
          onClick={handleUseCurrentLocation}
          className="w-full flex items-center gap-4 px-6 py-6 border-b border-slate-50 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <div className="text-blue-600 scale-125">
            <Icons.Target />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-blue-600">Use current location</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Phoenix Bay, Sri Vijaya Puram</p>
          </div>
        </button>

        {/* Recently Used */}
        {recentLocations.length > 0 && !searchQuery && (
          <div className="py-6">
            <h3 className="px-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Recently Used</h3>
            {recentLocations.map((loc, idx) => (
              <button 
                key={idx} 
                onClick={() => handleSelect(loc)}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 border-b border-slate-50/50"
              >
                <div className="text-slate-400 scale-110">
                  <Icons.Location />
                </div>
                <span className="text-sm font-bold text-slate-700">{loc}</span>
              </button>
            ))}
          </div>
        )}

        {/* State Browser */}
        {!searchQuery && (
          <div className="pb-32">
            <h3 className="px-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Choose State</h3>
            <button 
              onClick={() => handleSelect('All in India')}
              className="w-full text-left px-6 py-4 text-sm font-black text-blue-600 border-b border-slate-50"
            >
              All in India
            </button>
            
            {STATES_DATA.map((state, idx) => (
              <div key={idx}>
                <button 
                  onClick={() => setSelectedState(selectedState === state.name ? null : state.name)}
                  className="w-full flex items-center justify-between px-6 py-5 border-b border-slate-50 hover:bg-slate-50 group"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{state.name}</span>
                  <div className={`transition-transform duration-300 ${selectedState === state.name ? 'rotate-90' : ''}`}>
                    <Icons.ChevronRight />
                  </div>
                </button>
                {selectedState === state.name && (
                  <div className="bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                    {state.cities.map((city, cIdx) => (
                      <button 
                        key={cIdx} 
                        onClick={() => handleSelect(`${city}, ${state.name}`)}
                        className="w-full text-left px-12 py-4 text-sm font-medium text-slate-600 border-b border-slate-100 hover:text-slate-900"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Search Results Mockup */}
        {searchQuery && (
          <div className="px-6 py-4 space-y-4">
             {['Aberdeen Bazaar', 'Port Blair', 'Junglighat'].filter(n => n.toLowerCase().includes(searchQuery.toLowerCase())).map((res, i) => (
               <button 
                key={i} 
                onClick={() => handleSelect(`${res}, Andaman & Nicobar Islands`)}
                className="w-full flex items-center gap-4 py-4 border-b border-slate-50 group"
              >
                <div className="text-slate-300 group-hover:text-slate-500"><Icons.Location /></div>
                <span className="text-sm font-bold text-slate-700">{res}, Andaman</span>
              </button>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationOverlay;