
import React, { useState, useRef } from 'react';
import { ListingCategory, FurnishingStatus, PostedBy, ParkingOption, ListingStatus, PropertyListing } from '../types.ts';
import { ANDAMAN_LOCATIONS, Icons } from '../constants.tsx';

interface ListingFormProps {
  onSubmit: (listing: any) => Promise<void>;
  onCancel: () => void;
  initialData?: PropertyListing;
}

const ListingForm: React.FC<ListingFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>(initialData?.imageUrls || []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    price: initialData?.price?.toString() || '',
    location: initialData?.location || ANDAMAN_LOCATIONS[0],
    category: initialData?.category || ListingCategory.HOUSE_RENT,
    area: initialData?.area || '',
    areaUnit: initialData?.areaUnit || 'sq.ft',
    contactNumber: initialData?.contactNumber || '',
    parking: initialData?.parking || ParkingOption.NONE,
    furnishing: initialData?.furnishing || FurnishingStatus.SEMI_FURNISHED,
    floor: initialData?.floor || 'Ground',
    postedBy: initialData?.postedBy || PostedBy.OWNER,
  });

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (imagePreviews.length + files.length > 10) {
      setErrors({ images: 'Maximum 10 photos allowed.' });
      return;
    }
    const newPreviews = await Promise.all(files.map(compressImage));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (formData.title.length < 5) newErrors.title = 'Enter a descriptive title.';
    if (!formData.price || Number(formData.price) <= 0) newErrors.price = 'Enter a valid price.';
    if (!formData.contactNumber || formData.contactNumber.length < 10) newErrors.contactNumber = 'Enter a 10-digit number.';
    if (!formData.description || formData.description.length < 20) newErrors.description = 'Provide more details (min 20 chars).';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imagePreviews.length === 0) {
      setErrors({ images: 'Upload at least one clear photo.' });
      return;
    }
    
    setIsSubmitting(true);
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(r => setTimeout(r, 50));
    }
    
    await onSubmit({
      ...formData,
      price: Number(formData.price),
      imageUrls: imagePreviews,
      status: initialData?.status || ListingStatus.ACTIVE
    });
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 pb-48 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="bg-white rounded-[4rem] p-10 sm:p-16 border border-slate-100 shadow-2xl relative overflow-hidden">
        {/* Progress HUD */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-16 text-center">
             <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8">
               <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
             </div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight">Syncing Property...</h3>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-4">Transmitting data to islands</p>
             <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden mt-8">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${uploadProgress}%` }}></div>
             </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-16">
          <div className="space-y-3">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
              {initialData ? 'Refine Listing' : 'Post Property'}
            </h2>
            <div className="flex items-center gap-3">
               <div className="flex gap-1">
                 <div className={`w-8 h-1 rounded-full transition-all ${step === 1 ? 'bg-slate-900 w-12' : 'bg-slate-100'}`}></div>
                 <div className={`w-8 h-1 rounded-full transition-all ${step === 2 ? 'bg-slate-900 w-12' : 'bg-slate-100'}`}></div>
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Phase {step}</span>
            </div>
          </div>
          <button 
            onClick={onCancel} 
            className="p-4 bg-slate-50 rounded-[1.5rem] text-slate-300 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-90"
          >
            <Icons.Close />
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-12">
            {/* Category Selector */}
            <div className="space-y-6">
               <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 border-b border-slate-50 pb-4">Core Classification</p>
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                 {Object.values(ListingCategory).map(c => (
                   <button 
                    key={c}
                    type="button"
                    onClick={() => setFormData(p => ({...p, category: c}))}
                    className={`py-5 px-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                      formData.category === c 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-100 hover:bg-emerald-50/10'
                    }`}
                   >
                     {c}
                   </button>
                 ))}
               </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-8">
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 border-b border-slate-50 pb-4">Identity & Location</p>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4">Property Headline</label>
                <input 
                  className={`w-full bg-slate-50 border-2 rounded-[1.5rem] px-8 py-5 outline-none font-bold text-slate-700 transition-all ${errors.title ? 'border-rose-100' : 'border-transparent focus:border-emerald-100 focus:bg-white'}`}
                  value={formData.title} 
                  onChange={e => setFormData(p => ({...p, title: e.target.value}))} 
                  placeholder="e.g. Spacious 2BHK with Sea View" 
                />
                {errors.title && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-4">{errors.title}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4">Exact Area</label>
                  <select className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-100 focus:bg-white rounded-[1.5rem] px-8 py-5 outline-none font-bold text-slate-700 appearance-none" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))}>
                    {ANDAMAN_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4">Listing By</label>
                  <div className="flex bg-slate-50 p-1 rounded-2xl">
                    {Object.values(PostedBy).map(p => (
                      <button 
                        key={p}
                        type="button"
                        onClick={() => setFormData(f => ({...f, postedBy: p}))}
                        className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.postedBy === p ? 'bg-white shadow-lg text-slate-900' : 'text-slate-400'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Financials & Specs */}
            <div className="space-y-8">
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 border-b border-slate-50 pb-4">Value & Dimensions</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4">Asking Price (₹)</label>
                  <input 
                    type="number" 
                    className={`w-full bg-slate-50 border-2 rounded-[1.5rem] px-8 py-5 outline-none font-black text-slate-900 text-lg transition-all ${errors.price ? 'border-rose-100' : 'border-transparent focus:border-emerald-100 focus:bg-white'}`}
                    value={formData.price} 
                    onChange={e => setFormData(p => ({...p, price: e.target.value}))} 
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4">Built-up (sq.ft)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-100 focus:bg-white rounded-[1.5rem] px-8 py-5 outline-none font-bold text-slate-700"
                    value={formData.area} 
                    onChange={e => setFormData(p => ({...p, area: e.target.value.replace(/\D/g, '')}))} 
                    placeholder="e.g. 1500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4">Property Particulars</label>
                <textarea 
                  rows={4} 
                  className={`w-full bg-slate-50 border-2 rounded-[2rem] px-8 py-6 outline-none font-medium text-slate-600 resize-none leading-relaxed italic ${errors.description ? 'border-rose-100' : 'border-transparent focus:border-emerald-100 focus:bg-white'}`}
                  value={formData.description} 
                  onChange={e => setFormData(p => ({...p, description: e.target.value}))} 
                  placeholder="Describe your property professionally. Mention key features like sea views, water supply, or road access..." 
                />
                {errors.description && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-4">{errors.description}</p>}
              </div>
            </div>

            {/* Verification */}
            <div className="space-y-8">
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 border-b border-slate-50 pb-4">Verification Link</p>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4">Contact Phone</label>
                <div className="relative">
                   <span className="absolute left-8 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm">+91</span>
                   <input 
                    type="tel" 
                    maxLength={10}
                    className={`w-full bg-slate-50 border-2 rounded-[1.5rem] px-8 pl-16 py-5 outline-none font-black text-slate-900 tracking-widest transition-all ${errors.contactNumber ? 'border-rose-100' : 'border-transparent focus:border-emerald-100 focus:bg-white'}`}
                    value={formData.contactNumber} 
                    onChange={e => setFormData(p => ({...p, contactNumber: e.target.value.replace(/\D/g, '')}))} 
                    placeholder="99332 XXXXX"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleNext} 
              className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl shadow-slate-900/20 active:scale-[0.98] transition-all mt-10 flex items-center justify-center gap-4 group"
            >
              Continue to Gallery <div className="group-hover:translate-x-1 transition-transform"><Icons.ChevronRight /></div>
            </button>
          </div>
        ) : (
          <div className="space-y-12 animate-in fade-in duration-500">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                 <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Visual Portfolio</p>
                 <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">{imagePreviews.length}/10 Photos</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="group relative aspect-square rounded-[2rem] overflow-hidden border-2 border-slate-50 shadow-sm animate-in zoom-in duration-300">
                    <img src={src} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <button 
                        type="button" 
                        onClick={() => setImagePreviews(p => p.filter((_, i) => i !== idx))} 
                        className="bg-white text-rose-500 p-3 rounded-2xl shadow-2xl active:scale-90"
                       >
                        <Icons.Trash />
                      </button>
                    </div>
                    {idx === 0 && <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest">Cover Image</span>}
                  </div>
                ))}
                
                {imagePreviews.length < 10 && (
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 hover:bg-white hover:border-emerald-200 hover:text-emerald-500 transition-all active:scale-[0.98] group"
                  >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                       <Icons.Camera />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">Upload Photo</span>
                  </button>
                )}
              </div>
              
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
              {errors.images && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center mt-4">{errors.images}</p>}
            </div>

            <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-4 shadow-2xl ring-8 ring-slate-50">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">Final Submission Preview</p>
               <div className="space-y-1">
                 <h4 className="text-xl font-black tracking-tight truncate">{formData.title}</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formData.location} • {formData.category}</p>
               </div>
               <div className="pt-4 flex justify-between items-end border-t border-white/5 mt-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Market Value</p>
                    <p className="text-2xl font-black text-emerald-400">₹{Number(formData.price).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Surface Area</p>
                    <p className="text-sm font-black text-slate-100">{formData.area || '--'} sq.ft</p>
                  </div>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-slate-50">
              <button 
                onClick={() => setStep(1)} 
                className="flex-1 py-7 rounded-[2.5rem] border-2 border-slate-100 font-black text-[11px] uppercase tracking-[0.4em] text-slate-400 hover:border-slate-900 hover:text-slate-900 transition-all active:scale-95"
              >
                ← Edit Details
              </button>
              <button 
                onClick={handleSubmit} 
                className="flex-[2] bg-emerald-500 text-white py-7 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-4"
              >
                Commit to Marketplace <Icons.Plus />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingForm;
