import React from 'react';
import { PropertyListing, ListingStatus } from '../types.ts';
import { Icons } from '../constants.tsx';

interface ListingCardProps {
  listing: PropertyListing;
  onClick: (listing: PropertyListing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onClick }) => {
  const isSale = listing.category.includes('Sale');
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const mainImage = listing.imageUrls && listing.imageUrls.length > 0 
    ? listing.imageUrls[0] 
    : (listing as any).imageUrl || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200';

  const statusColors = {
    [ListingStatus.ACTIVE]: 'bg-white/90 text-slate-700',
    [ListingStatus.SOLD]: 'bg-red-500 text-white',
    [ListingStatus.RENTED]: 'bg-blue-500 text-white',
    [ListingStatus.BOOKED]: 'bg-amber-500 text-white',
  };

  return (
    <div 
      onClick={() => onClick(listing)}
      className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl transition-all duration-300 cursor-pointer group"
    >
      <div className="relative h-56 overflow-hidden">
        <img 
          src={mainImage} 
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-2 items-start">
          <div className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm">
            {listing.category}
          </div>
          {listing.status !== ListingStatus.ACTIVE && (
            <div className={`${statusColors[listing.status]} backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg`}>
              {listing.status}
            </div>
          )}
        </div>
        <div className="absolute bottom-3 left-3 bg-teal-600 text-white px-3 py-1 rounded-lg text-lg font-bold shadow-lg">
          {formatPrice(listing.price)}{!isSale && <span className="text-xs font-normal"> /mo</span>}
        </div>
      </div>
      
      <div className="p-5">
        <div className="flex items-center text-slate-500 text-xs mb-2">
          <Icons.Location />
          <span className="ml-1 truncate">{listing.location}</span>
        </div>
        <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-teal-600 transition-colors">
          {listing.title}
        </h3>
        
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-slate-600 text-sm">
          <span className="flex items-center font-medium">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-2"></span>
            {listing.area} {listing.areaUnit || 'sq.ft'}
          </span>
          <span className="text-xs text-slate-400">
            {new Date(listing.postedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;