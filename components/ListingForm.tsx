
import React, { useState, useRef, useEffect } from 'react';
import { ListingCategory, FurnishingStatus, PostedBy, ParkingOption, ListingStatus } from '../types.ts';
import { ANDAMAN_LOCATIONS, Icons } from '../constants.tsx';

interface ListingFormProps {
  onSubmit: (listing: any) => Promise<void>;
  onCancel: () => void;
}

const ListingForm: React.FC<ListingFormProps> = ({ onSubmit, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: ANDAMAN_LOCATIONS[0],
    category: ListingCategory.HOUSE_RENT,
    area: '',
    areaUnit: 'sq.ft' as 'sq.ft' | 'sq.mt',
    contactNumber: '',
    parking: ParkingOption.NONE,
    furnishing: FurnishingStatus.SEMI_FURNISHED,
    floor: 'Ground',
    postedBy: PostedBy.OWNER,
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
          const MAX_WIDTH = 1000;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = await Promise.all(files.map(compressImage));
    setImagePreviews(prev => [...prev, ...newPreviews].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title.length < 5) { setErrors({title: 'Too short'}); return; }
    if (imagePreviews.length === 0) { setErrors({images: 'Photo required'}); return; }
    
    setIsSubmitting(true);
    // Simulate island network latency
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(r => setTimeout(r, 150));
    }
    
    await onSubmit({
      ...formData,
      price: Number(formData.price),
      imageUrls: imagePreviews,
      status: ListingStatus.ACTIVE
    });
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4 pb-40 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl relative overflow-hidden">
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-12">
             <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
             </div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Uploading to Island Servers...</p>
          </div>
        )}

        <h2 className="text-3xl font-black mb-10 text-center">Post Property</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {imagePreviews.map((src, idx) => (
              <div key={idx} className="relative min-w-[100px] aspect-square rounded-2xl overflow-hidden border border-slate-50">
                <img src={src} className="w-full h-full object-cover" />
                <button type="button" onClick={() => setImagePreviews(p => p.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-rose-500 text-white p-1.5 rounded-xl"><Icons.Trash /></button>
              </div>
            ))}
            {imagePreviews.length < 10 && (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="min-w-[100px] aspect-square border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:bg-slate-50 transition-all">
                <Icons.Camera />
                <span className="text-[8px] font-black uppercase mt-1">Add Photo</span>
              </button>
            )}
          </div>
          {errors.images && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest text-center">{errors.images}</p>}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Title</label>
              <input required className="w-full bg-slate-50 border border-transparent focus:border-emerald-100 rounded-2xl p-4 outline-none font-bold text-slate-700" value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} placeholder="e.g. Modern Shop in Bazaar" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Price (₹)</label>
                 <input required type="number" className="w-full bg-slate-50 border border-transparent focus:border-emerald-100 rounded-2xl p-4 outline-none font-bold text-slate-700" value={formData.price} onChange={e => setFormData(p => ({...p, price: e.target.value}))} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Location</label>
                 <select className="w-full bg-slate-50 border border-transparent focus:border-emerald-100 rounded-2xl p-4 outline-none font-bold text-slate-700" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))}>
                    {ANDAMAN_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                 </select>
               </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Description</label>
              <textarea required rows={4} className="w-full bg-slate-50 border border-transparent focus:border-emerald-100 rounded-2xl p-5 outline-none font-medium text-slate-700" value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} placeholder="Tell islanders about your property..." />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Contact (WhatsApp/Call)</label>
              <input required type="tel" className="w-full bg-slate-50 border border-transparent focus:border-emerald-100 rounded-2xl p-4 outline-none font-bold text-slate-700" value={formData.contactNumber} onChange={e => setFormData(p => ({...p, contactNumber: e.target.value}))} placeholder="99332 XXXXX" />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 py-5 rounded-2xl border border-slate-100 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Cancel</button>
            <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Publish Live</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListingForm;
