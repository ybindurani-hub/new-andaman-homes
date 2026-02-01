
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
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = await Promise.all(files.map(compressImage));
    setImagePreviews(prev => [...prev, ...newPreviews].slice(0, 10));
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (formData.title.length < 5) newErrors.title = 'Title too short';
    if (!formData.price) newErrors.price = 'Price is required';
    if (!formData.contactNumber) newErrors.contactNumber = 'Contact is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imagePreviews.length === 0) {
      setErrors({ images: 'At least one photo is required' });
      return;
    }
    
    setIsSubmitting(true);
    for (let i = 0; i <= 100; i += 20) {
      setUploadProgress(i);
      await new Promise(r => setTimeout(r, 100));
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
    <div className="max-w-xl mx-auto py-6 px-4 pb-40 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-2xl relative overflow-hidden">
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-12">
             <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Publishing to Marketplace...</p>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">{initialData ? 'Edit Ad' : 'Post Ad'}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Step {step} of 2</p>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-300 hover:text-slate-900"><Icons.Close /></button>
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Property Title</label>
              <input 
                className={`w-full bg-slate-50 border-2 rounded-2xl p-4 outline-none font-bold text-slate-700 transition-all ${errors.title ? 'border-rose-100' : 'border-transparent focus:border-emerald-100'}`}
                value={formData.title} 
                onChange={e => setFormData(p => ({...p, title: e.target.value}))} 
                placeholder="e.g. 2 BHK House for Rent in Dollygunj" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Category</label>
                <select className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-100 rounded-2xl p-4 outline-none font-bold text-slate-700 appearance-none" value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value as ListingCategory}))}>
                  {Object.values(ListingCategory).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Location</label>
                <select className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-100 rounded-2xl p-4 outline-none font-bold text-slate-700 appearance-none" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))}>
                  {ANDAMAN_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Price (₹)</label>
                <input 
                  type="number" 
                  className={`w-full bg-slate-50 border-2 rounded-2xl p-4 outline-none font-bold text-slate-700 transition-all ${errors.price ? 'border-rose-100' : 'border-transparent focus:border-emerald-100'}`}
                  value={formData.price} 
                  onChange={e => setFormData(p => ({...p, price: e.target.value}))} 
                  placeholder="Total Price"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Floor</label>
                <select className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-100 rounded-2xl p-4 outline-none font-bold text-slate-700 appearance-none" value={formData.floor} onChange={e => setFormData(p => ({...p, floor: e.target.value}))}>
                  {['Ground', '1st Floor', '2nd Floor', '3rd Floor', '4th+', 'Entire Building'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Description</label>
              <textarea 
                rows={3} 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-100 rounded-2xl p-4 outline-none font-medium text-slate-700 resize-none" 
                value={formData.description} 
                onChange={e => setFormData(p => ({...p, description: e.target.value}))} 
                placeholder="Tell buyers about amenities, nearby landmarks, etc." 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Contact Number</label>
              <input 
                type="tel" 
                className={`w-full bg-slate-50 border-2 rounded-2xl p-4 outline-none font-bold text-slate-700 transition-all ${errors.contactNumber ? 'border-rose-100' : 'border-transparent focus:border-emerald-100'}`}
                value={formData.contactNumber} 
                onChange={e => setFormData(p => ({...p, contactNumber: e.target.value}))} 
                placeholder="Phone for buyers to call"
              />
            </div>

            <button onClick={handleNext} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-4">
              Continue to Photos →
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Upload Property Photos (Max 10)</label>
              <div className="grid grid-cols-3 gap-2">
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-100">
                    <img src={src} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setImagePreviews(p => p.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-rose-500/90 text-white p-1.5 rounded-xl shadow-lg">
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
                {imagePreviews.length < 10 && (
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:bg-slate-50 hover:border-emerald-200 transition-all group">
                    <Icons.Camera />
                    <span className="text-[8px] font-black uppercase mt-2 group-hover:text-emerald-500">Add Photo</span>
                  </button>
                )}
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
              {errors.images && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest text-center">{errors.images}</p>}
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Preview Details</p>
               <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 truncate mr-4">{formData.title}</span>
                  <span className="text-xs font-black text-emerald-600 whitespace-nowrap">₹ {formData.price}</span>
               </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button onClick={() => setStep(1)} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all">← Back</button>
              <button onClick={handleSubmit} className="flex-2 bg-slate-900 text-white py-5 px-10 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">
                Publish Listing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingForm;
