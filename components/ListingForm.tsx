import React, { useState, useRef } from 'react';
import { ListingCategory, PropertyListing, FurnishingStatus, PostedBy, ParkingOption, ListingStatus } from '../types.ts';
import { ANDAMAN_LOCATIONS, Icons } from '../constants.tsx';

interface ListingFormProps {
  onSubmit: (listing: any) => void;
  onCancel: () => void;
}

const ListingForm: React.FC<ListingFormProps> = ({ onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: ANDAMAN_LOCATIONS[0],
    customLocation: '',
    category: ListingCategory.HOUSE_RENT,
    area: '',
    areaUnit: 'sq.ft' as 'sq.ft' | 'sq.mt',
    contactNumber: '',
    bhk: '2 BHK',
    bathrooms: '2',
    parking: ParkingOption.NONE,
    furnishing: FurnishingStatus.SEMI_FURNISHED,
    floor: 'Ground',
    postedBy: PostedBy.OWNER,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (imagePreviews.length + files.length > 10) {
      alert("Maximum 10 images allowed.");
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imagePreviews.length === 0) {
      alert("Please upload at least one image.");
      return;
    }
    setLoading(true);
    
    const finalLocation = formData.location === 'Other' ? formData.customLocation : formData.location;

    onSubmit({
      ...formData,
      location: finalLocation,
      price: Number(formData.price),
      imageUrls: imagePreviews,
      status: ListingStatus.ACTIVE
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">List Your Property</h2>
          <p className="text-slate-400 text-sm font-medium">Reach islanders looking for their next home or shop.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Multi-Image Upload Area */}
          <div className="space-y-4">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Photographs ({imagePreviews.length}/10)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {imagePreviews.map((src, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={src} className="w-full h-full object-cover" alt="Preview" />
                  <button 
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              ))}
              {imagePreviews.length < 10 && (
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all text-slate-400"
                >
                  <Icons.Plus />
                  <span className="text-[10px] font-bold uppercase mt-1">Add Image</span>
                </button>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              multiple 
              onChange={handleImageChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Listing Type</label>
              <select 
                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-teal-500 font-bold text-slate-700 transition-all"
                value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as ListingCategory }))}
              >
                {Object.values(ListingCategory).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Posted By</label>
              <select 
                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-teal-500 font-bold text-slate-700 transition-all"
                value={formData.postedBy}
                onChange={(e) => setFormData(p => ({ ...p, postedBy: e.target.value as PostedBy }))}
              >
                <option value={PostedBy.OWNER}>Owner</option>
                <option value={PostedBy.BROKER}>Broker</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Location</label>
              <div className="space-y-2">
                <select 
                  className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-teal-500 font-bold text-slate-700 transition-all"
                  value={formData.location}
                  onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
                >
                  {ANDAMAN_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                  <option value="Other">Other (Type manually)</option>
                </select>
                {formData.location === 'Other' && (
                  <input 
                    type="text"
                    placeholder="Enter specific locality..."
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-teal-500 font-bold text-slate-700"
                    value={formData.customLocation}
                    onChange={(e) => setFormData(p => ({ ...p, customLocation: e.target.value }))}
                    required
                  />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Floor</label>
              <select 
                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-teal-500 font-bold text-slate-700 transition-all"
                value={formData.floor}
                onChange={(e) => setFormData(p => ({ ...p, floor: e.target.value }))}
              >
                {['Ground', '1st', '2nd', '3rd', '4th', 'More'].map(f => (
                  <option key={f} value={f}>{f} Floor</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Property Title</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Spacious 2BHK Near Aberdeen Bazaar"
              className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-teal-500 font-bold text-slate-700"
              value={formData.title}
              onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Quick Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Configuration</label>
                <select 
                  className="w-full bg-white border border-slate-100 p-2 rounded-lg font-bold text-xs"
                  value={formData.bhk}
                  onChange={(e) => setFormData(p => ({ ...p, bhk: e.target.value }))}
                >
                  {['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'].map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Bathrooms</label>
                <select 
                  className="w-full bg-white border border-slate-100 p-2 rounded-lg font-bold text-xs"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData(p => ({ ...p, bathrooms: e.target.value }))}
                >
                  {['1', '2', '3', '4+'].map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Parking</label>
                <select 
                  className="w-full bg-white border border-slate-100 p-2 rounded-lg font-bold text-xs"
                  value={formData.parking}
                  onChange={(e) => setFormData(p => ({ ...p, parking: e.target.value as ParkingOption }))}
                >
                  {Object.values(ParkingOption).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Furnishing</label>
                <select 
                  className="w-full bg-white border border-slate-100 p-2 rounded-lg font-bold text-xs"
                  value={formData.furnishing}
                  onChange={(e) => setFormData(p => ({ ...p, furnishing: e.target.value as FurnishingStatus }))}
                >
                  {Object.values(FurnishingStatus).map(opt => <option key={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Description</label>
            <textarea 
              required
              rows={4}
              placeholder="Describe your property (features, amenities, neighborhood)..."
              className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-teal-500 font-medium text-slate-700"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Pricing (₹)</label>
              <input 
                required
                type="number" 
                placeholder="Total Price or Rent"
                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-teal-500 font-bold"
                value={formData.price}
                onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
              />
            </div>
            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Floor Area</label>
              <div className="flex gap-2">
                <input 
                  required
                  type="number" 
                  placeholder="Size"
                  className="flex-grow bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-teal-500 font-bold"
                  value={formData.area}
                  onChange={(e) => setFormData(p => ({ ...p, area: e.target.value }))}
                />
                <select 
                  className="bg-slate-100 p-4 rounded-2xl font-bold text-xs outline-none"
                  value={formData.areaUnit}
                  onChange={(e) => setFormData(p => ({ ...p, areaUnit: e.target.value as 'sq.ft' | 'sq.mt' }))}
                >
                  <option value="sq.ft">SQFT</option>
                  <option value="sq.mt">SQMT</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
            <input 
              required
              type="tel" 
              placeholder="10-digit mobile number"
              className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-teal-500 font-bold"
              value={formData.contactNumber}
              onChange={(e) => setFormData(p => ({ ...p, contactNumber: e.target.value }))}
            />
          </div>

          <div className="flex gap-4 pt-6">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-100 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-teal-600 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListingForm;