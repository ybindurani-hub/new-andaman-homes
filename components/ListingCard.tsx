
import React from 'react';
import { PropertyListing, ListingCategory } from '../types';
import { Icons } from '../constants';

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

  return (
    <div 
      onClick={() => onClick(listing)}
      className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl transition-all duration-300 cursor-pointer group"
    >
      <div className="relative h-56 overflow-hidden">
        <img 
          src={listing.imageUrl} 
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm">
          {listing.category}
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
        <p className="text-slate-500 text-sm mt-2 line-clamp-2 h-10">
          {listing.description}
        </p>
        
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-slate-600 text-sm">
          <span className="flex items-center font-medium">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-2"></span>
            {listing.area}
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
