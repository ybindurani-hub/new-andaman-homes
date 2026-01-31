import React, { useState, useEffect } from 'react';
import { auth, getListings, addListing, logout, getFavorites, toggleFavorite, deleteListing, updateListingStatus, handleRedirectResult } from './services/firebase.ts';
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
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('Andaman Islands');

  // Ad simulation state
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [pendingView, setPendingView] = useState<ViewState | null>(null);

  useEffect(() => {
    // Check for redirect result on startup (crucial for mobile WebView login)
    handleRedirectResult().then(redirectUser => {
      if (redirectUser) {
        setUser(redirectUser);
        setSuccessMessage(`Welcome back, ${redirectUser.name}`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    });

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
        // Protect views that require authentication (except home and details)
        if (currentView !== 'home' && currentView !== 'details') {
          switchView('home');
        }
      }
    }, (error) => {
      if (error.message.includes('unauthorized-domain')) {
        setAuthError(`Auth Error: Domain not authorized in Firebase.`);
      }
    });
    return () => unsubscribe();
  }, [currentView]);

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
    try {
      await updateListingStatus(listingId, newStatus);
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: newStatus } : l));
      if (selectedListing?.id === listingId) {
        setSelectedListing(prev => prev ? { ...prev, status: newStatus } : null);
      }
      setSuccessMessage(`Marked as ${newStatus}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Status update error:", error);
    }
  };

  const handleDeleteListing = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!window.confirm("Permanently remove this ad?")) return;
    
    try {
      await deleteListing(listingId);
      setListings(prev => prev.filter(l => l.id !== listingId));
      setSuccessMessage("Ad removed successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      if (selectedListing?.id === listingId) {
        switchView('home');
        setSelectedListing(null);
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleListingClick = (listing: PropertyListing) => {
    // Unauthenticated users can now see the details page
    setSelectedListing(listing);
    switchView('details');
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
      <AdBanner position="top" triggerRefresh={currentView} />
      <div className="mb-6 mt-6">
        <h2 className="text-2xl font-black text-slate-900 leading-none">{title}</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{items.length} Properties Found</p>
      </div>
      
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map(listing => (
            <ListingCard 
              key={listing.id} 
              listing={listing} 
              isFavorited={favorites.includes(listing.id)}
              onFavoriteToggle={handleFavoriteToggle}
              isOwner={user?.id === listing.ownerId}
              onDelete={handleDeleteListing}
              onClick={handleListingClick} 
            />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
             <Icons.Bookmark active={false} />
          </div>
          <h3 className="text-slate-900 font-black text-lg mb-1">No properties here</h3>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest px-10">{emptyMessage}</p>
        </div>
      )}
      <AdBanner position="bottom" triggerRefresh={currentView} />
    </div>
  );

  const renderHome = () => (
    <div className="pb-32 bg-white min-h-screen">
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top duration-300">
          <div className="bg-slate-900 text-white px-6 py-2.5 rounded-full shadow-2xl font-black text-[9px] uppercase tracking-[0.2em] flex items-center gap-2">
            {successMessage}
          </div>
        </div>
      )}

      <AdBanner position="top" triggerRefresh={currentView} />

      <div className="max-w-4xl mx-auto px-4 mt-6">
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-[2.5rem] p-8 sm:p-12 border border-slate-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#4CAF50]/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
           <div className="relative z-10">
              <h2 className="text-4xl font-black text-slate-900 mb-8 leading-tight tracking-tight">Direct from Owners.<br/><span className="text-[#4CAF50]">Zero Brokerage.</span></h2>
              <div className="relative group max-w-2xl">
                <div className="absolute inset-y-0 left-5 flex items-center text-slate-400 group-focus-within:text-[#4CAF50] transition-colors pointer-events-none">
                  <Icons.Search />
                </div>
                <input 
                  type="text" 
                  placeholder="Search by Locality, House or Shop Type..." 
                  className="w-full bg-white border-2 border-slate-100 focus:border-[#4CAF50] rounded-[1.5rem] py-5 pl-14 pr-6 outline-none shadow-sm transition-all font-bold text-slate-700 text-lg placeholder:text-slate-300"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-12">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1">
          {(['ALL', 'RENT', 'SALE'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex-shrink-0 border-2 ${
                filterType === type 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
                  : 'bg-white text-slate-400 border-slate-50 hover:border-slate-100'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Verified Listings</h3>
          <div className="h-[1px] bg-slate-100 flex-grow ml-8"></div>
        </div>
        
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
             <div className="w-10 h-10 border-4 border-slate-50 border-t-[#4CAF50] rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Refreshing Paradise...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {filteredListings.map(listing => (
              <ListingCard 
                key={listing.id} 
                listing={listing} 
                isFavorited={favorites.includes(listing.id)}
                onFavoriteToggle={handleFavoriteToggle}
                isOwner={user?.id === listing.ownerId}
                onDelete={handleDeleteListing}
                onClick={handleListingClick} 
              />
            ))}
          </div>
        )}
        
        {filteredListings.length === 0 && !loading && (
          <div className="py-32 text-center">
            <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-slate-200">
               <Icons.Home />
            </div>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">No results found for your criteria</p>
          </div>
        )}
      </div>

      <AdBanner position="bottom" triggerRefresh={currentView} />
    </div>
  );

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-slate-100 px-4 pt-3 pb-8 z-[100] shadow-[0_-15px_50px_rgba(0,0,0,0.05)]">
      <div className="max-w-lg mx-auto flex items-end justify-between relative h-14">
        <button onClick={() => switchView('home')} className="flex flex-col items-center flex-1 transition-transform active:scale-90 group">
          <div className="mb-1"><Icons.Home active={currentView === 'home'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'home' ? 'text-[#4CAF50]' : 'text-slate-300 group-hover:text-slate-500'}`}>Market</span>
        </button>
        
        <button onClick={() => { if (!user) { setAuthMessage('Login to access your shortlist'); setIsAuthOpen(true); } else switchView('saved'); }} className="flex flex-col items-center flex-1 transition-transform active:scale-90 group">
          <div className="mb-1"><Icons.Bookmark active={currentView === 'saved'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'saved' ? 'text-[#4CAF50]' : 'text-slate-300 group-hover:text-slate-500'}`}>Shortlist</span>
        </button>

        <div className="flex-1 flex justify-center pb-1">
          <button onClick={() => { if (!user) { setAuthMessage('Sign in to list your property for free'); setIsAuthOpen(true); } else switchView('post'); }} className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex flex-col items-center justify-center text-white shadow-2xl shadow-slate-300 -mt-10 active:scale-95 transition-all border-4 border-white">
            <Icons.Plus />
            <span className="text-[8px] font-black uppercase tracking-[0.1em] mt-0.5">List Ad</span>
          </button>
        </div>

        <button onClick={() => { if (!user) { setAuthMessage('Login to manage your listings'); setIsAuthOpen(true); } else switchView('myads'); }} className="flex flex-col items-center flex-1 transition-transform active:scale-90 group">
          <div className="mb-1"><Icons.List active={currentView === 'myads'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'myads' ? 'text-[#4CAF50]' : 'text-slate-300 group-hover:text-slate-500'}`}>My Ads</span>
        </button>

        <button onClick={() => { if (!user) { setAuthMessage('Login to view account'); setIsAuthOpen(true); } else switchView('profile'); }} className="flex flex-col items-center flex-1 transition-transform active:scale-90 group">
          <div className="mb-1"><Icons.User active={currentView === 'profile'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'profile' ? 'text-[#4CAF50]' : 'text-slate-300 group-hover:text-slate-500'}`}>Account</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#4CAF50]/20 antialiased">
      {authError && <div className="bg-red-500 text-white p-3 text-center text-[10px] font-black uppercase tracking-[0.3em] sticky top-0 z-[1000] shadow-xl">⚠️ {authError}</div>}
      
      <Navbar 
        onViewChange={switchView} 
        onOpenLocation={() => setIsLocationOpen(true)}
        currentLocation={selectedLocation} 
      />
      
      <main>
        {currentView === 'home' && renderHome()}
        {currentView === 'saved' && renderListingGrid(savedListings, "Shortlisted Properties", "Manage the properties you have saved for later.")}
        {currentView === 'myads' && renderListingGrid(myAdsListings, "Property Manager", "Manage, edit or remove your property advertisements.")}
        
        {currentView === 'post' && user && (
          <ListingForm 
            onSubmit={async (data) => {
              try {
                const newListing = await addListing(data, user);
                setListings(prev => [newListing, ...prev]);
                switchView('home');
                setSuccessMessage("Listing Live!");
                setTimeout(() => setSuccessMessage(null), 3000);
              } catch (e) {
                console.error(e);
                throw e;
              }
            }} 
            onCancel={() => switchView('home')} 
          />
        )}
        
        {currentView === 'details' && selectedListing && (
          <div className="max-w-3xl mx-auto px-4 py-10 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AdBanner position="top" triggerRefresh={selectedListing.id} />
            <button onClick={() => switchView('home')} className="mb-8 mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Search
            </button>
            
            <div className="space-y-10">
              <div className="aspect-[16/10] rounded-[3rem] overflow-hidden shadow-2xl relative bg-slate-50 group border border-slate-50">
                <img 
                  src={selectedListing.imageUrls?.[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200'} 
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ${selectedListing.status !== ListingStatus.ACTIVE ? 'grayscale opacity-70' : ''}`} 
                  alt={selectedListing.title} 
                />
                <div className="absolute top-8 left-8 flex gap-3">
                   <div className="bg-slate-900 text-white px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl">
                     {selectedListing.category}
                   </div>
                   {selectedListing.status !== ListingStatus.ACTIVE && (
                      <div className="bg-white text-slate-900 px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl border border-white">
                        {selectedListing.status}
                      </div>
                   )}
                </div>
                <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-md px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl text-slate-900 border border-white">
                  {selectedListing.imageUrls?.length || 1} Photos
                </div>
              </div>

              <div className="px-2 space-y-10">
                {/* Status Manager for Owner */}
                {user && user.id === selectedListing.ownerId && (
                  <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Owner Console</h4>
                    <div className="flex flex-wrap gap-3">
                       {[ListingStatus.ACTIVE, ListingStatus.SOLD, ListingStatus.RENTED, ListingStatus.BOOKED].map(s => (
                         <button 
                           key={s}
                           onClick={() => handleStatusChange(selectedListing.id, s)}
                           className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                             selectedListing.status === s 
                               ? 'bg-slate-900 text-white shadow-lg' 
                               : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'
                           }`}
                         >
                           {s}
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                  <div className="space-y-3 flex-grow">
                    <h2 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">{selectedListing.title}</h2>
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-400 uppercase tracking-widest">
                      <div className="text-[#4CAF50]"><Icons.Location /></div>
                      {selectedListing.location}
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0 bg-[#4CAF50]/5 p-6 rounded-3xl border border-[#4CAF50]/10 min-w-[200px]">
                    <div className="text-4xl font-black text-slate-900 leading-none">₹{selectedListing.price.toLocaleString()}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-[0.3em]">
                      {selectedListing.category.toLowerCase().includes('rent') ? 'Monthly Rent' : 'Selling Price'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center flex flex-col items-center justify-center gap-1">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Built-up</div>
                      <div className="text-lg font-black text-slate-900">{selectedListing.area} {selectedListing.areaUnit}</div>
                   </div>
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center flex flex-col items-center justify-center gap-1">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Layout</div>
                      <div className="text-lg font-black text-slate-900">{selectedListing.bhk || 'Plot'}</div>
                   </div>
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center flex flex-col items-center justify-center gap-1">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Level</div>
                      <div className="text-lg font-black text-slate-900">{selectedListing.floor || 'G'}</div>
                   </div>
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-center flex flex-col items-center justify-center gap-1">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Posted</div>
                      <div className="text-lg font-black text-slate-900">{selectedListing.postedBy}</div>
                   </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center gap-4">
                    Property Insights <div className="h-px bg-slate-100 flex-grow"></div>
                  </h4>
                  <p className="text-slate-600 text-lg leading-relaxed font-medium">{selectedListing.description}</p>
                </div>

                {/* Owner Info & Actions */}
                <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                   
                   <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center border border-white/20">
                           <span className="text-2xl font-black text-white">{selectedListing.ownerName.charAt(0)}</span>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Direct Contact</p>
                           <p className="text-2xl font-black text-white tracking-tight">{selectedListing.ownerName}</p>
                           <div className="flex items-center gap-2 mt-2">
                              <div className="w-2 h-2 bg-[#4CAF50] rounded-full animate-pulse"></div>
                              <span className="text-[9px] font-black text-[#4CAF50] uppercase tracking-widest">Verified Owner</span>
                           </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <a 
                          href={user ? (user.id === selectedListing.ownerId ? "#" : `tel:${selectedListing.contactNumber}`) : "#"} 
                          onClick={(e) => { 
                            if (!user) {
                              e.preventDefault();
                              setAuthMessage('Sign in to call the property owner');
                              setIsAuthOpen(true);
                            } else if(user.id === selectedListing.ownerId) {
                              e.preventDefault();
                            }
                          }}
                          className={`flex-[2] flex items-center justify-center gap-3 py-6 px-10 rounded-3xl font-black uppercase text-[12px] tracking-[0.2em] shadow-xl active:scale-95 transition-all ${user && user.id === selectedListing.ownerId ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-[#4CAF50] hover:bg-[#43a047] text-white'}`}
                        >
                          <div className="scale-125"><Icons.Phone /></div> {user && user.id === selectedListing.ownerId ? 'Your Own Ad' : 'Call Owner'}
                        </a>
                        <button 
                          onClick={() => { 
                            if (!user) {
                              setAuthMessage('Sign in to start a chat with the owner');
                              setIsAuthOpen(true);
                            } else if (user.id !== selectedListing.ownerId) {
                              setIsChatOpen(true);
                            }
                          }} 
                          disabled={user && user.id === selectedListing.ownerId}
                          className={`flex-1 py-6 px-10 rounded-3xl font-black uppercase text-[12px] tracking-[0.2em] transition-all ${user && user.id === selectedListing.ownerId ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-95'}`}
                        >
                          Chat Now
                        </button>
                      </div>
                   </div>
                </div>
                
                {user && user.id === selectedListing.ownerId && (
                  <button 
                    onClick={(e) => handleDeleteListing(e, selectedListing.id)}
                    className="w-full bg-red-50 text-red-500 py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 border border-red-100/50 hover:bg-red-100 transition-colors"
                  >
                    <Icons.Trash /> Delete Property Ad
                  </button>
                )}
              </div>
            </div>
            <AdBanner position="bottom" triggerRefresh={selectedListing.id} />
          </div>
        )}
        
        {currentView === 'profile' && user && (
          <div className="max-w-lg mx-auto p-12 pb-40 text-center animate-in fade-in zoom-in-95 duration-500">
            <AdBanner position="top" triggerRefresh={currentView} />
            <div className="w-28 h-28 bg-slate-50 text-[#4CAF50] rounded-[3rem] mx-auto flex items-center justify-center shadow-inner border-2 border-slate-100 mb-10 mt-8">
              <div className="scale-[1.8]"><Icons.User active /></div>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">{user.name}</h2>
            <p className="text-slate-400 font-bold text-base mb-16">{user.email}</p>
            
            <div className="space-y-4 max-w-sm mx-auto">
              <button className="w-full bg-white border-2 border-slate-100 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest text-slate-600 hover:border-slate-200 transition-colors">
                Personal Settings
              </button>
              <button 
                onClick={async () => { await logout(); setUser(null); switchView('home'); }} 
                className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-transform"
              >
                Sign Out
              </button>
            </div>
            <AdBanner position="bottom" triggerRefresh={currentView} />
          </div>
        )}
      </main>

      <BottomNav />
      
      {/* Overlays */}
      <AuthOverlay 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onUserSet={(u) => { setUser(u); }} 
        message={authMessage}
      />
      <LocationOverlay 
        isOpen={isLocationOpen} 
        onClose={() => setIsLocationOpen(false)}
        onSelect={(loc) => {
          setSelectedLocation(loc);
          // Simulating context refresh
          setSearchQuery('');
        }}
        currentLocation={selectedLocation}
      />
      {showInterstitial && <InterstitialAd onClose={handleInterstitialClose} />}
      {selectedListing && user && <ChatOverlay isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} user={user} listing={selectedListing} />}
    </div>
  );
};

export default App;