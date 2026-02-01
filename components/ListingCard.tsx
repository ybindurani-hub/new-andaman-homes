
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
    if (price === undefined || price === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(price);
  };

  const mainImage = listing?.imageUrls && listing.imageUrls.length > 0 ? listing.imageUrls[0] : null;

  return (
    <div 
      onClick={() => onClick(listing)}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-slate-100 flex flex-col h-full relative group active:scale-[0.98] transition-all"
    >
      {/* Image Area */}
      <div className="relative aspect-[4/3] w-full bg-slate-50 overflow-hidden">
        {mainImage ? (
          <img 
            src={mainImage} 
            alt={listing?.title || 'Property'}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${isSoldOrRented ? 'grayscale blur-[1px]' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
            <Icons.Camera />
            <span className="text-[8px] font-black uppercase mt-1">No Photo</span>
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
               className="bg-white text-slate-900 px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-2xl active:scale-90"
             >
               Edit
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
              className="w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg active:scale-90"
            >
              <Icons.Heart filled={isFavorited} />
            </button>
          </div>
        )}

        {/* Category Tag */}
        <div className="absolute bottom-2 left-2">
          <div className="bg-emerald-500 text-white px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest shadow-lg">
            {isRent ? 'Rent' : 'Sale'}
          </div>
        </div>
      </div>

      {/* Details Area */}
      <div className="p-3 flex flex-col flex-grow">
        <div className="mb-2">
          <h3 className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">
            ₹ {formatPrice(listing?.price)}
          </h3>
          <p className="text-[10px] text-slate-500 font-bold truncate leading-tight">
            {listing?.title || 'Unnamed Property'}
          </p>
        </div>

        {/* Minimal Specs */}
        <div className="flex gap-2 mb-3">
          <div className="flex items-center gap-1">
             <div className="text-emerald-500"><Icons.Location /></div>
             <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[60px]">{listing?.location?.split(',')?.[0]}</span>
          </div>
          {listing?.floor && (
            <div className="flex items-center gap-1 border-l border-slate-100 pl-2">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{listing.floor}</span>
            </div>
          )}
        </div>

        {/* Footer Meta */}
        <div className="mt-auto pt-2 border-t border-slate-50 flex justify-between items-center text-[7px] font-black uppercase tracking-[0.2em] text-slate-300">
           <span>{listing?.category?.split(' ')?.[0]}</span>
           <span>{timeAgo.split(' ')[0]}</span>
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
