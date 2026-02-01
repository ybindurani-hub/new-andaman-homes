
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
  getAuthErrorMessage, 
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
import { Icons, ANDAMAN_LOCATIONS } from './constants.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [editingListing, setEditingListing] = useState<PropertyListing | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'RENT' | 'SALE'>('ALL');
  const [loading, setLoading] = useState(true);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [isHandshaking, setIsHandshaking] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('Port Blair');

  const PAGE_SIZE = 12;

  const getTimeAgo = useCallback((date: number) => {
    if (!date) return "Recently";
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
      const result = await getListings(undefined, PAGE_SIZE);
      const data = result?.listings || [];
      setListings(data);
      setLastDoc(result?.lastDoc || null);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error("Listing Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMoreListings = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getListings(lastDoc, PAGE_SIZE);
      const data = result?.listings || [];
      if (data.length > 0) {
        setListings(prev => [...prev, ...data]);
        setLastDoc(result?.lastDoc || null);
        setHasMore(data.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
       console.error("Fetch More Error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, lastDoc]);

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 2000);
    
    const initApp = async () => {
      setIsHandshaking(true);
      try {
        const redirectUser = await handleAuthRedirect();
        if (redirectUser) {
          setUser(redirectUser);
          setToast({ message: `Success! Welcome, ${redirectUser.name}`, type: 'success' });
          setIsAuthOpen(false);
        }
      } catch (err: any) {
        console.error("Redirect Handler Error:", err);
      } finally {
        setIsHandshaking(false);
      }

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const profile = await getUserData(firebaseUser.uid);
            const userData = profile || { 
              id: firebaseUser.uid, 
              name: firebaseUser.displayName || 'Islander', 
              email: firebaseUser.email || '' 
            };
            setUser(userData);
            getFavorites(firebaseUser.uid).then(setFavorites).catch(() => {});
          } catch (e) {
            console.error("Profile Fetch Error:", e);
          }
        } else {
          setUser(null);
          setFavorites([]);
          if (['post', 'profile', 'settings', 'myads', 'saved'].includes(currentView)) {
            setCurrentView('home');
          }
        }
        setAuthInitializing(false);
      });

      fetchInitialListings();
      return unsubscribe;
    };

    const cleanup = initApp();
    return () => {
      clearTimeout(splashTimer);
      cleanup.then(unsub => unsub?.());
    };
  }, []);

  const handleFavoriteToggle = useCallback(async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!user) { setIsAuthOpen(true); return; }
    try {
      const next = await toggleFavorite(user.id, listingId);
      setFavorites(next);
      setToast({ message: next.includes(listingId) ? "Shortlisted" : "Removed", type: 'success' });
    } catch (e) {
      setToast({ message: "Action failed", type: 'error' });
    }
  }, [user]);

  const filteredListings = useMemo(() => {
    if (!listings) return [];
    return listings.filter(l => {
      const q = searchQuery.toLowerCase();
      const title = l?.title?.toLowerCase() || '';
      const location = l?.location?.toLowerCase() || '';
      const category = l?.category?.toLowerCase() || '';
      
      const match = title.includes(q) || location.includes(q);
      const isRent = category.includes('rent');
      const isSale = category.includes('sale');
      
      const catMatch = filterType === 'ALL' || 
                       (filterType === 'RENT' && isRent) || 
                       (filterType === 'SALE' && isSale);
      
      return match && catMatch;
    });
  }, [listings, searchQuery, filterType]);

  const handleListingClick = useCallback((listing: PropertyListing) => {
    setSelectedListing(listing);
    setCurrentView('details');
  }, []);

  const handlePostSubmit = useCallback(async (data: any) => {
    if(!user) { setIsAuthOpen(true); return; }
    try {
      if (editingListing) {
        await updateListing(editingListing.id, data);
        setListings(p => p.map(l => l.id === editingListing.id ? { ...l, ...data } : l));
        setToast({ message: "Update successful!", type: 'success' });
      } else {
        const nl = await addListing(data, user);
        setListings(p => [nl, ...p]);
        setToast({ message: "Property listed live!", type: 'success' });
      }
      setEditingListing(null);
      setCurrentView('home');
    } catch(err) {
      setToast({ message: "Action failed. Check signal.", type: 'error' });
    }
  }, [user, editingListing]);

  const handleDeleteAd = async (listingId: string) => {
    if (!window.confirm("Confirm deletion?")) return;
    try {
      await deleteListing(listingId);
      setListings(p => p.filter(l => l.id !== listingId));
      setCurrentView('home');
      setToast({ message: "Property removed.", type: 'success' });
    } catch (err) {
      setToast({ message: "Delete failed.", type: 'error' });
    }
  };

  const handleStatusUpdate = async (listingId: string, status: ListingStatus) => {
    try {
      await updateListingStatus(listingId, status);
      setListings(p => p.map(l => l.id === listingId ? { ...l, status } : l));
      if (selectedListing?.id === listingId) {
        setSelectedListing(prev => prev ? { ...prev, status } : null);
      }
      setToast({ message: `Marked as ${status}`, type: 'success' });
    } catch (err) {
      setToast({ message: "Status update failed.", type: 'error' });
    }
  };

  const handleEditAd = (listing: PropertyListing) => {
    setEditingListing(listing);
    setCurrentView('post');
  };

  if (showSplash || isHandshaking || authInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
        <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl animate-bounce shadow-2xl">A</div>
        <p className="mt-8 text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] animate-pulse">
          {isHandshaking ? 'Verifying Island Session...' : 'Andaman Homes'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-100">
      <Navbar onViewChange={setCurrentView} onOpenLocation={() => setIsLocationOpen(true)} currentLocation={selectedLocation} />
      
      <main className="max-w-4xl mx-auto">
        {currentView === 'home' && (
          <div className="pb-40">
            <div className="sticky top-[72px] z-[1000] bg-white/80 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
              <div className="flex-grow flex items-center bg-slate-100 rounded-xl px-4 py-2.5 min-w-[180px]">
                <Icons.Search />
                <input 
                  className="bg-transparent outline-none ml-2 text-xs font-bold w-full placeholder:text-slate-400"
                  placeholder="House, Shop, Land..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {(['ALL', 'RENT', 'SALE'] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border flex-shrink-0 transition-all ${filterType === t ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{t}</button>
              ))}
            </div>

            <div className="p-3 sm:p-4">
              {loading ? (
                <div className="py-24 flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-[3px] border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {filteredListings.map(l => (
                    <ListingCard 
                      key={l.id} 
                      listing={l} 
                      isFavorited={favorites.includes(l.id)} 
                      onFavoriteToggle={handleFavoriteToggle} 
                      isOwner={user?.id === l.ownerId} 
                      onClick={handleListingClick} 
                      onEdit={(e, list) => { e.stopPropagation(); handleEditAd(list); }}
                      timeAgo={getTimeAgo(l.postedAt)} 
                    />
                  ))}
                </div>
              )}
              
              {hasMore && filteredListings.length > 0 && !loading && (
                <button onClick={fetchMoreListings} disabled={loadingMore} className="w-full mt-8 py-5 rounded-2xl border-2 border-dashed border-slate-200 font-black text-[9px] uppercase tracking-widest text-slate-400 hover:border-emerald-500 hover:text-emerald-500 transition-all">
                  {loadingMore ? 'Connecting...' : 'Fetch More Properties'}
                </button>
              )}
            </div>
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
          <div className="pb-40 pt-6 px-4 animate-in fade-in duration-500">
             <div className="flex justify-between items-center mb-6">
                <button onClick={() => setCurrentView('home')} className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-400 tracking-widest group">
                  <span className="group-hover:-translate-x-1 transition-transform">←</span> Back
                </button>
                {user?.id === selectedListing.ownerId && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditAd(selectedListing)}
                      className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                    >
                      Edit
                    </button>
                    <select 
                      className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none"
                      value={selectedListing.status}
                      onChange={(e) => handleStatusUpdate(selectedListing.id, e.target.value as ListingStatus)}
                    >
                      {Object.values(ListingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button 
                      onClick={() => handleDeleteAd(selectedListing.id)}
                      className="bg-rose-50 text-rose-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 flex items-center gap-2"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                )}
             </div>
             
             <div className="rounded-[2.5rem] overflow-hidden bg-slate-100 aspect-video mb-8 shadow-2xl border border-white">
               <img src={selectedListing?.imageUrls?.[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800'} className="w-full h-full object-cover" alt="" />
             </div>
             <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-black mb-2 leading-tight tracking-tight">{selectedListing.title}</h2>
                    <p className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      <Icons.Location /> {selectedListing.location}
                    </p>
                  </div>
                  <div className="bg-slate-900 text-white px-8 py-5 rounded-3xl text-center shadow-xl">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Asking Price</p>
                    <p className="text-2xl font-black">₹{selectedListing?.price?.toLocaleString() || 'N/A'}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 mb-8">
                   <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Property Bio</h3>
                   <p className="text-slate-600 leading-relaxed font-medium text-sm">{selectedListing.description}</p>
                </div>
                <div className="flex gap-4">
                  <a href={`tel:${selectedListing.contactNumber}`} className="flex-1 bg-emerald-500 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest text-center shadow-lg active:scale-95 transition-all">Contact Owner</a>
                  <button onClick={() => { if(!user) setIsAuthOpen(true); else setIsChatOpen(true); }} className="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-xl">Chat Now</button>
                </div>
             </div>
          </div>
        )}

        {(currentView === 'settings' || currentView === 'profile' || currentView === 'myads' || currentView === 'saved') && user && (
          <SettingsScreen 
            user={user} onUpdateUser={setUser} 
            onBack={() => setCurrentView('home')} 
            onLogout={async () => { await logout(); setUser(null); setCurrentView('home'); }} 
            onToast={(m, t) => setToast({ message: m, type: t })}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 p-6 z-[2000] pointer-events-none">
        <div className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] p-3 shadow-2xl flex items-center justify-around pointer-events-auto border border-white/5">
           {[
             { v: 'home' as ViewState, i: Icons.Home },
             { v: 'saved' as ViewState, i: Icons.Bookmark },
             { v: 'post' as ViewState, i: Icons.Plus, special: true },
             { v: 'myads' as ViewState, i: Icons.List },
             { v: 'profile' as ViewState, i: Icons.User }
           ].map(btn => (
             <button key={btn.v} onClick={() => { if(!user && btn.v !== 'home') setIsAuthOpen(true); else { setEditingListing(null); setCurrentView(btn.v); } }} className={btn.special ? "w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white -mt-10 border-4 border-slate-900 shadow-xl active:scale-90 transition-all" : `p-4 transition-all ${currentView === btn.v ? 'text-emerald-400 scale-110' : 'text-slate-500'}`}>
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
