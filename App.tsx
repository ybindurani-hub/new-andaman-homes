
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  auth, 
  getListings, 
  addListing, 
  updateListing,
  logout, 
  deleteListing,
  getFavorites, 
  toggleFavorite, 
  getUserData 
} from './services/firebase.ts';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { User, PropertyListing, ViewState, ListingStatus } from './types.ts';
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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('home');

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [editingListing, setEditingListing] = useState<PropertyListing | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'RENT' | 'SALE'>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('Port Blair');

  const PAGE_SIZE = 15;

  const getTimeAgo = useCallback((date: number) => {
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 60) return "Just now";
    let interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + "m ago";
    return "Recently";
  }, []);

  const fetchMarket = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const result = await getListings(isLoadMore ? lastDoc : undefined, PAGE_SIZE);
      if (isLoadMore) {
        setListings(prev => [...prev, ...result.listings]);
      } else {
        setListings(result.listings);
      }
      setLastDoc(result.lastDoc);
      setHasMore(result.listings.length >= PAGE_SIZE);
    } catch (err: any) {
      console.warn("Market fetch failed.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastDoc]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserData(firebaseUser.uid);
        if (profile) {
          setUser(profile);
          const favs = await getFavorites(profile.id);
          setFavorites(favs);
        }
      } else {
        setUser(null);
        setFavorites([]);
        if (['post', 'profile', 'myads', 'saved'].includes(currentView)) {
          setCurrentView('home');
        }
      }
    });
    fetchMarket();
    return () => unsubscribe();
  }, []);

  const handleToggleFav = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) { setIsAuthOpen(true); return; }
    try {
      const nextFavs = await toggleFavorite(user.id, id);
      setFavorites(nextFavs);
      setToast({ message: nextFavs.includes(id) ? "Ad Shortlisted" : "Removed from Shortlist", type: 'success' });
    } catch (e: any) {
      setToast({ message: "Sync error.", type: 'error' });
    }
  }, [user]);

  const handlePostSubmit = async (data: any) => {
    if (!user) { setIsAuthOpen(true); return; }
    try {
      if (editingListing) {
        await updateListing(editingListing.id, data);
        setListings(prev => prev.map(l => l.id === editingListing.id ? { ...l, ...data } : l));
        setToast({ message: "Listing updated.", type: 'success' });
      } else {
        const newAd = await addListing(data, user);
        setListings(prev => [newAd, ...prev]);
        setToast({ message: "Ad published!", type: 'success' });
      }
      setEditingListing(null);
      setCurrentView('home');
    } catch (err) {
      setToast({ message: "Posting failed.", type: 'error' });
    }
  };

  const handleAdDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Remove this ad?")) return;
    try {
      await deleteListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
      setToast({ message: "Ad removed", type: 'success' });
    } catch (e) {
      setToast({ message: "Delete failed.", type: 'error' });
    }
  };

  const filteredSet = useMemo(() => {
    let base = [...listings];
    if (currentView === 'myads') {
      base = base.filter(l => l.ownerId === user?.id);
    } else if (currentView === 'saved') {
      base = base.filter(l => favorites.includes(l.id));
    }

    return base.filter(l => {
      const query = searchQuery.toLowerCase();
      const titleMatch = !query || l.title.toLowerCase().includes(query) || l.location.toLowerCase().includes(query);
      const isRent = l.category.toLowerCase().includes('rent');
      const isSale = l.category.toLowerCase().includes('sale');
      const typeMatch = filterType === 'ALL' || (filterType === 'RENT' && isRent) || (filterType === 'SALE' && isSale);
      return titleMatch && typeMatch;
    });
  }, [listings, currentView, user, favorites, searchQuery, filterType]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-36">
      <Navbar 
        onViewChange={(v) => { setEditingListing(null); setCurrentView(v); }} 
        onOpenLocation={() => setIsLocationOpen(true)} 
        currentLocation={selectedLocation} 
      />

      <main className="max-w-4xl mx-auto px-4 mt-6">
        {['home', 'myads', 'saved'].includes(currentView) && (
          <div className="animate-in fade-in duration-700">
            {/* Search HUD */}
            <div className="sticky top-[80px] z-[100] bg-slate-50/90 backdrop-blur-md py-4">
              <div className="flex gap-2 items-center mb-6">
                <div className="flex-grow flex items-center bg-white rounded-3xl px-6 py-5 shadow-sm border border-slate-100 ring-1 ring-slate-200/50">
                  <Icons.Search />
                  <input 
                    className="bg-transparent outline-none ml-4 text-sm font-bold w-full placeholder:text-slate-300"
                    placeholder="Search Port Blair, Swaraj Dweep..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setIsLocationOpen(true)}
                  className="bg-emerald-500 p-5 rounded-3xl shadow-2xl shadow-emerald-500/20 text-white active:scale-95 transition-all"
                >
                  <Icons.Location />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {(['ALL', 'RENT', 'SALE'] as const).map(t => (
                  <button 
                    key={t} 
                    onClick={() => setFilterType(t)}
                    className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex-shrink-0 ${
                      filterType === t ? 'bg-slate-900 text-white border-slate-900 shadow-2xl' : 'bg-white text-slate-400 border-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* View Header */}
            <div className="flex items-center justify-between mt-10 mb-8 px-2">
               <div>
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-2">{selectedLocation}</p>
                 <h2 className="text-3xl font-black tracking-tight text-slate-900">
                    {currentView === 'home' ? 'Island Real Estate' : 
                     currentView === 'myads' ? 'Manage My Ads' : 'Shortlisted Homes'}
                 </h2>
               </div>
               <span className="bg-white border border-slate-100 text-slate-400 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                 {filteredSet.length} Results
               </span>
            </div>

            {/* Data Grid */}
            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center gap-6">
                <div className="w-14 h-14 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.4em]">Syncing Marketplace Data...</p>
              </div>
            ) : filteredSet.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                {filteredSet.map(l => (
                  <ListingCard 
                    key={l.id} 
                    listing={l} 
                    isFavorited={favorites.includes(l.id)}
                    onFavoriteToggle={handleToggleFav}
                    isOwner={user?.id === l.ownerId}
                    timeAgo={getTimeAgo(l.postedAt)}
                    onClick={(listing) => { setSelectedListing(listing); setCurrentView('details'); }}
                    onEdit={(e) => { e.stopPropagation(); setEditingListing(l); setCurrentView('post'); }}
                    onDelete={handleAdDelete}
                  />
                ))}
              </div>
            ) : (
              <div className="py-32 text-center space-y-8 bg-white rounded-[4rem] border border-slate-100 mx-2 shadow-sm p-12">
                 <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-200">
                   <Icons.Home />
                 </div>
                 <div className="space-y-3">
                    <p className="text-base font-black text-slate-900 uppercase tracking-widest">No listings found</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed italic">
                      "Market conditions vary. Try expanding your search horizons."
                    </p>
                 </div>
                 {currentView === 'home' && (
                   <button 
                    onClick={() => { setSearchQuery(''); setFilterType('ALL'); }}
                    className="bg-slate-900 text-white px-12 py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] active:scale-95 shadow-2xl"
                   >
                     Reset Filters
                   </button>
                 )}
              </div>
            )}

            {/* Load More Trigger */}
            {currentView === 'home' && hasMore && filteredSet.length > 0 && (
               <button 
                 onClick={() => fetchMarket(true)} 
                 disabled={loadingMore}
                 className="w-full mt-12 py-10 border-2 border-dashed border-slate-200 rounded-[4rem] text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 hover:border-emerald-200 hover:text-emerald-500 transition-all flex items-center justify-center gap-5 active:scale-[0.98]"
               >
                 {loadingMore && <div className="w-5 h-5 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>}
                 {loadingMore ? 'Transmitting...' : 'Explore More Assets'}
               </button>
            )}
          </div>
        )}

        {currentView === 'post' && (
          <ListingForm 
            onSubmit={handlePostSubmit} 
            onCancel={() => { setEditingListing(null); setCurrentView('home'); }} 
            initialData={editingListing || undefined}
          />
        )}

        {currentView === 'details' && selectedListing && (
          <div className="animate-in fade-in slide-in-from-bottom-16 duration-700 pt-6 pb-24">
            <button 
              onClick={() => setCurrentView('home')} 
              className="mb-10 flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 hover:text-slate-900 transition-colors"
            >
              <div className="rotate-180"><Icons.ChevronRight /></div> Back to Search
            </button>
            
            <div className="bg-white rounded-[5rem] overflow-hidden shadow-2xl border border-white">
              <div className="aspect-video relative overflow-hidden bg-slate-100">
                <img 
                  src={selectedListing.imageUrls[0]} 
                  className="w-full h-full object-cover" 
                  alt={selectedListing.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>
                <div className="absolute bottom-16 left-16 right-16 flex justify-between items-end">
                  <div className="space-y-4">
                    <span className="bg-emerald-500 text-white px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl">
                      {selectedListing.category}
                    </span>
                    <h1 className="text-5xl font-black text-white tracking-tighter leading-none mt-4">
                      {selectedListing.title}
                    </h1>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-white/50 uppercase tracking-[0.4em] mb-2">Asking Value</p>
                    <p className="text-5xl font-black text-emerald-400">₹{selectedListing.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-16 space-y-16">
                <div className="flex flex-wrap gap-8">
                   {[
                     { label: 'Market Area', val: selectedListing.location, icon: <Icons.Location /> },
                     { label: 'Dimensions', val: `${selectedListing.area} sq.ft`, icon: <Icons.Target /> },
                     { label: 'Verification', val: selectedListing.ownerName, icon: <Icons.User /> }
                   ].map((item, idx) => (
                     <div key={idx} className="flex-grow min-w-[200px] bg-slate-50 p-10 rounded-[3rem] border border-slate-100 group transition-all hover:bg-white hover:border-emerald-100">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="text-emerald-500 group-hover:scale-125 transition-transform"><Icons.Target /></div>
                          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300">{item.label}</p>
                        </div>
                        <p className="text-base font-black text-slate-700">{item.val}</p>
                     </div>
                   ))}
                </div>

                <div className="space-y-6">
                  <p className="text-[13px] font-black uppercase tracking-[0.5em] text-slate-400 border-b border-slate-50 pb-6">Detailed Description</p>
                  <p className="text-lg font-medium text-slate-600 leading-relaxed whitespace-pre-wrap italic opacity-80">
                    "{selectedListing.description}"
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-8 pt-12 border-t border-slate-50">
                  <a 
                    href={`tel:${selectedListing.contactNumber}`} 
                    className="flex-1 bg-emerald-500 text-white py-8 rounded-[3rem] font-black uppercase text-[13px] tracking-[0.5em] text-center shadow-2xl shadow-emerald-500/30 active:scale-[0.98] transition-all"
                  >
                    Voice Dial Owner
                  </a>
                  <button 
                    onClick={() => { if(!user) setIsAuthOpen(true); else setIsChatOpen(true); }} 
                    className="flex-1 bg-slate-900 text-white py-8 rounded-[3rem] font-black uppercase text-[13px] tracking-[0.5em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-6"
                  >
                    <Icons.Message /> Secure Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {['settings', 'profile'].includes(currentView) && user && (
          <SettingsScreen 
            user={user} 
            onUpdateUser={setUser} 
            onBack={() => setCurrentView('home')} 
            onLogout={async () => { await logout(); setUser(null); setCurrentView('home'); }} 
            onToast={(m, t) => setToast({ message: m, type: t })}
          />
        )}
      </main>

      {/* Nav HUD */}
      <nav className="fixed bottom-0 left-0 right-0 p-10 z-[200] pointer-events-none">
        <div className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-3xl rounded-[3.5rem] p-4 shadow-2xl flex items-center justify-around pointer-events-auto border border-white/10 ring-1 ring-white/5">
           {[
             { v: 'home' as ViewState, i: Icons.Home, label: 'Market' },
             { v: 'saved' as ViewState, i: Icons.Bookmark, label: 'Saved' },
             { v: 'post' as ViewState, i: Icons.Plus, special: true, label: 'Add Ad' },
             { v: 'myads' as ViewState, i: Icons.List, label: 'My Ads' },
             { v: 'profile' as ViewState, i: Icons.User, label: 'Me' }
           ].map(btn => (
             <button 
               key={btn.v} 
               onClick={() => { 
                 if(!user && btn.v !== 'home') setIsAuthOpen(true); 
                 else { setEditingListing(null); setCurrentView(btn.v); } 
               }} 
               className={btn.special ? 
                 "w-16 h-16 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-white -mt-20 border-[6px] border-slate-900 shadow-2xl active:scale-90 transition-all ring-8 ring-slate-900/50 group" : 
                 "flex flex-col items-center gap-3 p-4 transition-all active:scale-95 group"
               }
             >
                <div className={currentView === btn.v ? 'text-emerald-400 scale-125' : 'text-slate-500 group-hover:text-slate-300'}>
                  <btn.i active={currentView === btn.v} />
                </div>
                {!btn.special && (
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${currentView === btn.v ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {btn.label}
                  </span>
                )}
             </button>
           ))}
        </div>
      </nav>

      {/* Overlays */}
      <AuthOverlay isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onUserSet={setUser} />
      <LocationOverlay isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} onSelect={setSelectedLocation} currentLocation={selectedLocation} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {selectedListing && user && <ChatOverlay isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} user={user} listing={selectedListing} />}
    </div>
  );
};

export default App;
