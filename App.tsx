import React, { useState, useEffect } from 'react';
import { auth, getListings, addListing, logout, getFavorites, toggleFavorite, deleteListing, updateListingStatus, handleRedirectResultSafe } from './services/firebase.ts';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { User, PropertyListing, ViewState, ListingCategory, ListingStatus } from './types.ts';
import Navbar from './components/Navbar.tsx';
import ListingCard from './components/ListingCard.tsx';
import ListingForm from './components/ListingForm.tsx';
import AuthOverlay from './components/AuthOverlay.tsx';
import ChatOverlay from './components/ChatOverlay.tsx';
import AdBanner from './components/AdBanner.tsx';
import InterstitialAd from './components/InterstitialAd.tsx';
import LocationOverlay from './components/LocationOverlay.tsx';
import { Icons, ANDAMAN_LOCATIONS } from './constants.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'RENT' | 'SALE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('Andaman Islands');

  const [showInterstitial, setShowInterstitial] = useState(false);
  const [pendingView, setPendingView] = useState<ViewState | null>(null);

  useEffect(() => {
    // 1. First, check for redirect results (Mobile Flow)
    const checkRedirect = async () => {
      const redirectUser = await handleRedirectResultSafe();
      if (redirectUser) {
        setUser(redirectUser);
        setSuccessMessage(`Signed in as ${redirectUser.name}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
      
      // 2. Then, subscribe to auth state changes
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
          if (currentView !== 'home' && currentView !== 'details') {
            setCurrentView('home');
          }
        }
        setInitializing(false);
      });

      return unsubscribe;
    };

    const unsubPromise = checkRedirect();
    return () => { unsubPromise.then(unsub => unsub?.()); };
  }, [currentView]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await getListings();
      setListings(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const switchView = (view: ViewState) => {
    if (view === 'details' || (currentView === 'home' && view !== 'home')) {
      setShowInterstitial(true);
      setPendingView(view);
    } else {
      setCurrentView(view);
      window.scrollTo(0, 0);
    }
  };

  const handleInterstitialClose = () => {
    setShowInterstitial(false);
    if (pendingView) {
      setCurrentView(pendingView);
      setPendingView(null);
    }
    window.scrollTo(0, 0);
  };

  const handleFavoriteToggle = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!user) {
      setAuthMessage('Sign up to shortlist this property');
      setIsAuthOpen(true);
      return;
    }
    const newFavs = await toggleFavorite(user.id, listingId);
    setFavorites(newFavs);
  };

  const handleStatusChange = async (listingId: string, newStatus: ListingStatus) => {
    await updateListingStatus(listingId, newStatus);
    setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: newStatus } : l));
    if (selectedListing?.id === listingId) {
      setSelectedListing(prev => prev ? { ...prev, status: newStatus } : null);
    }
    setSuccessMessage(`Marked as ${newStatus}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteListing = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this ad?")) return;
    await deleteListing(listingId);
    setListings(prev => prev.filter(l => l.id !== listingId));
    setSuccessMessage("Ad removed");
    setTimeout(() => setSuccessMessage(null), 3000);
    if (selectedListing?.id === listingId) {
      switchView('home');
    }
  };

  const filteredListings = listings.filter(l => {
    const matchesSearch = l.title.toLowerCase().includes(searchQuery.toLowerCase()) || l.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'ALL' || (filterType === 'RENT' && l.category.toLowerCase().includes('rent')) || (filterType === 'SALE' && l.category.toLowerCase().includes('sale'));
    return matchesSearch && matchesFilter;
  });

  // Loading Screen for Initializing Auth
  if (initializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white space-y-4">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-[#4CAF50] rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Connecting to Andaman Homes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar onViewChange={switchView} onOpenLocation={() => setIsLocationOpen(true)} currentLocation={selectedLocation} />
      
      <main>
        {currentView === 'home' && (
          <div className="pb-32">
            {successMessage && (
              <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top">
                <div className="bg-slate-900 text-white px-6 py-2 rounded-full font-black text-[9px] uppercase tracking-widest shadow-2xl">
                  {successMessage}
                </div>
              </div>
            )}
            <AdBanner position="top" triggerRefresh={currentView} />
            <div className="max-w-4xl mx-auto px-4 mt-6">
              <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                <h2 className="text-3xl font-black text-slate-900 mb-6">Direct from Owners.<br/><span className="text-[#4CAF50]">No Brokerage.</span></h2>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center text-slate-400"><Icons.Search /></div>
                  <input 
                    type="text" placeholder="Search locality or property type..." 
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-[#4CAF50] font-bold text-slate-700"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-10">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(['ALL', 'RENT', 'SALE'] as const).map(t => (
                  <button key={t} onClick={() => setFilterType(t)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${filterType === t ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-50'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-12">
              {loading ? (
                <div className="py-20 flex flex-col items-center"><div className="w-8 h-8 border-4 border-slate-50 border-t-[#4CAF50] rounded-full animate-spin mb-4"></div><p className="text-[9px] font-black text-slate-300 uppercase">Updating Marketplace...</p></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredListings.map(l => (
                    <ListingCard key={l.id} listing={l} isFavorited={favorites.includes(l.id)} onFavoriteToggle={handleFavoriteToggle} isOwner={user?.id === l.ownerId} onDelete={handleDeleteListing} onClick={(listing) => { setSelectedListing(listing); switchView('details'); }} />
                  ))}
                </div>
              )}
            </div>
            <AdBanner position="bottom" triggerRefresh={currentView} />
          </div>
        )}

        {currentView === 'saved' && (
          <div className="max-w-4xl mx-auto px-4 py-10 pb-32">
            <h2 className="text-2xl font-black text-slate-900 mb-8">Shortlisted</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {listings.filter(l => favorites.includes(l.id)).map(l => (
                <ListingCard key={l.id} listing={l} isFavorited={true} onFavoriteToggle={handleFavoriteToggle} isOwner={user?.id === l.ownerId} onDelete={handleDeleteListing} onClick={(listing) => { setSelectedListing(listing); switchView('details'); }} />
              ))}
            </div>
          </div>
        )}

        {currentView === 'myads' && (
          <div className="max-w-4xl mx-auto px-4 py-10 pb-32">
            <h2 className="text-2xl font-black text-slate-900 mb-8">Your Advertisements</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {listings.filter(l => l.ownerId === user?.id).map(l => (
                <ListingCard key={l.id} listing={l} isFavorited={favorites.includes(l.id)} onFavoriteToggle={handleFavoriteToggle} isOwner={true} onDelete={handleDeleteListing} onClick={(listing) => { setSelectedListing(listing); switchView('details'); }} />
              ))}
            </div>
          </div>
        )}

        {currentView === 'post' && user && (
          <ListingForm 
            onSubmit={async (data) => {
              const nl = await addListing(data, user);
              setListings(p => [nl, ...p]);
              switchView('home');
              setSuccessMessage("Listing is now Live!");
              setTimeout(() => setSuccessMessage(null), 3000);
            }} 
            onCancel={() => switchView('home')} 
          />
        )}

        {currentView === 'details' && selectedListing && (
          <div className="max-w-3xl mx-auto px-4 py-10 pb-40">
             <button onClick={() => switchView('home')} className="mb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">← Back to Search</button>
             <div className="space-y-8">
                <div className="aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-100 border border-slate-100">
                  <img src={selectedListing.imageUrls?.[0]} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="px-2">
                   <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedListing.title}</h2>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">{selectedListing.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-slate-900">₹{selectedListing.price.toLocaleString()}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Direct Owner Price</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Area</p>
                        <p className="text-sm font-black text-slate-900">{selectedListing.area} {selectedListing.areaUnit}</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-sm font-black text-[#4CAF50]">{selectedListing.status}</p>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Owner</p>
                        <p className="text-sm font-black text-slate-900">{selectedListing.ownerName}</p>
                      </div>
                   </div>

                   <p className="text-slate-600 leading-relaxed text-lg mb-10">{selectedListing.description}</p>

                   <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center font-black text-xl">{selectedListing.ownerName.charAt(0)}</div>
                        <div>
                          <p className="text-xl font-black">{selectedListing.ownerName}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Owner</p>
                        </div>
                      </div>
                      <div className="flex gap-3 w-full sm:w-auto">
                        <a href={user ? `tel:${selectedListing.contactNumber}` : "#"} onClick={(e) => { if(!user) { e.preventDefault(); setAuthMessage('Sign in to call'); setIsAuthOpen(true); } }} className="flex-1 sm:flex-none bg-[#4CAF50] text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Call Owner</a>
                        <button onClick={() => { if(!user) { setAuthMessage('Sign in to chat'); setIsAuthOpen(true); } else if(user.id !== selectedListing.ownerId) { setIsChatOpen(true); } }} className="flex-1 sm:flex-none bg-white/10 text-white border border-white/20 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Chat Now</button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {currentView === 'profile' && user && (
          <div className="max-w-lg mx-auto py-20 px-4 text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-[2rem] mx-auto flex items-center justify-center text-[#4CAF50] mb-6 border border-slate-100">
               <div className="scale-150"><Icons.User active /></div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">{user.name}</h2>
            <p className="text-slate-400 font-bold mb-10">{user.email}</p>
            <button onClick={async () => { await logout(); switchView('home'); }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Sign Out</button>
          </div>
        )}
      </main>

      {/* Persistent Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-slate-100 px-6 pt-3 pb-8 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14">
          <button onClick={() => switchView('home')} className="flex flex-col items-center flex-1">
            <Icons.Home active={currentView === 'home'} /><span className={`text-[8px] font-black uppercase mt-1 ${currentView === 'home' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>Market</span>
          </button>
          <button onClick={() => { if(!user) { setAuthMessage('Sign in to see shortlist'); setIsAuthOpen(true); } else switchView('saved'); }} className="flex flex-col items-center flex-1">
            <Icons.Bookmark active={currentView === 'saved'} /><span className={`text-[8px] font-black uppercase mt-1 ${currentView === 'saved' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>Shortlist</span>
          </button>
          <button onClick={() => { if(!user) { setAuthMessage('Sign in to list property'); setIsAuthOpen(true); } else switchView('post'); }} className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl -mt-8 border-4 border-white transition-transform active:scale-90">
            <Icons.Plus />
          </button>
          <button onClick={() => { if(!user) { setAuthMessage('Sign in for my ads'); setIsAuthOpen(true); } else switchView('myads'); }} className="flex flex-col items-center flex-1">
            <Icons.List active={currentView === 'myads'} /><span className={`text-[8px] font-black uppercase mt-1 ${currentView === 'myads' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>My Ads</span>
          </button>
          <button onClick={() => { if(!user) { setAuthMessage('Sign in for profile'); setIsAuthOpen(true); } else switchView('profile'); }} className="flex flex-col items-center flex-1">
            <Icons.User active={currentView === 'profile'} /><span className={`text-[8px] font-black uppercase mt-1 ${currentView === 'profile' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>Account</span>
          </button>
        </div>
      </div>

      <AuthOverlay isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onUserSet={setUser} message={authMessage} />
      <LocationOverlay isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} onSelect={setSelectedLocation} currentLocation={selectedLocation} />
      {showInterstitial && <InterstitialAd onClose={handleInterstitialClose} />}
      {selectedListing && user && <ChatOverlay isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} user={user} listing={selectedListing} />}
    </div>
  );
};

export default App;