
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
  onEdit?: (e: React.MouseEvent, listing: PropertyListing) => void;
  timeAgo: string;
}

const ListingCard: React.FC<ListingCardProps> = memo(({ 
  listing, 
  onClick, 
  isFavorited, 
  onFavoriteToggle,
  isOwner,
  onDelete,
  onEdit,
  timeAgo
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const isRent = listing.category.toLowerCase().includes('rent');
  const isSoldOrRented = listing.status !== ListingStatus.ACTIVE;
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(price);
  };

  const mainImage = listing.imageUrls && listing.imageUrls.length > 0 ? listing.imageUrls[0] : null;

  return (
    <div 
      onClick={() => onClick(listing)}
      className="bg-white rounded-xl overflow-hidden cursor-pointer shadow-sm border border-slate-100 flex flex-col h-full relative group active:scale-[0.98] transition-all"
    >
      {/* Image Area */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {mainImage ? (
          <img 
            src={mainImage} 
            alt={listing.title}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isSoldOrRented ? 'grayscale' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <svg className="w-10 h-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[8px] font-black uppercase tracking-widest">No Image</span>
          </div>
        )}

        {/* Action Overlay for Owner */}
        {isOwner && (
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 onEdit?.(e, listing);
               }}
               className="bg-white text-slate-900 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-xl active:scale-90"
             >
               Edit Ad
             </button>
          </div>
        )}

        {/* Favorite Button */}
        {!isOwner && (
          <div className="absolute top-2 right-2 z-10">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle?.(e, listing.id);
              }}
              className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md active:scale-90"
            >
              <Icons.Heart filled={isFavorited} />
            </button>
          </div>
        )}

        {/* Status Tag */}
        <div className="absolute bottom-2 left-2">
          <div className="bg-amber-400 text-slate-900 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm">
            {isRent ? 'For Rent' : 'For Sale'}
          </div>
        </div>
      </div>

      {/* Details Area */}
      <div className="p-3 flex flex-col flex-grow">
        <div className="mb-1">
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            ₹ {formatPrice(listing.price)}
          </h3>
          <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
            {listing.title}
          </p>
        </div>

        {/* Specs Pills */}
        <div className="flex flex-wrap gap-1.5 my-2">
          {listing.bhk && (
            <div className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{listing.bhk}</span>
            </div>
          )}
          <div className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{listing.area} {listing.areaUnit}</span>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="mt-auto pt-2 border-t border-slate-50 flex justify-between items-center text-slate-400">
          <div className="flex items-center gap-1 min-w-0">
            <div className="flex-shrink-0 text-emerald-500"><Icons.Location /></div>
            <span className="text-[8px] font-black uppercase tracking-widest truncate">{listing.location.split(',')[0]}</span>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest flex-shrink-0 ml-2">
            {timeAgo.replace(' ago', '').toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.listing.id === next.listing.id && 
         prev.isFavorited === next.isFavorited && 
         prev.listing.status === next.listing.status &&
         prev.timeAgo === next.timeAgo;
});

export default ListingCard;
