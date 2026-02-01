
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
  const category = listing?.category || '';
  const isRent = category.toLowerCase().includes('rent');
  const isSoldOrRented = listing?.status !== ListingStatus.ACTIVE;
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(price || 0);
  };

  const mainImage = listing?.imageUrls && listing.imageUrls.length > 0 ? listing.imageUrls[0] : null;

  return (
    <div 
      onClick={() => onClick(listing)}
      className="bg-white rounded-3xl overflow-hidden cursor-pointer shadow-sm border border-slate-100 flex flex-col h-full relative group active:scale-[0.98] transition-all hover:shadow-xl hover:border-emerald-100"
    >
      {/* Image Area */}
      <div className="relative aspect-[1/1] sm:aspect-[4/3] w-full bg-slate-50 overflow-hidden">
        {mainImage ? (
          <img 
            src={mainImage} 
            alt={listing?.title || 'Property'}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isSoldOrRented ? 'grayscale blur-[1px]' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
            <Icons.Camera />
            <span className="text-[8px] font-black uppercase mt-1">No Image</span>
          </div>
        )}

        {/* Action Overlay for Owner */}
        {isOwner && (
          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 z-20">
             <button 
               onClick={(e) => { e.stopPropagation(); onEdit?.(e, listing); }}
               className="w-24 bg-white text-slate-900 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-2xl active:scale-90"
             >
               Edit Ad
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); onDelete?.(e, listing.id); }}
               className="w-24 bg-rose-500 text-white py-2 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-2xl active:scale-90"
             >
               Delete
             </button>
          </div>
        )}

        {/* Favorite Button */}
        {!isOwner && (
          <div className="absolute top-3 right-3 z-10">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle?.(e, listing.id);
              }}
              className="w-9 h-9 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <Icons.Heart filled={isFavorited} />
            </button>
          </div>
        )}

        {/* Status/Category Tag */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-2">
          <div className={`px-2.5 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest shadow-lg ${isRent ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
            {isRent ? 'Rent' : 'Sale'}
          </div>
          {isSoldOrRented && (
            <div className="bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest">
              {listing.status}
            </div>
          )}
        </div>
      </div>

      {/* Details Area */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="mb-2">
          <h3 className="text-base font-black text-slate-900 tracking-tight leading-none mb-1.5">
            ₹{formatPrice(listing?.price)}
          </h3>
          <p className="text-[11px] text-slate-500 font-bold line-clamp-2 leading-tight min-h-[2.5em]">
            {listing?.title || 'Property in Andaman'}
          </p>
        </div>

        {/* Specs */}
        <div className="flex flex-wrap gap-y-1 gap-x-3 mb-4 mt-auto">
          <div className="flex items-center gap-1 text-slate-400">
             <Icons.Location />
             <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-[80px]">
               {listing?.location?.split(',')?.[0] || 'Unknown'}
             </span>
          </div>
          {listing?.area && (
            <div className="flex items-center gap-1 text-slate-300">
               <span className="text-[9px] font-black uppercase tracking-widest">{listing.area} sqft</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
           <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">
             {listing?.category?.split(' ')?.[0]}
           </span>
           <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 italic">
             {timeAgo}
           </span>
        </div>
      </div>
    </div>
  );
});

export default ListingCard;
