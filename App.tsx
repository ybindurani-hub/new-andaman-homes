import React, { useState, useEffect } from 'react';
import { auth, getListings, addListing, logout, deleteListing, updateListingStatus, getFavorites, toggleFavorite } from './services/firebase.ts';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { User, PropertyListing, ViewState, ListingCategory, ListingStatus } from './types.ts';
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
        const favs = await getFavorites(userData.id);
        setFavorites(favs);
      } else {
        setUser(null);
        setFavorites([]);
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
    <div className="pb-24">
      {/* Ad Banner Placeholder */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="bg-[#F1F8E9] border border-green-50 py-3 rounded-lg text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Google AdMob Banner (Top)</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center text-slate-300 pointer-events-none group-focus-within:text-green-500 transition-colors">
            <Icons.Search />
          </div>
          <input 
            type="text" 
            placeholder="Search Port Blair, Havelock, etc..." 
            className="w-full bg-white border border-slate-100 rounded-full py-3.5 pl-12 pr-6 outline-none shadow-sm focus:border-green-200 focus:shadow-md transition-all font-medium text-slate-700 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="max-w-7xl mx-auto px-4 mt-6 flex gap-3 overflow-x-auto no-scrollbar">
        {(['ALL', 'RENT', 'SALE'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
              filterType === type 
                ? 'bg-[#4CAF50] text-white shadow-lg shadow-green-500/20' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
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
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No matching results found</p>
          </div>
        )}
      </div>
    </div>
  );

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-2 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="max-w-lg mx-auto flex items-end justify-between relative h-14">
        <button 
          onClick={() => setCurrentView('home')}
          className="flex flex-col items-center flex-1 transition-all active:scale-90"
        >
          <Icons.Home active={currentView === 'home'} />
          <span className={`text-[9px] font-bold mt-1 ${currentView === 'home' ? 'text-green-600' : 'text-slate-400'}`}>Home</span>
        </button>
        
        <button 
          onClick={() => {
            if (!user) setIsAuthOpen(true);
            else setCurrentView('profile'); // Show favorites in profile or create separate view
          }}
          className="flex flex-col items-center flex-1 transition-all active:scale-90"
        >
          <Icons.Heart filled={false} />
          <span className="text-[9px] font-bold mt-1 text-slate-400">Saved</span>
        </button>

        <div className="flex-1 flex justify-center">
          <button 
            onClick={() => {
              if (!user) setIsAuthOpen(true);
              else setCurrentView('post');
            }}
            className="absolute -top-10 bg-white p-2 rounded-full shadow-xl"
          >
            <div className="w-16 h-16 bg-[#4CAF50] rounded-full flex flex-col items-center justify-center text-white shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all">
              <span className="text-[10px] font-black uppercase tracking-tighter">Sell</span>
            </div>
          </button>
        </div>

        <button 
          onClick={() => {
            if (!user) setIsAuthOpen(true);
            else setCurrentView('profile');
          }}
          className="flex flex-col items-center flex-1 transition-all active:scale-90"
        >
          <Icons.List active={false} />
          <span className="text-[9px] font-bold mt-1 text-slate-400">My Ads</span>
        </button>

        <button 
          onClick={() => {
            if (!user) setIsAuthOpen(true);
            else setCurrentView('profile');
          }}
          className="flex flex-col items-center flex-1 transition-all active:scale-90"
        >
          <Icons.User active={currentView === 'profile'} />
          <span className={`text-[9px] font-bold mt-1 ${currentView === 'profile' ? 'text-green-600' : 'text-slate-400'}`}>Account</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-green-100">
      <Navbar onViewChange={setCurrentView} currentLocation="Port Blair" />
      
      <main className="max-w-7xl mx-auto">
        {currentView === 'home' && renderHome()}
        {currentView === 'post' && (
          <ListingForm 
            onSubmit={async (data) => {
              await addListing(data, user!);
              setCurrentView('home');
              fetchAllListings();
            }} 
            onCancel={() => setCurrentView('home')} 
          />
        )}
        {currentView === 'details' && selectedListing && (
          <div className="px-4 py-6 pb-24">
             {/* Simple back button for details view since BottomNav is present */}
             <button 
               onClick={() => setCurrentView('home')}
               className="mb-4 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"
             >
               ← Back
             </button>
             <ListingCard listing={selectedListing} onClick={() => {}} />
             <div className="mt-8 bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                <h2 className="text-xl font-bold">{selectedListing.title}</h2>
                <p className="text-slate-600 text-sm leading-relaxed">{selectedListing.description}</p>
                <div className="pt-4 border-t border-slate-50 flex gap-4">
                  <a href={`tel:${selectedListing.contactNumber}`} className="flex-1 bg-green-600 text-white text-center py-3 rounded-xl font-bold uppercase text-xs tracking-widest">Call Now</a>
                  <button onClick={() => setIsChatOpen(true)} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest">Chat</button>
                </div>
             </div>
          </div>
        )}
        {currentView === 'profile' && user && (
          <div className="p-8 pb-32">
             <div className="text-center mb-8">
                <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full mx-auto flex items-center justify-center mb-4">
                  <Icons.User active />
                </div>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-slate-400 text-sm">{user.email}</p>
             </div>
             <button 
               onClick={async () => { await logout(); setUser(null); setCurrentView('home'); }}
               className="w-full bg-red-50 text-red-500 py-3 rounded-xl font-bold uppercase text-xs tracking-widest"
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