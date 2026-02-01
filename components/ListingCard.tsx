
import React, { useState, memo } from 'react';
import { PropertyListing, ListingStatus } from '../types.ts';
import { Icons } from '../constants.tsx';

interface ListingCardProps {
  listing: PropertyListing;
  onClick: (listing: PropertyListing) => void;
  isFavorited?: boolean;
  onFavoriteToggle?: (e: React.MouseEvent, listingId: string) => void;
  isOwner?: boolean;
  onDelete?: (e: React.MouseEvent, listingId: string) => void;
  timeAgo: string; // Passed from parent to avoid expensive calc inside the card
}

const ListingCard: React.FC<ListingCardProps> = memo(({ 
  listing, 
  onClick, 
  isFavorited, 
  onFavoriteToggle,
  isOwner,
  onDelete,
  timeAgo
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const isRent = listing.category.toLowerCase().includes('rent');
  const isSoldOrRented = listing.status !== ListingStatus.ACTIVE;
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price).replace('INR', '₹');
  };

  const mainImage = listing.imageUrls && listing.imageUrls.length > 0 
    ? listing.imageUrls[0] 
    : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800';

  return (
    <div 
      onClick={() => onClick(listing)}
      className="bg-white rounded-[2rem] overflow-hidden cursor-pointer group shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100/60 flex flex-col h-full relative"
    >
      <div className="absolute -top-3 -left-3 z-20 bg-slate-900 text-white text-[8px] font-black px-4 py-2 rounded-xl uppercase tracking-[0.2em] border-4 border-white shadow-xl">
        {timeAgo}
      </div>

      <div className="relative aspect-[16/11] w-full overflow-hidden bg-slate-100">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
          </div>
        )}
        <img 
          src={mainImage} 
          alt={listing.title}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ${isSoldOrRented ? 'grayscale opacity-60' : ''} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
        />
        
        {isSoldOrRented && (
          <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center">
             <div className="bg-white/95 backdrop-blur-md text-slate-900 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl border border-white">
               {listing.status}
             </div>
          </div>
        )}

        <div className="absolute top-4 right-4 z-20">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle?.(e, listing.id);
            }}
            className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl transition-all active:scale-90 hover:bg-white"
          >
            <Icons.Heart filled={isFavorited} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 flex gap-2">
          <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-xl">
            {listing.postedBy}
          </div>
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest">
            {isRent ? 'RENT' : 'SALE'}
          </div>
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow justify-between bg-white">
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 tracking-tighter">
              {formatPrice(listing.price)}
            </span>
            {isRent && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">/ Month</span>}
          </div>
          
          <h3 className="text-sm font-bold text-slate-700 line-clamp-2 leading-relaxed min-h-[40px]">
            {listing.title}
          </h3>
          
          <div className="flex flex-wrap gap-2 pt-1">
            <div className="bg-slate-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-100">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {listing.area} {listing.areaUnit}
              </span>
            </div>
            {listing.bhk && (
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-100">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{listing.bhk}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-5 mt-5 border-t border-slate-50">
          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-[80%]">
            <div className="text-emerald-500 flex-shrink-0"><Icons.Location /></div>
            <span className="truncate">{listing.location}</span>
          </div>
          {isOwner && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(e, listing.id);
              }}
              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors active:scale-90"
            >
              <Icons.Trash />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  // Optimization: Only re-render if critical listing data or favorite state changes
  return prev.listing.id === next.listing.id && 
         prev.isFavorited === next.isFavorited && 
         prev.listing.status === next.listing.status &&
         prev.timeAgo === next.timeAgo;
});

export default ListingCard;
