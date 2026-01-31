import React, { useState, useEffect } from 'react';
import { auth, getListings, addListing, logout, getFavorites, toggleFavorite, deleteListing, updateListingStatus } from './services/firebase.ts';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { User, PropertyListing, ViewState, ListingCategory, ListingStatus } from './types.ts';
import Navbar from './components/Navbar.tsx';
import ListingCard from './components/ListingCard.tsx';
import ListingForm from './components/ListingForm.tsx';
import AuthOverlay from './components/AuthOverlay.tsx';
import ChatOverlay from './components/ChatOverlay.tsx';
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
        // If logged out while in a protected view, go home
        if (currentView !== 'home') setCurrentView('home');
      }
    }, (error) => {
      if (error.message.includes('unauthorized-domain')) {
        setAuthError(`Domain Error. Add '${window.location.hostname}' to Firebase console.`);
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

  const handleFavoriteToggle = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!user) {
      setAuthMessage('Login to save properties to your favorites');
      setIsAuthOpen(true);
      return;
    }
    const newFavs = await toggleFavorite(user.id, listingId);
    setFavorites(newFavs);
  };

  const handleDeleteListing = async (e: React.MouseEvent, listingId: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this listing permanently?")) return;
    
    try {
      await deleteListing(listingId);
      setListings(prev => prev.filter(l => l.id !== listingId));
      setSuccessMessage("Listing removed");
      setTimeout(() => setSuccessMessage(null), 3000);
      if (selectedListing?.id === listingId) {
        setCurrentView('home');
        setSelectedListing(null);
      }
    } catch (error) {
      console.error("Delete listing error:", error);
    }
  };

  const handleListingClick = (listing: PropertyListing) => {
    if (!user) {
      setAuthMessage('Sign up to view full property details and contact owners');
      setIsAuthOpen(true);
      return;
    }
    setSelectedListing(listing);
    setCurrentView('details');
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
          <h3 className="text-slate-900 font-black text-lg mb-1">Empty</h3>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest px-10">{emptyMessage}</p>
        </div>
      )}
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

      {/* Modern Search Hero */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <div className="bg-slate-50 rounded-[2.5rem] p-6 sm:p-10 border border-slate-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#4CAF50]/5 rounded-full -mr-16 -mt-16"></div>
           <div className="relative z-10">
              <h2 className="text-3xl font-black text-slate-900 mb-6 leading-tight">Find Your Perfect<br/>Space in Paradise.</h2>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-[#4CAF50] transition-colors pointer-events-none">
                  <Icons.Search />
                </div>
                <input 
                  type="text" 
                  placeholder="Search Location, House or Shop..." 
                  className="w-full bg-white border-2 border-slate-100 focus:border-[#4CAF50] rounded-2xl py-5 pl-14 pr-6 outline-none shadow-sm transition-all font-bold text-slate-700 text-base placeholder:text-slate-300"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
           </div>
        </div>
      </div>

      {/* Professional Filter Tabs */}
      <div className="max-w-4xl mx-auto px-4 mt-10">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
          {(['ALL', 'RENT', 'SALE'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex-shrink-0 border-2 ${
                filterType === type 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-100' 
                  : 'bg-white text-slate-400 border-slate-50 hover:border-slate-100'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Listing Section */}
      <div className="max-w-4xl mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Featured Listings</h3>
          <div className="h-[2px] bg-slate-50 flex-grow ml-6"></div>
        </div>
        
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
             <div className="w-8 h-8 border-4 border-slate-100 border-t-[#4CAF50] rounded-full animate-spin"></div>
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Scanning Islands...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
               <Icons.Home />
            </div>
            <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.2em]">No properties found in this filter</p>
          </div>
        )}
      </div>
    </div>
  );

  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 px-4 pt-3 pb-8 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
      <div className="max-w-lg mx-auto flex items-end justify-between relative h-14">
        <button onClick={() => setCurrentView('home')} className="flex flex-col items-center flex-1 transition-transform active:scale-90">
          <div className="mb-1"><Icons.Home active={currentView === 'home'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'home' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>Market</span>
        </button>
        
        <button onClick={() => { if (!user) { setAuthMessage('Login to view saved items'); setIsAuthOpen(true); } else setCurrentView('saved'); }} className="flex flex-col items-center flex-1 transition-transform active:scale-90">
          <div className="mb-1"><Icons.Bookmark active={currentView === 'saved'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'saved' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>Saved</span>
        </button>

        <div className="flex-1 flex justify-center pb-1">
          <button onClick={() => { if (!user) { setAuthMessage('Login to post your ad'); setIsAuthOpen(true); } else setCurrentView('post'); }} className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex flex-col items-center justify-center text-white shadow-2xl shadow-slate-300 -mt-10 active:scale-95 transition-all">
            <Icons.Plus />
            <span className="text-[8px] font-black uppercase tracking-[0.1em] mt-0.5">Post</span>
          </button>
        </div>

        <button onClick={() => { if (!user) { setAuthMessage('Login to manage your ads'); setIsAuthOpen(true); } else setCurrentView('myads'); }} className="flex flex-col items-center flex-1 transition-transform active:scale-90">
          <div className="mb-1"><Icons.List active={currentView === 'myads'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'myads' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>My Ads</span>
        </button>

        <button onClick={() => { if (!user) { setAuthMessage('Login to view your profile'); setIsAuthOpen(true); } else setCurrentView('profile'); }} className="flex flex-col items-center flex-1 transition-transform active:scale-90">
          <div className="mb-1"><Icons.User active={currentView === 'profile'} /></div>
          <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === 'profile' ? 'text-[#4CAF50]' : 'text-slate-300'}`}>Account</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#4CAF50]/10 antialiased">
      {authError && <div className="bg-slate-900 text-white p-3 text-center text-[9px] font-black uppercase tracking-[0.3em] sticky top-0 z-[1000]">⚠️ {authError}</div>}
      
      <Navbar onViewChange={setCurrentView} currentLocation="Andaman Islands" />
      
      <main>
        {currentView === 'home' && renderHome()}
        {currentView === 'saved' && renderListingGrid(savedListings, "Saved Collection", "Keep track of the properties you're interested in by tapping the heart.")}
        {currentView === 'myads' && renderListingGrid(myAdsListings, "My Properties", "Manage the houses, shops, or land you've listed for sale or rent.")}
        
        {currentView === 'post' && user && (
          <ListingForm 
            onSubmit={async (data) => {
              try {
                const newListing = await addListing(data, user);
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
        
        {currentView === 'details' && selectedListing && user && (
          <div className="max-w-2xl mx-auto px-4 py-8 pb-32 animate-in fade-in duration-500">
            <button onClick={() => setCurrentView('home')} className="mb-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to Marketplace
            </button>
            
            <div className="space-y-8">
              <div className="aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl relative bg-slate-50 group">
                <img 
                  src={selectedListing.imageUrls?.[0] || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200'} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" 
                  alt={selectedListing.title} 
                />
                <div className="absolute top-6 left-6 flex gap-3">
                   <div className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm">{selectedListing.category}</div>
                   {selectedListing.postedBy === 'Owner' && (
                     <div className="bg-[#4CAF50] text-white px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm">Direct Owner</div>
                   )}
                </div>
              </div>

              <div className="px-2 space-y-8">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2 flex-grow">
                    <div className="flex items-center justify-between w-full">
                      <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedListing.title}</h2>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#4CAF50] uppercase tracking-widest">
                      <Icons.Location />
                      {selectedListing.location}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-3xl font-black text-slate-900 leading-none">₹{selectedListing.price.toLocaleString()}</div>
                    <div className="text-[9px] font-black text-slate-300 uppercase mt-2 tracking-[0.2em]">Validated Price</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                   <div className="text-center space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Surface</p>
                      <p className="text-sm font-black text-slate-900">{selectedListing.area} {selectedListing.areaUnit}</p>
                   </div>
                   <div className="text-center border-x border-slate-200 space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Spec</p>
                      <p className="text-sm font-black text-slate-900">{selectedListing.bhk || 'Plot'}</p>
                   </div>
                   <div className="text-center space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Type</p>
                      <p className="text-sm font-black text-slate-900">{selectedListing.category.split(' ')[1]}</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Property Information</h4>
                  <p className="text-slate-500 text-base leading-relaxed font-medium bg-slate-50/50 p-6 rounded-[2rem] border border-slate-50">{selectedListing.description}</p>
                </div>

                <div className="flex gap-4 pt-6">
                   <a href={`tel:${selectedListing.contactNumber}`} className="flex-[2] bg-slate-900 text-white flex items-center justify-center py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-slate-200 active:scale-95 transition-all">Connect Via Call</a>
                   <button onClick={() => setIsChatOpen(true)} className="flex-1 bg-white border-2 border-slate-100 text-slate-900 py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.15em] active:scale-95 transition-all">Chat</button>
                </div>
                
                {user.id === selectedListing.ownerId && (
                  <button 
                    onClick={(e) => handleDeleteListing(e, selectedListing.id)}
                    className="w-full bg-red-50 text-red-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                  >
                    <Icons.Trash /> Delete Property Ad
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {currentView === 'profile' && user && (
          <div className="max-w-lg mx-auto p-10 pb-32 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-slate-50 text-[#4CAF50] rounded-[2.5rem] mx-auto flex items-center justify-center shadow-inner border-2 border-slate-100 mb-8">
              <div className="scale-150"><Icons.User active /></div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">{user.name}</h2>
            <p className="text-slate-400 font-bold text-sm mb-12 tracking-tight">{user.email}</p>
            <div className="space-y-4 max-w-xs mx-auto">
              <button 
                onClick={async () => { await logout(); setUser(null); setCurrentView('home'); }} 
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-transform"
              >
                Logout Account
              </button>
              <button className="w-full bg-white border-2 border-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest cursor-not-allowed">
                Help & Support
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
      <AuthOverlay 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onUserSet={(u) => { setUser(u); }} 
        message={authMessage}
      />
      {selectedListing && user && <ChatOverlay isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} user={user} listing={selectedListing} />}
    </div>
  );
};

export default App;