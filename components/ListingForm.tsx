
import React, { useState, useRef } from 'react';
import { ListingCategory, PropertyListing, FurnishingStatus } from '../types.ts';
import { ANDAMAN_LOCATIONS, Icons } from '../constants.tsx';
import { enhanceDescription } from '../services/geminiService.ts';

interface ListingFormProps {
  onSubmit: (listing: any) => void;
  onCancel: () => void;
}

const ListingForm: React.FC<ListingFormProps> = ({ onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSpecs, setShowSpecs] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: ANDAMAN_LOCATIONS[0],
    category: ListingCategory.HOUSE_RENT,
    area: '',
    contactNumber: '',
    bhk: '2 BHK',
    bathrooms: '2',
    parking: 'Yes' as 'Yes' | 'No',
    furnishing: FurnishingStatus.SEMI_FURNISHED,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEnhance = async () => {
    if (!formData.description) return;
    setLoading(true);
    const enhanced = await enhanceDescription(formData.description);
    setFormData(prev => ({ ...prev, description: enhanced }));
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultAndamanImage = "https://images.unsplash.com/photo-1589136777351-fdc9c9c85f68?auto=format&fit=crop&q=80&w=1200";
    onSubmit({
      ...formData,
      price: Number(formData.price),
      imageUrl: imagePreview || defaultAndamanImage
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">List Your Property</h2>
          <p className="text-slate-400 text-sm font-medium">Reach thousands of islanders looking for their next space.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Image Upload Area */}
          <div className="space-y-4">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Featured Photograph</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative h-72 w-full border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/20 transition-all overflow-hidden bg-slate-50/50 group"
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Preview" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest text-slate-900">Change Photo</span>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-teal-500 mb-4 mx-auto border border-slate-100 group-hover:scale-110 transition-transform">
                    <Icons.Camera />
                  </div>
                  <p className="text-slate-600 font-bold text-sm">Upload a high-quality property photo</p>
                  <p className="text-slate-400 text-[10px] mt-1 font-medium uppercase tracking-tighter">Recommended: 1200x800px or higher</p>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Listing Type</label>
              <select 
                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-700 transition-all"
                value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as ListingCategory }))}
              >
                {Object.values(ListingCategory).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Precise Location</label>
              <select 
                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-700 transition-all"
                value={formData.location}
                onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
              >
                {ANDAMAN_LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Catchy Title</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Modern Ocean-facing Studio in Port Blair"
              className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-700 transition-all placeholder:text-slate-300"
              value={formData.title}
              onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
            />
          </div>

          {/* Collapsible Property Specifications Section */}
          <div className="bg-slate-50/30 rounded-[2rem] border border-slate-100 overflow-hidden">
            <button 
              type="button"
              onClick={() => setShowSpecs(!showSpecs)}
              className="w-full flex items-center justify-between p-6 group"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-all">
                  <Icons.Plus />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Technical Specifications</h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">BHK, Bathrooms, Parking & Furnishing</p>
                </div>
              </div>
              <div className={`transition-transform duration-300 ${showSpecs ? 'rotate-180' : ''}`}>
                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </button>
            
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showSpecs ? 'max-h-[500px] border-t border-slate-100 p-8 pt-2' : 'max-h-0'}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">BHK Configuration</label>
                  <select 
                    className="w-full bg-white border border-slate-100 p-3 rounded-xl outline-none text-xs font-bold text-slate-700 shadow-sm"
                    value={formData.bhk}
                    onChange={(e) => setFormData(p => ({ ...p, bhk: e.target.value }))}
                  >
                    {['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total Bathrooms</label>
                  <select 
                    className="w-full bg-white border border-slate-100 p-3 rounded-xl outline-none text-xs font-bold text-slate-700 shadow-sm"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData(p => ({ ...p, bathrooms: e.target.value }))}
                  >
                    {['1', '2', '3', '4+'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Car Parking</label>
                  <select 
                    className="w-full bg-white border border-slate-100 p-3 rounded-xl outline-none text-xs font-bold text-slate-700 shadow-sm"
                    value={formData.parking}
                    onChange={(e) => setFormData(p => ({ ...p, parking: e.target.value as 'Yes' | 'No' }))}
                  >
                    <option value="Yes">Available</option>
                    <option value="No">Not Available</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter">Furnishing Status</label>
                  <select 
                    className="w-full bg-white border border-slate-100 p-3 rounded-xl outline-none text-xs font-bold text-slate-700 shadow-sm"
                    value={formData.furnishing}
                    onChange={(e) => setFormData(p => ({ ...p, furnishing: e.target.value as FurnishingStatus }))}
                  >
                    {Object.values(FurnishingStatus).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Comprehensive Description</label>
              <button 
                type="button"
                onClick={handleEnhance}
                disabled={loading || !formData.description}
                className="text-[10px] flex items-center gap-1.5 font-black text-teal-600 hover:text-white transition-all bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100 hover:bg-teal-600 hover:shadow-lg disabled:opacity-50 uppercase tracking-widest"
              >
                {loading ? <span className="animate-spin text-sm">◌</span> : <Icons.Sparkles />}
                {loading ? 'Processing...' : 'Enhance with AI'}
              </button>
            </div>
            <textarea 
              required
              rows={4}
              placeholder="Tell us more about the space, neighborhood, and unique features..."
              className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-slate-700 transition-all placeholder:text-slate-300"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Pricing (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                <input 
                  required
                  type="number" 
                  placeholder="0.00"
                  className="w-full bg-slate-50 border border-slate-100 p-4 pl-8 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-700 transition-all"
                  value={formData.price}
                  onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Floor Area (sq.ft)</label>
              <input 
                required
                type="text" 
                placeholder="e.g. 1500"
                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-700 transition-all"
                value={formData.area}
                onChange={(e) => setFormData(p => ({ ...p, area: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">Public Contact Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">+91</span>
              <input 
                required
                type="tel" 
                placeholder="10-digit mobile number"
                className="w-full bg-slate-50 border border-slate-100 p-4 pl-14 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold text-slate-700 transition-all"
                value={formData.contactNumber}
                onChange={(e) => setFormData(p => ({ ...p, contactNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-slate-50">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-50 border border-slate-100 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all text-xs uppercase tracking-widest"
            >
              Discard
            </button>
            <button 
              type="submit"
              className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-teal-600 hover:shadow-2xl hover:shadow-teal-600/30 transition-all text-xs uppercase tracking-widest active:scale-95"
            >
              Publish Listing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListingForm;
