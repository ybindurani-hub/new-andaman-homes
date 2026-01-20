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
        setAuthError(`Domain not authorized. Add '${window.location.hostname}' to Firebase console.`);
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

  const savedListings = listings.filter(l => favorites.includes(l.id));
  const myAdsListings = listings.filter(l => user && l.ownerId === user.id);

  const renderListingGrid = (items: PropertyListing[], title: string, emptyMessage: string) => (
    <div className="max-w-4xl mx-auto px-4 mt-4 pb-32 min-h-screen animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 leading-none">{title}</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{items.length} Properties</p>
      </div>
      
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map(listing => (
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
      ) : (
        <div className="py-24 text-center">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
             <Icons.Bookmark active={false} />
          </div>
          <h3 className="text-slate-900 font-black text-lg mb-1">Empty View</h3>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest px-10">{emptyMessage}</p>
        </div>
      )}
    </div>
  );

  const renderHome = () => (
    <div className="pb-32 bg-white min-h-screen">
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top duration-300">
          <div className="bg-[#4CAF50] text-white px-6 py-2.5 rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
            {successMessage}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 mt-2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 pointer-events-none">
            <Icons.Search />
          </div>
          <input 
            type="text" 
            placeholder="Search houses, shops, land..." 
            className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white rounded-[1.25rem] py-4 pl-12 pr-6 outline-none shadow-sm transition-all font-bold text-slate-700 text-lg placeholder:text-slate-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6 flex gap-2 overflow-x-auto no-scrollbar">
        {(['ALL', 'RENT', 'SALE'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 border-2 ${
              filterType === type 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-400 border-slate-100'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Recommendations</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.2em]">No results found</p>
          </div>
        )}
      </div>
    </div>
  );

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-4 pt-3 pb-6 z-[100] shadow-[0_-8px_30px_rgba(0,0,0,0.02)]">
      <div className="max-w-lg mx-auto flex items-end justify-between relative h-14">
        <button onClick={() => setCurrentView('home')} className="flex flex-col items-center flex-1">
          <div className="mb-1"><Icons.Home active={currentView === 'home'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'home' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>Market</span>
        </button>
        
        <button onClick={() => { if (!user) setIsAuthOpen(true); else setCurrentView('saved'); }} className="flex flex-col items-center flex-1">
          <div className="mb-1"><Icons.Bookmark active={currentView === 'saved'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'saved' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>Saved</span>
        </button>

        <div className="flex-1 flex justify-center pb-1">
          <button onClick={() => { if (!user) setIsAuthOpen(true); else setCurrentView('post'); }} className="w-14 h-14 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white shadow-xl -mt-8 active:scale-95 transition-all">
            <Icons.Plus />
            <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">Sell</span>
          </button>
        </div>

        <button onClick={() => { if (!user) setIsAuthOpen(true); else setCurrentView('myads'); }} className="flex flex-col items-center flex-1">
          <div className="mb-1"><Icons.List active={currentView === 'myads'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'myads' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>My Ads</span>
        </button>

        <button onClick={() => { if (!user) setIsAuthOpen(true); else setCurrentView('profile'); }} className="flex flex-col items-center flex-1">
          <div className="mb-1"><Icons.User active={currentView === 'profile'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'profile' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>Profile</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#4CAF50]/10">
      {authError && <div className="bg-slate-900 text-white p-3 text-center text-[10px] font-black uppercase tracking-widest sticky top-0 z-[200]">⚠️ {authError}</div>}
      
      <Navbar onViewChange={setCurrentView} currentLocation="Andaman" />
      
      <main>
        {loading && currentView === 'home' ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
             <div className="w-6 h-6 border-3 border-[#4CAF50] border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Loading...</p>
          </div>
        ) : (
          <>
            {currentView === 'home' && renderHome()}
            {currentView === 'saved' && renderListingGrid(savedListings, "Saved Items", "Tap the heart on any property to save it here.")}
            {currentView === 'myads' && renderListingGrid(myAdsListings, "My Listings", "Properties you list for sale or rent will appear here.")}
            
            {currentView === 'post' && (
              <ListingForm 
                onSubmit={async (data) => {
                  try {
                    const newListing = await addListing(data, user!);
                    setListings(prev => [newListing, ...prev]);
                    setCurrentView('home');
                    setSuccessMessage("Listing is now Live!");
                    setTimeout(() => setSuccessMessage(null), 3000);
                  } catch (e) {
                    console.error(e);
                    throw e;
                  }
                }} 
                onCancel={() => setCurrentView('home')} 
              />
            )}
            
            {currentView === 'details' && selectedListing && (
              <div className="max-w-2xl mx-auto px-4 py-6 pb-32 animate-in fade-in duration-500">
                <button onClick={() => setCurrentView('home')} className="mb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group">
                  <span className="group-hover:-translate-x-1 transition-transform">←</span> Market
                </button>
                
                <div className="space-y-6">
                  <div className="aspect-[4/3] rounded-[2rem] overflow-hidden shadow-xl relative bg-slate-100">
                    <img src={selectedListing.imageUrls[0]} className="w-full h-full object-cover" alt="" />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full font-black text-[9px] uppercase shadow-sm">{selectedListing.category}</div>
                  </div>

                  <div className="px-1 space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedListing.title}</h2>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#4CAF50] uppercase tracking-wide">
                          <Icons.Location />
                          {selectedListing.location}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900 leading-none">₹{selectedListing.price.toLocaleString()}</div>
                        <div className="text-[9px] font-black text-slate-300 uppercase mt-1 tracking-widest">Fixed Price</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                       <div className="text-center space-y-0.5">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Space</p>
                          <p className="text-xs font-black text-slate-900">{selectedListing.area} {selectedListing.areaUnit}</p>
                       </div>
                       <div className="text-center border-x border-slate-200 space-y-0.5">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Specs</p>
                          <p className="text-xs font-black text-slate-900">{selectedListing.bhk || '-'}</p>
                       </div>
                       <div className="text-center space-y-0.5">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Posted</p>
                          <p className="text-xs font-black text-slate-900">{selectedListing.postedBy}</p>
                       </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Information</h4>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">{selectedListing.description}</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                       <a href={`tel:${selectedListing.contactNumber}`} className="flex-[2] bg-slate-900 text-white flex items-center justify-center py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Call Now</a>
                       <button onClick={() => { if (!user) setIsAuthOpen(true); else setIsChatOpen(true); }} className="flex-1 bg-white border-2 border-slate-100 text-slate-900 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Chat</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentView === 'profile' && user && (
              <div className="max-w-lg mx-auto p-10 pb-32 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-slate-50 text-[#4CAF50] rounded-[2rem] mx-auto flex items-center justify-center shadow-inner border-2 border-slate-100 mb-6">
                  <div className="scale-125"><Icons.User active /></div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-1">{user.name}</h2>
                <p className="text-slate-400 font-bold text-sm mb-10 tracking-tight">{user.email}</p>
                <div className="space-y-3">
                  <button onClick={async () => { await logout(); setUser(null); setCurrentView('home'); }} className="w-full bg-red-50 text-red-500 py-4 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-red-100 transition-colors">Sign Out</button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
      <AuthOverlay isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onUserSet={(u) => { setUser(u); setCurrentView('home'); }} />
      {selectedListing && user && <ChatOverlay isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} user={user} listing={selectedListing} />}
    </div>
  );
};

export default App;