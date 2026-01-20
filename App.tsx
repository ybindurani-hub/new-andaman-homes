import React, { useState, useEffect } from 'react';
import { auth, getListings, addListing, logout, getFavorites, toggleFavorite } from './services/firebase.ts';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { User, PropertyListing, ViewState } from './types.ts';
import Navbar from './components/Navbar.tsx';
import ListingCard from './components/ListingCard.tsx';
import ListingForm from './components/ListingForm.tsx';
import AuthOverlay from './components/AuthOverlay.tsx';
import ChatOverlay from './components/ChatOverlay.tsx';
import { Icons } from './constants.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'RENT' | 'SALE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined
        };
        setUser(userData);
        try {
          const favs = await getFavorites(userData.id);
          setFavorites(favs);
        } catch (e) { console.error("Favs load error:", e); }
      } else {
        setUser(null);
        setFavorites([]);
      }
    }, (error) => {
      if (error.message.includes('unauthorized-domain')) {
        setAuthError(`Auth Error: This domain ('${window.location.hostname}') is not authorized in Firebase Console. Please add it to your Authorized Domains.`);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAllListings = async () => {
    setLoading(true);
    try {
      const data = await getListings();
      setListings(data);
    } catch (err) {
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllListings();
  }, []);

  const handleFavoriteToggle = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    const newFavs = await toggleFavorite(user.id, listingId);
    setFavorites(newFavs);
  };

  const filteredListings = listings.filter(l => {
    const title = (l.title || '').toLowerCase();
    const loc = (l.location || '').toLowerCase();
    const matchesSearch = title.includes(searchQuery.toLowerCase()) || loc.includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'ALL' || 
                          (filterType === 'RENT' && l.category.toLowerCase().includes('rent')) ||
                          (filterType === 'SALE' && l.category.toLowerCase().includes('sale'));
    return matchesSearch && matchesFilter;
  });

  const renderHome = () => (
    <div className="pb-32 bg-white min-h-screen">
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2">
            <div className="bg-white/20 p-1 rounded-full"><Icons.Plus /></div>
            {successMessage}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-5 mt-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-5 flex items-center text-[#B0B8C1] pointer-events-none">
            <Icons.Search />
          </div>
          <input 
            type="text" 
            placeholder="Search Port Blair, Havelock, etc..." 
            className="w-full bg-[#F1F3F5] border-none rounded-2xl py-4 pl-14 pr-6 outline-none shadow-none focus:ring-1 focus:ring-green-100 transition-all font-medium text-slate-700 text-lg placeholder:text-[#A0A8B0]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="max-w-7xl mx-auto px-5 mt-8 flex gap-3 overflow-x-auto no-scrollbar">
        {(['ALL', 'RENT', 'SALE'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-10 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
              filterType === type 
                ? 'bg-[#4CAF50] text-white shadow-md' 
                : 'bg-[#F1F3F5] text-[#808A93] hover:bg-slate-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-5 mt-10">
        <div className="grid grid-cols-2 gap-4">
          {filteredListings.map(listing => (
            <ListingCard 
              key={listing.id} 
              listing={listing} 
              isFavorited={favorites.includes(listing.id)}
              onFavoriteToggle={handleFavoriteToggle}
              onClick={(l) => {
                setSelectedListing(l);
                setCurrentView('details');
              }} 
            />
          ))}
        </div>
        
        {filteredListings.length === 0 && !loading && (
          <div className="py-20 text-center">
            <p className="text-slate-300 font-bold text-xs uppercase tracking-widest">No matching results found</p>
          </div>
        )}
      </div>
    </div>
  );

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-50 px-4 pt-3 pb-6 z-[100] shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
      <div className="max-w-lg mx-auto flex items-end justify-between relative h-16">
        <button 
          onClick={() => setCurrentView('home')}
          className="flex flex-col items-center flex-1"
        >
          <div className="mb-1"><Icons.Home active={currentView === 'home'} /></div>
          <span className={`text-[11px] font-bold ${currentView === 'home' ? 'text-green-600' : 'text-[#A0A8B0]'}`}>Home</span>
        </button>
        
        <button 
          onClick={() => {
            if (!user) setIsAuthOpen(true);
            else setCurrentView('profile');
          }}
          className="flex flex-col items-center flex-1"
        >
          <div className="mb-1"><Icons.Heart filled={false} /></div>
          <span className="text-[11px] font-bold text-[#A0A8B0]">Saved</span>
        </button>

        <div className="flex-1 flex justify-center pb-2">
          <div className="absolute -top-12 bg-white p-2.5 rounded-full shadow-lg">
            <button 
              onClick={() => {
                if (!user) {
                  setIsAuthOpen(true);
                } else {
                  setCurrentView('post');
                }
              }}
              className="w-16 h-16 bg-[#4CAF50] rounded-full flex flex-col items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
            >
              <div className="mt-1"><Icons.Plus /></div>
              <span className="text-[10px] font-black uppercase tracking-tighter -mt-0.5">Sell</span>
            </button>
          </div>
        </div>

        <button 
          onClick={() => {
            if (!user) setIsAuthOpen(true);
            else setCurrentView('profile');
          }}
          className="flex flex-col items-center flex-1"
        >
          <div className="mb-1"><Icons.List active={false} /></div>
          <span className="text-[11px] font-bold text-[#A0A8B0]">My Ads</span>
        </button>

        <button 
          onClick={() => {
            if (!user) setIsAuthOpen(true);
            else setCurrentView('profile');
          }}
          className="flex flex-col items-center flex-1"
        >
          <div className="mb-1"><Icons.User active={currentView === 'profile'} /></div>
          <span className={`text-[11px] font-bold ${currentView === 'profile' ? 'text-green-600' : 'text-[#A0A8B0]'}`}>Account</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-green-100">
      {authError && (
        <div className="bg-red-500 text-white p-4 text-center text-sm font-bold sticky top-0 z-[200]">
          {authError}
        </div>
      )}
      
      <Navbar onViewChange={setCurrentView} currentLocation="Port Blair" />
      
      <main className="max-w-7xl mx-auto">
        {currentView === 'home' && renderHome()}
        {currentView === 'post' && (
          <ListingForm 
            onSubmit={async (data) => {
              if (!user) {
                setIsAuthOpen(true);
                return;
              }
              try {
                const newListing = await addListing(data, user);
                // Immediately update locally
                setListings(prev => [newListing, ...prev]);
                setCurrentView('home');
                setSuccessMessage("Listing published successfully!");
                setTimeout(() => setSuccessMessage(null), 3000);
              } catch (e) {
                console.error("Post listing error:", e);
                throw e; // Let ListingForm handle the error UI
              }
            }} 
            onCancel={() => setCurrentView('home')} 
          />
        )}
        {currentView === 'details' && selectedListing && (
          <div className="px-5 py-6 pb-32">
             <button 
               onClick={() => setCurrentView('home')}
               className="mb-6 text-xs font-black text-[#B0B8C1] uppercase tracking-widest flex items-center gap-2"
             >
               ← Back
             </button>
             <div className="max-w-md mx-auto">
               <ListingCard listing={selectedListing} onClick={() => {}} />
               <div className="mt-8 bg-white p-2 space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900">{selectedListing.title}</h2>
                    <p className="text-slate-400 text-base leading-relaxed font-medium">{selectedListing.description}</p>
                  </div>
                  
                  <div className="flex gap-4">
                    <a href={`tel:${selectedListing.contactNumber}`} className="flex-1 bg-green-600 text-white text-center py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-green-100">Call Now</a>
                    <button onClick={() => {
                      if (!user) setIsAuthOpen(true);
                      else setIsChatOpen(true);
                    }} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-slate-100">Chat</button>
                  </div>
               </div>
             </div>
          </div>
        )}
        {currentView === 'profile' && user && (
          <div className="p-10 pb-32 text-center">
             <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full mx-auto flex items-center justify-center mb-6 shadow-sm">
               <Icons.User active />
             </div>
             <h2 className="text-2xl font-black text-slate-900 mb-1">{user.name}</h2>
             <p className="text-slate-400 font-bold text-sm mb-10">{user.email}</p>
             <button 
               onClick={async () => { await logout(); setUser(null); setCurrentView('home'); }}
               className="w-full max-w-xs bg-red-50 text-red-500 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-100 transition-colors"
             >
               Sign Out
             </button>
          </div>
        )}
      </main>

      <BottomNav />

      <AuthOverlay 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onUserSet={(u) => {
          setUser(u);
          setCurrentView('home');
        }} 
      />

      {selectedListing && user && (
        <ChatOverlay 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          user={user} 
          listing={selectedListing} 
        />
      )}
    </div>
  );
};

export default App;