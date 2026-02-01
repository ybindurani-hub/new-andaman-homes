
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
  getUserData,
  handleAuthRedirect 
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
  // Session & Identity
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Market Content
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('home');

  // Interface State
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState(false);
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
    else {
      setLoading(true);
      setHasPermissionError(false);
    }

    try {
      const result = await getListings(isLoadMore ? lastDoc : undefined, PAGE_SIZE);
      
      // If we got zero results but no error, maybe it's actually empty or permissions
      if (result.listings.length === 0 && !isLoadMore && !auth.currentUser) {
        // We can't be 100% sure it's permissions without the error catch in service,
        // but the service now warns. We just handle empty result gracefully.
      }

      if (isLoadMore) {
        setListings(prev => [...prev, ...result.listings]);
      } else {
        setListings(result.listings);
      }
      setLastDoc(result.lastDoc);
      setHasMore(result.listings.length >= PAGE_SIZE);
    } catch (err: any) {
      if (err.message?.includes('permission')) {
        setHasPermissionError(true);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastDoc]);

  // Handle Authentication and Session persistence
  useEffect(() => {
    const initialize = async () => {
      await handleAuthRedirect();
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await getUserData(firebaseUser.uid);
          if (profile) {
            setUser(profile);
            const favs = await getFavorites(profile.id);
            setFavorites(favs);
            // Refresh market when user logs in (in case permissions were restricted)
            fetchMarket();
          }
        } else {
          setUser(null);
          setFavorites([]);
          if (['post', 'profile', 'myads', 'saved'].includes(currentView)) {
            setCurrentView('home');
          }
        }
      });
      return unsubscribe;
    };
    initialize();
    fetchMarket();
  }, []);

  const handleToggleFav = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) { setIsAuthOpen(true); return; }
    try {
      const nextFavs = await toggleFavorite(user.id, id);
      setFavorites(nextFavs);
      setToast({ message: nextFavs.includes(id) ? "Saved to Shortlist" : "Removed from Shortlist", type: 'success' });
    } catch (e: any) {
      if (e.message?.includes('permission')) {
        setToast({ message: "Login required to save properties.", type: 'error' });
      } else {
        setToast({ message: "Unable to update shortlist.", type: 'error' });
      }
    }
  }, [user]);

  const handlePostSubmit = async (data: any) => {
    if (!user) { setIsAuthOpen(true); return; }
    try {
      if (editingListing) {
        await updateListing(editingListing.id, data);
        setListings(prev => prev.map(l => l.id === editingListing.id ? { ...l, ...data } : l));
        setToast({ message: "Listing updated successfully!", type: 'success' });
      } else {
        const newAd = await addListing(data, user);
        setListings(prev => [newAd, ...prev]);
        setToast({ message: "Your ad is live!", type: 'success' });
      }
      setEditingListing(null);
      setCurrentView('home');
    } catch (err) {
      setToast({ message: "Failed to post listing.", type: 'error' });
    }
  };

  const handleAdDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this listing?")) return;
    try {
      await deleteListing(id);
      setListings(prev => prev.filter(l => l.id !== id));
      setToast({ message: "Ad removed", type: 'success' });
    } catch (e) {
      setToast({ message: "Error deleting ad.", type: 'error' });
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
          <div className="animate-in fade-in duration-500">
            {/* Search Header */}
            <div className="sticky top-[80px] z-[100] bg-slate-50/90 backdrop-blur-md py-4">
              <div className="flex gap-2 items-center mb-4">
                <div className="flex-grow flex items-center bg-white rounded-2xl px-5 py-4 shadow-sm border border-slate-100 ring-1 ring-slate-200/50">
                  <Icons.Search />
                  <input 
                    className="bg-transparent outline-none ml-3 text-sm font-bold w-full placeholder:text-slate-300"
                    placeholder="Search Port Blair, houses, lands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setIsLocationOpen(true)}
                  className="bg-emerald-500 p-4 rounded-2xl shadow-xl shadow-emerald-500/20 text-white active:scale-95 transition-all"
                >
                  <Icons.Location />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(['ALL', 'RENT', 'SALE'] as const).map(t => (
                  <button 
                    key={t} 
                    onClick={() => setFilterType(t)}
                    className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex-shrink-0 ${
                      filterType === t ? 'bg-slate-900 text-white border-slate-900 shadow-xl' : 'bg-white text-slate-400 border-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8 mb-6 px-2">
               <div>
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">{selectedLocation}</p>
                 <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    {currentView === 'home' ? 'Island Marketplace' : 
                     currentView === 'myads' ? 'My Listings' : 'Shortlisted Properties'}
                 </h2>
               </div>
               <span className="bg-slate-100 text-slate-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                 {filteredSet.length} items
               </span>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-5">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">Syncing Database...</p>
              </div>
            ) : hasPermissionError || (listings.length === 0 && !user) ? (
              <div className="py-20 text-center space-y-8 bg-white rounded-[3.5rem] border border-slate-100 mx-2 shadow-sm p-10">
                 <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                   <Icons.User />
                 </div>
                 <div className="space-y-3">
                    <p className="text-base font-black text-slate-900 uppercase tracking-widest">Login Required</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed">
                      Please register or login with your mobile number to view properties in Andaman.
                    </p>
                 </div>
                 <button 
                  onClick={() => setIsAuthOpen(true)}
                  className="bg-slate-900 text-white px-12 py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] active:scale-95 transition-all shadow-2xl"
                 >
                   Register / Login Now
                 </button>
              </div>
            ) : filteredSet.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
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
              <div className="py-24 text-center space-y-6 bg-white rounded-[3.5rem] border border-slate-100 mx-2 shadow-sm">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                   <Icons.Home />
                 </div>
                 <div className="space-y-2">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-widest">No matching results</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Try adjusting filters</p>
                 </div>
                 <button 
                  onClick={() => { setSearchQuery(''); setFilterType('ALL'); }}
                  className="bg-slate-900 text-white px-10 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest active:scale-95 shadow-xl"
                 >
                   Reset Filters
                 </button>
              </div>
            )}

            {currentView === 'home' && hasMore && filteredSet.length > 0 && (
               <button 
                 onClick={() => fetchMarket(true)} 
                 disabled={loadingMore}
                 className="w-full mt-10 py-8 border-2 border-dashed border-slate-200 rounded-[3rem] text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 hover:border-emerald-200 hover:text-emerald-500 transition-all flex items-center justify-center gap-4 active:scale-[0.98]"
               >
                 {loadingMore && <div className="w-4 h-4 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>}
                 {loadingMore ? 'Syncing...' : 'Load More Listings'}
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
          <div className="animate-in fade-in slide-in-from-bottom-12 duration-500 pt-4 pb-24">
            <button 
              onClick={() => setCurrentView('home')} 
              className="mb-8 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-900 transition-colors"
            >
              <div className="rotate-180"><Icons.ChevronRight /></div> Back to Market
            </button>
            
            <div className="bg-white rounded-[4rem] overflow-hidden shadow-2xl border border-white">
              <div className="aspect-video relative overflow-hidden bg-slate-100">
                <img 
                  src={selectedListing.imageUrls[0]} 
                  className="w-full h-full object-cover" 
                  alt={selectedListing.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>
                <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end">
                  <div className="space-y-2">
                    <span className="bg-emerald-500 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl">
                      {selectedListing.category}
                    </span>
                    <h1 className="text-4xl font-black text-white tracking-tighter leading-none mt-3">
                      {selectedListing.title}
                    </h1>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Price</p>
                    <p className="text-4xl font-black text-emerald-400">₹{selectedListing.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-14 space-y-12">
                <div className="flex flex-wrap gap-6">
                   {[
                     { label: 'Area / Spot', val: selectedListing.location, icon: <Icons.Location /> },
                     { label: 'Built Size', val: `${selectedListing.area} sq.ft`, icon: <Icons.Target /> },
                     { label: 'Level', val: selectedListing.floor, icon: <Icons.List /> },
                     { label: 'Verified Seller', val: selectedListing.ownerName, icon: <Icons.User /> }
                   ].map((item, idx) => (
                     <div key={idx} className="flex-grow min-w-[180px] bg-slate-50 p-8 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:border-emerald-100">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-emerald-500 group-hover:scale-125 transition-transform">{item.icon}</div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">{item.label}</p>
                        </div>
                        <p className="text-sm font-black text-slate-700">{item.val}</p>
                     </div>
                   ))}
                </div>

                <div className="space-y-5">
                  <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 border-b border-slate-50 pb-4">Details</p>
                  <p className="text-base font-medium text-slate-600 leading-relaxed whitespace-pre-wrap italic opacity-90">
                    "{selectedListing.description}"
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 pt-10 border-t border-slate-50">
                  <a 
                    href={`tel:${selectedListing.contactNumber}`} 
                    className="flex-1 bg-emerald-500 text-white py-7 rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.4em] text-center shadow-2xl shadow-emerald-500/30 active:scale-[0.98] transition-all"
                  >
                    Call Seller
                  </a>
                  <button 
                    onClick={() => { if(!user) setIsAuthOpen(true); else setIsChatOpen(true); }} 
                    className="flex-1 bg-slate-900 text-white py-7 rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.4em] shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-5"
                  >
                    <Icons.Message /> Chat Now
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

      <nav className="fixed bottom-0 left-0 right-0 p-8 z-[200] pointer-events-none">
        <div className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-3xl rounded-[3rem] p-3 shadow-2xl flex items-center justify-around pointer-events-auto border border-white/10 ring-1 ring-white/5">
           {[
             { v: 'home' as ViewState, i: Icons.Home, label: 'Search' },
             { v: 'saved' as ViewState, i: Icons.Bookmark, label: 'Saved' },
             { v: 'post' as ViewState, i: Icons.Plus, special: true, label: 'Add' },
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
                 "w-16 h-16 bg-emerald-500 rounded-[1.8rem] flex items-center justify-center text-white -mt-16 border-[5px] border-slate-900 shadow-2xl active:scale-90 transition-all ring-8 ring-slate-900/50" : 
                 "flex flex-col items-center gap-2 p-4 transition-all active:scale-95 group"
               }
             >
                <div className={currentView === btn.v ? 'text-emerald-400 scale-110' : 'text-slate-500 group-hover:text-slate-300'}>
                  <btn.i active={currentView === btn.v} />
                </div>
                {!btn.special && (
                  <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${currentView === btn.v ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {btn.label}
                  </span>
                )}
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
