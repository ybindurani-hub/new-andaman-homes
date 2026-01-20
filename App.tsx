
import React, { useState, useEffect } from 'react';
import { auth, getListings, addListing, logout } from './services/firebase.ts';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { User, PropertyListing, ViewState, ListingCategory, FurnishingStatus } from './types.ts';
import Navbar from './components/Navbar.tsx';
import ListingCard from './components/ListingCard.tsx';
import ListingForm from './components/ListingForm.tsx';
import AuthOverlay from './components/AuthOverlay.tsx';
import ChatOverlay from './components/ChatOverlay.tsx';
import { ANDAMAN_LOCATIONS, Icons } from './constants.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [selectedListing, setSelectedListing] = useState<PropertyListing | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined
        });
      } else {
        setUser(null);
      }
      // Auth check complete
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const data = await getListings();
        setListings(data);
      } catch (err) {
        console.error("Error fetching listings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const handlePostListing = async (listingData: any) => {
    if (!user) return;
    try {
      const newListing = await addListing(listingData, user);
      setListings(prev => [newListing, ...prev]);
      setCurrentView('home');
    } catch (err) {
      console.error("Error posting listing:", err);
      alert("Error posting listing. Please check your Firebase permissions.");
    }
  };

  const filteredListings = listings.filter(l => {
    const title = l.title || '';
    const loc = l.location || '';
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          loc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || l.category === filterCategory;
    const matchesLocation = filterLocation === 'All' || l.location === filterLocation;
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const renderHome = () => (
    <div className="space-y-6 pb-24 pt-6">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-grow flex items-center bg-slate-50 rounded-xl px-4 py-3 group focus-within:bg-white transition-all border border-transparent focus-within:border-teal-100">
              <div className="text-teal-600"><Icons.Search /></div>
              <input 
                type="text" 
                placeholder="Search for houses, shops, or land in Andaman..." 
                className="w-full ml-3 bg-transparent outline-none text-slate-800 text-sm font-semibold placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select 
                className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest outline-none cursor-pointer hover:bg-white hover:border-teal-400 transition-all"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="All">All Categories</option>
                {Object.values(ListingCategory).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <select 
                className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest outline-none cursor-pointer hover:bg-white hover:border-teal-400 transition-all"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
              >
                <option value="All">All Locations</option>
                {ANDAMAN_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-xl font-display font-bold text-slate-900">Recommended Properties</h2>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{filteredListings.length} Listings found</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.length > 0 ? (
            filteredListings.map(listing => (
              <ListingCard 
                key={listing.id} 
                listing={listing} 
                onClick={(l) => {
                  setSelectedListing(l);
                  setCurrentView('details');
                }} 
              />
            ))
          ) : (
            <div className="col-span-full py-24 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto text-slate-300 mb-4 shadow-sm">
                <Icons.Search />
              </div>
              <h3 className="text-lg font-display font-bold text-slate-800">No matching properties</h3>
              <p className="text-slate-400 text-xs font-medium mt-2 max-w-xs mx-auto">Broaden your search criteria to discover more island properties.</p>
              <button 
                onClick={() => {setFilterCategory('All'); setFilterLocation('All'); setSearchQuery('');}}
                className="mt-6 bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-teal-700 shadow-xl shadow-teal-600/20 transition-all"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderDetails = () => {
    if (!selectedListing) return null;
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <button 
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-2 text-slate-400 hover:text-teal-600 mb-6 font-black text-[9px] uppercase tracking-[0.2em] transition-all group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Search
        </button>
        
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="h-[350px] md:h-[500px] lg:h-auto overflow-hidden relative">
               <img src={selectedListing.imageUrl} alt={selectedListing.title} className="w-full h-full object-cover" />
               <div className="absolute top-6 left-6">
                  <span className="bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-teal-700 shadow-2xl border border-teal-50">
                    {selectedListing.category}
                  </span>
               </div>
            </div>
            <div className="p-8 lg:p-14 flex flex-col justify-between bg-slate-50/20">
              <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 mb-2 leading-[1.1]">{selectedListing.title}</h2>
                <div className="flex items-center text-slate-400 mb-8">
                  <Icons.Location />
                  <span className="ml-2 font-bold text-[10px] uppercase tracking-widest">{selectedListing.location}</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                   {[
                     { icon: <Icons.Bed />, label: 'BHK', val: selectedListing.bhk || 'N/A' },
                     { icon: <Icons.Bath />, label: 'Baths', val: selectedListing.bathrooms || '1' },
                     { icon: <Icons.Car />, label: 'Parking', val: selectedListing.parking || 'No' },
                     { icon: <Icons.Home />, label: 'Status', val: selectedListing.furnishing || 'Standard' }
                   ].map((spec, i) => (
                     <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="text-teal-500 mb-2">{spec.icon}</div>
                        <p className="text-[8px] text-slate-400 font-black uppercase mb-1 tracking-tighter">{spec.label}</p>
                        <p className="text-[10px] font-bold text-slate-800 line-clamp-1">{spec.val}</p>
                     </div>
                   ))}
                </div>

                <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50">
                  <div>
                    <p className="text-[8px] text-slate-400 font-black uppercase mb-1 tracking-widest">Property Price</p>
                    <p className="text-2xl md:text-3xl font-black text-slate-900">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(selectedListing.price)}
                      {!selectedListing.category.includes('Sale') && <span className="text-xs font-bold text-slate-400 tracking-normal"> /mo</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-400 font-black uppercase mb-1 tracking-widest">Built-up</p>
                    <p className="text-lg font-bold text-slate-800">{selectedListing.area}</p>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2 inline-block">Description</h3>
                  <p className="text-slate-600 leading-[1.8] text-xs font-medium">
                    {selectedListing.description}
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-700 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-xl shadow-teal-500/20">
                     {selectedListing.ownerName ? selectedListing.ownerName.charAt(0) : 'U'}
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-900 leading-none mb-1">{selectedListing.ownerName || 'User'}</p>
                     <div className="flex items-center gap-1">
                       <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                       <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">Identity Verified</p>
                     </div>
                   </div>
                 </div>
                 <div className="flex gap-3 w-full sm:w-auto">
                   <button 
                     onClick={() => user ? setIsChatOpen(true) : setIsAuthOpen(true)}
                     className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 text-slate-800 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all text-[10px] uppercase tracking-widest active:scale-95 shadow-sm"
                   >
                     <Icons.Message />
                     Message
                   </button>
                   <a 
                     href={`tel:${selectedListing.contactNumber}`}
                     className="flex-1 sm:flex-none bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-teal-600 shadow-2xl shadow-slate-900/20 transition-all text-[10px] uppercase tracking-widest active:scale-95"
                   >
                     <Icons.Phone />
                     Call Owner
                   </a>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-black text-xl uppercase tracking-widest animate-pulse">Andaman Homes...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar 
        user={user} 
        onViewChange={setCurrentView} 
        onAuthOpen={() => setIsAuthOpen(true)} 
      />
      
      <main className="max-w-7xl mx-auto">
        {currentView === 'home' && renderHome()}
        {currentView === 'post' && (
          <ListingForm 
            onSubmit={handlePostListing} 
            onCancel={() => setCurrentView('home')} 
          />
        )}
        {currentView === 'details' && renderDetails()}
        {currentView === 'profile' && (
          <div className="py-24 text-center space-y-6 px-6">
            <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto text-teal-600 shadow-xl shadow-teal-500/10 border border-teal-100">
              <div className="scale-125"><Icons.User /></div>
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">My Account</h2>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">Manage your listings, messages, and island property preferences.</p>
            </div>
            <div className="flex justify-center gap-3">
               <button onClick={() => setCurrentView('home')} className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all">Back Home</button>
               <button 
                  onClick={async () => { await logout(); setUser(null); setCurrentView('home'); }}
                  className="bg-red-50 text-red-500 px-6 py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:bg-red-100 transition-colors shadow-sm"
               >
                 Sign Out
               </button>
            </div>
          </div>
        )}
      </main>

      <AuthOverlay 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onUserSet={(user) => setUser(user)} 
      />

      {selectedListing && user && (
        <ChatOverlay 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          user={user} 
          listing={selectedListing} 
        />
      )}

      <footer className="bg-slate-900 text-white py-12 md:py-20 mt-20 rounded-t-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-teal-200 to-teal-500 opacity-20"></div>
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
          <div className="col-span-1 md:col-span-2 space-y-6">
             <div className="flex items-center">
                <div className="bg-teal-500 text-white p-2 rounded-lg mr-3 shadow-xl shadow-teal-500/20">
                  <Icons.Home />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-display font-bold">Andaman Homes</span>
                  <span className="text-[8px] text-teal-400 font-black uppercase tracking-[0.3em]">Pure Island Real Estate</span>
                </div>
             </div>
             <p className="text-slate-400 max-w-sm font-medium text-xs leading-relaxed">
               Connecting the island community with verified properties since 2024. 
               Dedicated to a safe and transparent marketplace for the Andaman Archipelago.
             </p>
             <div className="flex gap-3">
               {['FB', 'IG', 'LI', 'YT'].map(net => (
                 <button key={net} className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[8px] font-black hover:bg-teal-600 transition-all text-slate-400 hover:text-white border border-slate-700/50">{net}</button>
               ))}
             </div>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase text-[9px] tracking-[0.3em] text-teal-500">Destinations</h4>
            <ul className="space-y-3 text-slate-400 font-bold text-[10px] uppercase tracking-[0.15em]">
              <li className="hover:text-white cursor-pointer transition-colors">Port Blair</li>
              <li className="hover:text-white cursor-pointer transition-colors">Swaraj Dweep</li>
              <li className="hover:text-white cursor-pointer transition-colors">Shaheed Dweep</li>
              <li className="hover:text-white cursor-pointer transition-colors">Diglipur</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 uppercase text-[9px] tracking-[0.3em] text-teal-500">Resources</h4>
            <ul className="space-y-3 text-slate-400 font-bold text-[10px] uppercase tracking-[0.15em]">
              <li className="hover:text-white cursor-pointer transition-colors">Property Guide</li>
              <li className="hover:text-white cursor-pointer transition-colors">Seller Tips</li>
              <li className="hover:text-white cursor-pointer transition-colors">Safety Standard</li>
              <li className="hover:text-white cursor-pointer transition-colors">Privacy Policy</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-8 mt-12 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="text-slate-500 text-[8px] font-bold uppercase tracking-[0.2em] text-center md:text-left leading-relaxed">
             &copy; {new Date().getFullYear()} Andaman Homes Global Marketplace.
           </div>
           <div className="flex items-center gap-2">
             <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">AI Intelligence by</span>
             <div className="h-4 w-px bg-slate-800"></div>
             <span className="text-xs font-display font-bold text-slate-400">Gemini</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
