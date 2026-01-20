import React from 'react';
import { PropertyListing, ListingStatus } from '../types.ts';
import { Icons } from '../constants.tsx';

interface ListingCardProps {
  listing: PropertyListing;
  onClick: (listing: PropertyListing) => void;
  isFavorited?: boolean;
  onFavoriteToggle?: (e: React.MouseEvent, listingId: string) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ 
  listing, 
  onClick, 
  isFavorited, 
  onFavoriteToggle 
}) => {
  const isSale = listing.category.toLowerCase().includes('sale');
  
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
      className="bg-white rounded-3xl border border-slate-100 p-2 overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
    >
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
        <img 
          src={mainImage} 
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Favorite Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle?.(e, listing.id);
          }}
          className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-white transition-all active:scale-90"
        >
          <Icons.Heart filled={isFavorited} />
        </button>

        {/* For Rent / Sale Badge */}
        <div className="absolute bottom-2 left-2 bg-[#FFD740] text-black px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider">
          {isSale ? 'FOR SALE' : 'FOR RENT'}
        </div>
      </div>
      
      <div className="px-1.5 py-3 space-y-2">
        <div className="text-xl font-bold text-slate-900">
          {formatPrice(listing.price)}
        </div>
        
        <h3 className="text-sm font-medium text-slate-500 line-clamp-1">
          {listing.title}
        </h3>
        
        <div className="flex flex-wrap gap-1.5 mt-1">
          {listing.bhk && (
            <span className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-100">
              {listing.bhk}
            </span>
          )}
          <span className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-100 uppercase">
            {listing.area} {listing.areaUnit}
          </span>
        </div>
        
        <div className="flex justify-between items-center pt-2 mt-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            <Icons.Location />
            <span>{listing.location.split(' ')[0]}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-400">
            {formattedDate}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;