
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Fix: Removed handleRedirectResultSafe from imports as it is not exported by firebase.ts and not used in this file.
import { auth, getListings, addListing, logout, getFavorites, toggleFavorite, getAuthErrorMessage, logger, getUserData } from './services/firebase.ts';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { User, PropertyListing, ViewState } from './types.ts';
import Navbar from './components/Navbar.tsx';
import ListingCard from './components/ListingCard.tsx';
import ListingForm from './components/ListingForm.tsx';
import AuthOverlay from './components/AuthOverlay.tsx';
import ChatOverlay from './components/ChatOverlay.tsx';
import LocationOverlay from './components/LocationOverlay.tsx';
import Toast from './components/Toast.tsx';
import SettingsScreen from './components/SettingsScreen.tsx';
import { Icons } from './constants.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'RENT' | 'SALE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('Port Blair');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const PAGE_SIZE = 8;

  const timeAgo = useCallback((date: number) => {
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 60) return "Just now";
    let interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + "m ago";
    return "Recently";
  }, []);

  const fetchInitialListings = useCallback(async () => {
    setLoading(true);
    try {
      const { listings: data, lastDoc: last } = await getListings(undefined, PAGE_SIZE);
      setListings(data);
      setLastDoc(last);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      setToast({ message: "Network unstable. Using cached feed.", type: 'info' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMoreListings = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const { listings: data, lastDoc: last } = await getListings(lastDoc, PAGE_SIZE);
      if (data.length > 0) {
        setListings(prev => [...prev, ...data]);
        setLastDoc(last);
        setHasMore(data.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
       setToast({ message: "Connection lost.", type: 'error' });
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, lastDoc]);

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 2000);
    
    const initApp = async () => {
      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await getUserData(firebaseUser.uid);
          setUser(profile || { id: firebaseUser.uid, name: firebaseUser.displayName || 'Islander', email: firebaseUser.email || '' });
          getFavorites(firebaseUser.uid).then(setFavorites).catch(() => {});
        } else {
          setUser(null);
          setFavorites([]);
          if (['post', 'profile', 'settings'].includes(currentView)) setCurrentView('home');
        }
      });
      fetchInitialListings();
    };
    initApp();

    return () => clearTimeout(splashTimer);
  }, []);

  const handleFavoriteToggle = useCallback(async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!user) { setIsAuthOpen(true); return; }
    const next = await toggleFavorite(user.id, listingId);
    setFavorites(next);
    setToast({ message: next.includes(listingId) ? "Saved to shortlist" : "Removed from shortlist", type: 'success' });
  }, [user]);

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const q = searchQuery.toLowerCase();
      const match = (l.title || '').toLowerCase().includes(q) || (l.location || '').toLowerCase().includes(q);
      const cat = filterType === 'ALL' || (filterType === 'RENT' && l.category.toLowerCase().includes('rent')) || (filterType === 'SALE' && l.category.toLowerCase().includes('sale'));
      return match && cat;
    });
  }, [listings, searchQuery, filterType]);

  const handleListingClick = useCallback((listing: PropertyListing) => {
    setSelectedListing(listing);
    setCurrentView('details');
  }, []);

  const handlePostSubmit = useCallback(async (data: any) => {
    if(!user) { setIsAuthOpen(true); return; }
    try {
      const nl = await addListing(data, user);
      setListings(p => [nl, ...p]);
      setCurrentView('home');
      setToast({ message: "Listed successfully!", type: 'success' });
    } catch(err) {
      setToast({ message: "Posting failed.", type: 'error' });
    }
  }, [user]);

  if (showSplash) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
        <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white font-black text-3xl animate-bounce shadow-2xl">A</div>
        <h1 className="mt-8 text-2xl font-black text-slate-900 tracking-tighter">Andaman<span className="text-emerald-500">Homes</span></h1>
        <div className="mt-4 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 w-1/3 animate-shimmer"></div>
        </div>
        <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } } .animate-shimmer { animation: shimmer 1.5s infinite linear; }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-emerald-100">
      <Navbar onViewChange={setCurrentView} onOpenLocation={() => setIsLocationOpen(true)} currentLocation={selectedLocation} />
      
      <main className="max-w-4xl mx-auto px-4">
        {currentView === 'home' && (
          <div className="pb-40 pt-4">
            <div className="bg-slate-50 rounded-[2.5rem] p-8 mb-8 border border-slate-100">
               <h2 className="text-3xl font-black mb-6 leading-tight">Find your next<br/><span className="text-emerald-500">island home.</span></h2>
               <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center text-slate-300"><Icons.Search /></div>
                  <input 
                    type="text" placeholder="Search locality..." 
                    className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-emerald-500 font-bold text-slate-700 shadow-sm"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
               <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar">
                {(['ALL', 'RENT', 'SALE'] as const).map(t => (
                  <button key={t} onClick={() => setFilterType(t)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filterType === t ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{t}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center animate-pulse">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Gathering Listings...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredListings.map(l => (
                  <ListingCard key={l.id} listing={l} isFavorited={favorites.includes(l.id)} onFavoriteToggle={handleFavoriteToggle} isOwner={user?.id === l.ownerId} onClick={handleListingClick} timeAgo={timeAgo(l.postedAt)} />
                ))}
              </div>
            )}
            
            {hasMore && listings.length > 0 && (
              <button onClick={fetchMoreListings} disabled={loadingMore} className="w-full mt-10 py-5 rounded-2xl border-2 border-dashed border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:border-emerald-200 hover:text-emerald-500 transition-all">
                {loadingMore ? 'Syncing...' : 'Load More Properties'}
              </button>
            )}
          </div>
        )}

        {currentView === 'post' && <ListingForm onSubmit={handlePostSubmit} onCancel={() => setCurrentView('home')} />}

        {currentView === 'details' && selectedListing && (
          <div className="pb-40 pt-6 animate-in fade-in duration-500">
             <button onClick={() => setCurrentView('home')} className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">← Back</button>
             <div className="rounded-[2.5rem] overflow-hidden bg-slate-100 aspect-video mb-8 shadow-xl">
               <img src={selectedListing.imageUrls[0]} className="w-full h-full object-cover" alt="" />
             </div>
             <div className="px-2">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-black mb-2">{selectedListing.title}</h2>
                    <p className="flex items-center gap-1 text-slate-400 font-bold text-sm uppercase tracking-widest"><Icons.Location /> {selectedListing.location}</p>
                  </div>
                  <div className="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] text-center">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Price</p>
                    <p className="text-2xl font-black">₹{selectedListing.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 mb-8">
                   <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Description</h3>
                   <p className="text-slate-600 leading-relaxed font-medium">{selectedListing.description}</p>
                </div>
                <div className="flex gap-4">
                  <a href={`tel:${selectedListing.contactNumber}`} className="flex-1 bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest text-center shadow-lg active:scale-95 transition-all">Call Owner</a>
                  <button onClick={() => { if(!user) setIsAuthOpen(true); else setIsChatOpen(true); }} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Chat Now</button>
                </div>
             </div>
          </div>
        )}

        {(currentView === 'settings' || currentView === 'profile') && user && (
          <SettingsScreen 
            user={user} onUpdateUser={setUser} 
            onBack={() => setCurrentView('home')} 
            onLogout={async () => { await logout(); setUser(null); setCurrentView('home'); }} 
            onToast={(m, t) => setToast({ message: m, type: t })}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-6 z-[1000] pointer-events-none">
        <div className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] p-3 shadow-2xl flex items-center justify-around pointer-events-auto border border-white/5">
           {[
             { v: 'home' as ViewState, i: Icons.Home },
             { v: 'saved' as ViewState, i: Icons.Bookmark },
             { v: 'post' as ViewState, i: Icons.Plus, special: true },
             { v: 'myads' as ViewState, i: Icons.List },
             { v: 'profile' as ViewState, i: Icons.User }
           ].map(btn => (
             <button key={btn.v} onClick={() => { if(!user && btn.v !== 'home') setIsAuthOpen(true); else setCurrentView(btn.v); }} className={btn.special ? "w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white -mt-10 border-4 border-slate-900 shadow-xl active:scale-90 transition-all" : `p-4 transition-all ${currentView === btn.v ? 'text-emerald-400 scale-110' : 'text-slate-500'}`}>
                <btn.i active={currentView === btn.v} />
             </button>
           ))}
        </div>
      </nav>

      <AuthOverlay isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onUserSet={setUser} />
      <LocationOverlay isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} onSelect={setSelectedLocation} currentLocation={selectedLocation} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {selectedListing && user && <ChatOverlay isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} user={user} listing={selectedListing} />}
    </div>
  );
};

export default App;
