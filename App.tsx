
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  auth, 
  getListings, 
  addListing, 
  updateListing,
  logout, 
  deleteListing,
  updateListingStatus,
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
  // Global State
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // UI State
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

  const PAGE_SIZE = 20;

  // Utilities
  const getTimeAgo = useCallback((date: number) => {
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 60) return "Just now";
    let interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + "h ago";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + "m ago";
    return "Recently";
  }, []);

  // Fetch Logic
  const fetchListings = useCallback(async (isLoadMore = false) => {
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
      setHasMore(result.listings.length === PAGE_SIZE);
    } catch (err) {
      console.error("Listing Fetch Error", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [lastDoc]);

  // Auth & Lifecycle
  useEffect(() => {
    const init = async () => {
      // Check for redirect sign-in (safety)
      await handleAuthRedirect();
      
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await getUserData(firebaseUser.uid);
          const userData = profile || { 
            id: firebaseUser.uid, 
            name: firebaseUser.displayName || 'Islander', 
            email: firebaseUser.email || '' 
          };
          setUser(userData);
          const favs = await getFavorites(userData.id);
          setFavorites(favs);
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
    init();
    fetchListings();
  }, []);

  // Handlers
  const handleFavoriteToggle = useCallback(async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!user) { setIsAuthOpen(true); return; }
    try {
      const nextFavs = await toggleFavorite(user.id, listingId);
      setFavorites(nextFavs);
      setToast({ 
        message: nextFavs.includes(listingId) ? "Shortlisted!" : "Removed from saved", 
        type: 'success' 
      });
    } catch (e) {
      setToast({ message: "Action failed", type: 'error' });
    }
  }, [user]);

  const handlePostSubmit = async (data: any) => {
    if (!user) { setIsAuthOpen(true); return; }
    try {
      if (editingListing) {
        await updateListing(editingListing.id, data);
        setListings(prev => prev.map(l => l.id === editingListing.id ? { ...l, ...data } : l));
        setToast({ message: "Listing updated!", type: 'success' });
      } else {
        const nl = await addListing(data, user);
        setListings(prev => [nl, ...prev]);
        setToast({ message: "Property posted live!", type: 'success' });
      }
      setEditingListing(null);
      setCurrentView('home');
    } catch (err) {
      setToast({ message: "Sync failed. Try again.", type: 'error' });
    }
  };

  const handleStatusUpdate = async (id: string, status: ListingStatus) => {
    try {
      await updateListingStatus(id, status);
      setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      setToast({ message: `Property marked as ${status}`, type: 'success' });
    } catch (err) {
      setToast({ message: "Update failed", type: 'error' });
    }
  };

  // Filtered Computed Data
  const displayedListings = useMemo(() => {
    let result = [...listings];

    // Main View Filter
    if (currentView === 'myads') {
      result = result.filter(l => l.ownerId === user?.id);
    } else if (currentView === 'saved') {
      result = result.filter(l => favorites.includes(l.id));
    }

    // Search & Category Filters
    return result.filter(l => {
      const q = searchQuery.toLowerCase();
      const title = (l.title || '').toLowerCase();
      const loc = (l.location || '').toLowerCase();
      const cat = (l.category || '').toLowerCase();

      const matchesSearch = title.includes(q) || loc.includes(q);
      const isRent = cat.includes('rent');
      const isSale = cat.includes('sale');
      const matchesCat = filterType === 'ALL' || 
                        (filterType === 'RENT' && isRent) || 
                        (filterType === 'SALE' && isSale);

      return matchesSearch && matchesCat;
    });
  }, [listings, currentView, user, favorites, searchQuery, filterType]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar 
        onViewChange={(v) => { setEditingListing(null); setCurrentView(v); }} 
        onOpenLocation={() => setIsLocationOpen(true)} 
        currentLocation={selectedLocation} 
      />

      <main className="max-w-4xl mx-auto px-4 pb-40">
        {['home', 'myads', 'saved'].includes(currentView) && (
          <div className="animate-in fade-in duration-500">
            {/* Search Header */}
            <div className="sticky top-[72px] z-[100] bg-slate-50/80 backdrop-blur-md py-4 space-y-3">
              <div className="flex gap-2">
                <div className="flex-grow flex items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100">
                  <Icons.Search />
                  <input 
                    className="bg-transparent outline-none ml-3 text-sm font-bold w-full placeholder:text-slate-300"
                    placeholder="Search Port Blair, houses, shops..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => setIsLocationOpen(true)}
                  className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-emerald-500"
                >
                  <Icons.Location />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(['ALL', 'RENT', 'SALE'] as const).map(t => (
                  <button 
                    key={t} 
                    onClick={() => setFilterType(t)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex-shrink-0 ${
                      filterType === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Heading */}
            <div className="flex items-center justify-between mt-4 mb-6">
               <h2 className="text-xl font-black tracking-tight text-slate-900">
                  {currentView === 'home' ? 'Top Recommendations' : 
                   currentView === 'myads' ? 'My Listings' : 'Shortlisted Properties'}
               </h2>
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                 {displayedListings.length} results
               </span>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div></div>
            ) : displayedListings.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {displayedListings.map(l => (
                  <ListingCard 
                    key={l.id} 
                    listing={l} 
                    isFavorited={favorites.includes(l.id)}
                    onFavoriteToggle={handleFavoriteToggle}
                    isOwner={user?.id === l.ownerId}
                    timeAgo={getTimeAgo(l.postedAt)}
                    onClick={(listing) => { setSelectedListing(listing); setCurrentView('details'); }}
                    onEdit={(e) => { e.stopPropagation(); setEditingListing(l); setCurrentView('post'); }}
                  />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-4">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300"><Icons.Home /></div>
                 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">No listings found in this category</p>
              </div>
            )}

            {currentView === 'home' && hasMore && displayedListings.length > 0 && (
               <button 
                 onClick={() => fetchListings(true)} 
                 disabled={loadingMore}
                 className="w-full mt-8 py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-300 hover:text-emerald-500 transition-all"
               >
                 {loadingMore ? 'Syncing...' : 'Fetch More Properties'}
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6">
            <button onClick={() => setCurrentView('home')} className="mb-6 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">
              ← Back to Market
            </button>
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-white">
              <div className="aspect-video relative overflow-hidden bg-slate-100">
                <img src={selectedListing.imageUrls[0]} className="w-full h-full object-cover" />
                <div className="absolute top-6 left-6 flex gap-2">
                  <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">{selectedListing.category}</span>
                </div>
              </div>
              <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                  <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">{selectedListing.title}</h1>
                    <p className="flex items-center gap-2 text-slate-400 font-bold text-xs"><Icons.Location /> {selectedListing.location}</p>
                  </div>
                  <div className="bg-slate-900 text-white px-8 py-5 rounded-[2rem] text-center shadow-2xl w-full md:w-auto">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Total Value</p>
                    <p className="text-2xl font-black">₹{selectedListing.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                   {[
                     { l: 'Floor', v: selectedListing.floor },
                     { l: 'Area', v: `${selectedListing.area} sq.ft` },
                     { l: 'Parking', v: selectedListing.parking },
                     { l: 'Furnishing', v: selectedListing.furnishing || 'Standard' }
                   ].map((item, i) => (
                     <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-300 mb-1">{item.l}</p>
                        <p className="text-xs font-black text-slate-700">{item.v}</p>
                     </div>
                   ))}
                </div>
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 mb-10">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-4">Description</p>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedListing.description}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-slate-50">
                  <a href={`tel:${selectedListing.contactNumber}`} className="flex-1 bg-emerald-500 text-white py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] text-center shadow-xl shadow-emerald-500/10 active:scale-95 transition-all">Direct Call</a>
                  <button onClick={() => { if(!user) setIsAuthOpen(true); else setIsChatOpen(true); }} className="flex-1 bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-xl active:scale-95 transition-all">Chat with Owner</button>
                </div>
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

      {/* Floating Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 p-6 z-[200] pointer-events-none">
        <div className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] p-3 shadow-2xl flex items-center justify-around pointer-events-auto border border-white/5">
           {[
             { v: 'home' as ViewState, i: Icons.Home },
             { v: 'saved' as ViewState, i: Icons.Bookmark },
             { v: 'post' as ViewState, i: Icons.Plus, special: true },
             { v: 'myads' as ViewState, i: Icons.List },
             { v: 'profile' as ViewState, i: Icons.User }
           ].map(btn => (
             <button 
               key={btn.v} 
               onClick={() => { 
                 if(!user && btn.v !== 'home') setIsAuthOpen(true); 
                 else { setEditingListing(null); setCurrentView(btn.v); } 
               }} 
               className={btn.special ? "w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white -mt-10 border-4 border-slate-900 shadow-xl active:scale-90 transition-all" : `p-4 transition-all ${currentView === btn.v ? 'text-emerald-400 scale-110' : 'text-slate-500'}`}
             >
                <btn.i active={currentView === btn.v} />
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
