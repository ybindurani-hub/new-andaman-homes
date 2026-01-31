import React from 'react';
import { PropertyListing, ListingStatus } from '../types.ts';
import { Icons } from '../constants.tsx';

interface ListingCardProps {
  listing: PropertyListing;
  onClick: (listing: PropertyListing) => void;
  isFavorited?: boolean;
  onFavoriteToggle?: (e: React.MouseEvent, listingId: string) => void;
  isOwner?: boolean;
  onDelete?: (e: React.MouseEvent, listingId: string) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ 
  listing, 
  onClick, 
  isFavorited, 
  onFavoriteToggle,
  isOwner,
  onDelete
}) => {
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
    : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200';

  const postedDate = new Date(listing.postedAt);
  const formattedDate = `${postedDate.getDate()} ${postedDate.toLocaleString('default', { month: 'short' }).toUpperCase()}`;

  return (
    <div 
      onClick={() => onClick(listing)}
      className="bg-white rounded-[1rem] overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100/60 flex flex-col h-full relative"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img 
          src={mainImage} 
          alt={listing.title}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${isSoldOrRented ? 'grayscale opacity-70' : ''}`}
        />
        
        {isSoldOrRented && (
          <div className="absolute inset-0 bg-slate-900/20 flex items-center justify-center">
             <div className="bg-white text-slate-900 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl border border-white">
               {listing.status}
             </div>
          </div>
        )}

        <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle?.(e, listing.id);
            }}
            className="bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-lg transition-all active:scale-90"
          >
            <Icons.Heart filled={isFavorited} />
          </button>

          {isOwner && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(e, listing.id);
              }}
              className="bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-lg transition-all active:scale-90 text-red-500 hover:bg-red-50"
              title="Delete Ad"
            >
              <Icons.Trash />
            </button>
          )}
        </div>

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <div className="bg-[#4CAF50] text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shadow-sm w-fit">
            {listing.postedBy}
          </div>
          <div className="bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider w-fit">
            {isRent ? 'RENT' : 'SALE'}
          </div>
        </div>
      </div>
      
      <div className="p-3 flex flex-col flex-grow justify-between">
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black text-slate-900 leading-tight">
              {formatPrice(listing.price)}
            </span>
            {isRent && <span className="text-[9px] font-bold text-slate-400">/mo</span>}
          </div>
          
          <div className="text-[10px] font-bold text-slate-600 line-clamp-1 leading-snug">
            {listing.title}
          </div>
          
          <div className="flex flex-wrap gap-1 pt-1">
            {listing.bhk && (
              <div className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{listing.bhk}</span>
              </div>
            )}
            <div className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{listing.area} {listing.areaUnit}</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-50">
          <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-tight">
            <div className="text-[#4CAF50] scale-75 opacity-70"><Icons.Location /></div>
            <span className="truncate max-w-[70px]">{listing.location.split(' ')[0]}</span>
          </div>
          <div className="text-[8px] font-black text-slate-300 uppercase">
            {formattedDate}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;