import React from 'react';
import { PropertyListing } from '../types.ts';
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
  const isRent = listing.category.toLowerCase().includes('rent');
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price).replace('INR', '₹ ');
  };

  const mainImage = listing.imageUrls && listing.imageUrls.length > 0 
    ? listing.imageUrls[0] 
    : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200';

  const postedDate = new Date(listing.postedAt);
  const formattedDate = `${postedDate.getDate()} ${postedDate.toLocaleString('default', { month: 'short' }).toUpperCase()}`;

  return (
    <div 
      onClick={() => onClick(listing)}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer group shadow-sm border border-slate-50"
    >
      <div className="relative aspect-[4/3] m-2 rounded-xl overflow-hidden">
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
          className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow-md transition-all active:scale-90"
        >
          <Icons.Heart filled={isFavorited} />
        </button>

        {/* For Rent / Sale Badge */}
        <div className="absolute bottom-2 left-2 bg-[#FFD740] text-black px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm">
          {isRent ? 'FOR RENT' : 'FOR SALE'}
        </div>
      </div>
      
      <div className="px-3.5 pb-4 pt-1 space-y-1.5">
        <div className="text-xl font-black text-slate-900">
          {formatPrice(listing.price)}
        </div>
        
        <h3 className="text-sm font-semibold text-slate-400 line-clamp-1">
          {listing.title}
        </h3>
        
        <div className="flex flex-wrap gap-2 pt-1">
          {listing.bhk && (
            <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-2 py-1.5 rounded-md border border-slate-100">
              {listing.bhk}
            </span>
          )}
          <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-2 py-1.5 rounded-md border border-slate-100 uppercase">
            {listing.area} {listing.areaUnit}
          </span>
        </div>
        
        <div className="flex justify-between items-center pt-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
            <div className="text-green-500 opacity-60"><Icons.Location /></div>
            <span>{listing.location.split(' ')[0]}</span>
          </div>
          <div className="text-[10px] font-black text-slate-300 uppercase">
            {formattedDate}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;