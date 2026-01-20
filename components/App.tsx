import React, { useState, useEffect } from 'react';
import { auth, getListings, addListing, logout } from '../services/firebase.ts';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { User, PropertyListing, ViewState, ListingCategory } from '../types.ts';
import Navbar from './Navbar.tsx';
import ListingCard from './ListingCard.tsx';
import ListingForm from './ListingForm.tsx';
import AuthOverlay from './AuthOverlay.tsx';
import ChatOverlay from './ChatOverlay.tsx';
import { ANDAMAN_LOCATIONS, Icons } from '../constants.tsx';

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
  const [successMsg, setSuccessMsg] = useState('');

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
      setSuccessMsg("Property listed successfully!");
      
      // Redirect to newly created listing details after 2 seconds
      setTimeout(() => {
        setSuccessMsg('');
        setSelectedListing(newListing);
        setCurrentView('details');
      }, 2000);
      
    } catch (err) {
      console.error("Error posting listing:", err);
      alert("Error posting listing. Check your permissions.");
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
      {successMsg && (
        <div className="max-w-7xl mx-auto px-4">
           <div className="bg-teal-500 text-white p-4 rounded-2xl font-bold text-center animate-bounce">
             {successMsg}
           </div>
        </div>
      )}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-grow flex items-center bg-slate-50 rounded-xl px-4 py-3 group focus-within:bg-white transition-all border border-transparent focus-within:border-teal-100">
              <div className="text-teal-600"><Icons.Search /></div>
              <input 
                type="text" 
                placeholder="Search houses, shops, land in Andaman..." 
                className="w-full ml-3 bg-transparent outline-none text-slate-800 text-sm font-semibold placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select 
                className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest outline-none"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="All">All Categories</option>
                {Object.values(ListingCategory).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <select 
                className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest outline-none"
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
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredListings.length} results</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map(listing => (
            <ListingCard 
              key={listing.id} 
              listing={listing} 
              onClick={(l) => {
                setSelectedListing(l);
                setCurrentView('details');
              }} 
            />
          ))}
        </div>
      </section>
    </div>
  );

  const renderDetails = () => {
    if (!selectedListing) return null;
    const images = selectedListing.imageUrls || [(selectedListing as any).imageUrl];
    
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <button 
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-2 text-slate-400 hover:text-teal-600 mb-6 font-black text-[9px] uppercase tracking-widest"
        >
          ← Back to Marketplace
        </button>
        
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-xl border border-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-4 space-y-4">
               <div className="h-[300px] md:h-[400px] rounded-2xl overflow-hidden">
                  <img src={images[0]} className="w-full h-full object-cover" />
               </div>
               {images.length > 1 && (
                 <div className="grid grid-cols-5 gap-2">
                    {images.slice(1, 6).map((img, i) => (
                      <img key={i} src={img} className="h-16 w-full object-cover rounded-lg border border-slate-100" />
                    ))}
                    {images.length > 6 && (
                      <div className="h-16 w-full bg-slate-100 flex items-center justify-center rounded-lg text-[10px] font-bold">
                        +{images.length - 6} more
                      </div>
                    )}
                 </div>
               )}
            </div>
            
            <div className="p-8 lg:p-12 flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">{selectedListing.title}</h2>
                <div className="flex items-center text-teal-600 mb-6 font-bold text-xs uppercase tracking-widest">
                  <Icons.Location />
                  <span className="ml-2">{selectedListing.location}</span>
                </div>
                
                {/* Simplified Technical Specs */}
                <div className="bg-slate-50 p-6 rounded-2xl mb-8">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Highlights</h3>
                   <ul className="grid grid-cols-2 gap-y-3 text-xs font-bold text-slate-700">
                      <li className="flex items-center gap-2">• {selectedListing.bhk || 'N/A'}</li>
                      <li className="flex items-center gap-2">• {selectedListing.area} {selectedListing.areaUnit || 'sq.ft'}</li>
                      <li className="flex items-center gap-2">• {selectedListing.bathrooms || '1'} Bathrooms</li>
                      <li className="flex items-center gap-2">• {selectedListing.furnishing || 'Standard'}</li>
                      <li className="flex items-center gap-2">• Parking: {selectedListing.parking || 'No'}</li>
                      <li className="flex items-center gap-2">• Verified Property</li>
                   </ul>
                </div>

                <div className="mb-8">
                  <p className="text-3xl font-black text-slate-900">
                    ₹ {selectedListing.price.toLocaleString()}
                    {!selectedListing.category.includes('Sale') && <span className="text-xs text-slate-400 font-normal"> /mo</span>}
                  </p>
                </div>

                <div className="mb-8">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {selectedListing.description}
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center font-black text-white">
                     {selectedListing.ownerName.charAt(0)}
                   </div>
                   <div>
                     <p className="text-sm font-bold text-slate-900 leading-none mb-1">{selectedListing.ownerName}</p>
                     <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Owner</p>
                   </div>
                 </div>
                 <div className="flex gap-3 w-full sm:w-auto">
                   <button 
                     onClick={() => user ? setIsChatOpen(true) : setIsAuthOpen(true)}
                     className="flex-1 sm:flex-none bg-white border border-slate-200 text-slate-800 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
                   >
                     <Icons.Message /> Chat
                   </button>
                   <a 
                     href={`tel:${selectedListing.contactNumber}`}
                     className="flex-1 sm:flex-none bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-600 transition-all text-[10px] uppercase tracking-widest"
                   >
                     <Icons.Phone /> Call
                   </a>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase tracking-widest animate-pulse">Andaman Homes...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar 
        user={user} 
        onViewChange={setCurrentView} 
        onAuthOpen={() => setIsAuthOpen(true)} 
      />
      
      <main>
        {currentView === 'home' && renderHome()}
        {currentView === 'post' && (
          <ListingForm 
            onSubmit={handlePostListing} 
            onCancel={() => setCurrentView('home')} 
          />
        )}
        {currentView === 'details' && renderDetails()}
        {currentView === 'profile' && (
          <div className="py-24 text-center px-6">
            <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto text-teal-600 mb-6">
              <Icons.User />
            </div>
            <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">{user?.name}</h2>
            <p className="text-sm text-slate-400 font-medium mb-8">Manage your properties and chats here.</p>
            <div className="flex justify-center gap-4">
               <button onClick={() => setCurrentView('home')} className="bg-slate-100 px-6 py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest">Back Home</button>
               <button onClick={async () => { await logout(); setUser(null); setCurrentView('home'); }} className="bg-red-50 text-red-500 px-6 py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest">Sign Out</button>
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

      <footer className="bg-slate-900 text-white py-20 mt-20 rounded-t-[3rem]">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
             <div className="flex items-center">
                <div className="bg-teal-500 text-white p-2 rounded-lg mr-3">
                  <Icons.Home />
                </div>
                <span className="text-xl font-display font-bold">Andaman Homes</span>
             </div>
             <p className="text-slate-400 max-w-sm text-sm">
               The archipelago's leading marketplace for house rentals, shop rentals, and land sales. Dedicated to the Andaman community.
             </p>
          </div>
          <div className="text-right">
            <h4 className="font-bold mb-6 uppercase text-[9px] tracking-widest text-teal-500">Legal</h4>
            <ul className="space-y-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Safety Guidelines</li>
              <li>Contact Us</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-8 mt-12 pt-8 border-t border-slate-800 text-center">
           <div className="text-slate-500 text-[8px] font-bold uppercase tracking-[0.2em]">
             &copy; {new Date().getFullYear()} Andaman Homes Marketplace.
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;