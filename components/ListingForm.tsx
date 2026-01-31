import React, { useState, useRef } from 'react';
import { ListingCategory, PropertyListing, FurnishingStatus, PostedBy, ParkingOption, ListingStatus } from '../types.ts';
import { ANDAMAN_LOCATIONS, Icons } from '../constants.tsx';

interface ListingFormProps {
  onSubmit: (listing: any) => Promise<void>;
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
    bathrooms: '1',
    parking: ParkingOption.NONE,
    furnishing: FurnishingStatus.SEMI_FURNISHED,
    floor: 'Ground',
    postedBy: PostedBy.OWNER,
  });

  const compressImage = (base64Str: string, maxWidth = 1000, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (imagePreviews.length + files.length > 10) {
      alert("Maximum 10 images allowed.");
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setImagePreviews(prev => [...prev, compressed]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imagePreviews.length === 0) {
      alert("Please upload at least one image.");
      return;
    }
    
    setLoading(true);
    try {
      const finalLocation = formData.location === 'Other' ? formData.customLocation : formData.location;
      await onSubmit({
        ...formData,
        location: finalLocation,
        price: Number(formData.price),
        imageUrls: imagePreviews,
        status: ListingStatus.ACTIVE
      });
    } catch (error) {
      console.error("Form submission error:", error);
      alert("Publishing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const floorOptions = ['Basement', 'Ground', '1st', '2nd', '3rd', '4th', '5th', '6th+', 'Penthouse'];

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 pb-32 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-50">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-2">Post Your Property</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Fill in the details to find the best buyers/tenants</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Media Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Media Gallery ({imagePreviews.length}/10)
              </label>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[9px] font-black text-[#4CAF50] uppercase tracking-widest hover:underline"
              >
                + Add Images
              </button>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
              {imagePreviews.map((src, idx) => (
                <div key={idx} className="relative min-w-[120px] aspect-square rounded-2xl overflow-hidden border border-slate-100 group shadow-sm">
                  <img src={src} className="w-full h-full object-cover" alt="Preview" />
                  <button 
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              ))}
              {imagePreviews.length < 10 && (
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-w-[120px] aspect-square border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all text-slate-300"
                >
                  <Icons.Camera />
                  <span className="text-[8px] font-black uppercase tracking-widest mt-2">Upload</span>
                </button>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageChange} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Ad Type</label>
              <select 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white p-4 rounded-2xl outline-none font-bold text-slate-700 text-sm transition-all"
                value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as ListingCategory }))}
              >
                {Object.values(ListingCategory).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">You are</label>
              <select 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white p-4 rounded-2xl outline-none font-bold text-slate-700 text-sm transition-all"
                value={formData.postedBy}
                onChange={(e) => setFormData(p => ({ ...p, postedBy: e.target.value as PostedBy }))}
              >
                <option value={PostedBy.OWNER}>Direct Owner</option>
                <option value={PostedBy.BROKER}>Agent/Broker</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Listing Title</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Luxurious 3BHK Villa near Radhanagar Beach"
              className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white p-4 rounded-2xl outline-none font-bold text-slate-700 text-sm transition-all"
              value={formData.title}
              onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">BHK / Type</label>
              <select 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white p-4 rounded-2xl outline-none font-bold text-slate-700 text-sm transition-all"
                value={formData.bhk}
                onChange={(e) => setFormData(p => ({ ...p, bhk: e.target.value }))}
              >
                <option value="1 RK">1 RK</option>
                <option value="1 BHK">1 BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="3 BHK">3 BHK</option>
                <option value="4 BHK">4 BHK</option>
                <option value="5+ BHK">5+ BHK</option>
                <option value="Plot">Plot / Land</option>
                <option value="Office">Commercial Office</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Floor Level</label>
              <select 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white p-4 rounded-2xl outline-none font-bold text-slate-700 text-sm transition-all"
                value={formData.floor}
                onChange={(e) => setFormData(p => ({ ...p, floor: e.target.value }))}
              >
                {floorOptions.map(option => (
                  <option key={option} value={option}>{option} Floor</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Locality</label>
            <select 
              className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white p-4 rounded-2xl outline-none font-bold text-slate-700 text-sm mb-2 transition-all"
              value={formData.location}
              onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
            >
              {ANDAMAN_LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
              <option value="Other">Other Location</option>
            </select>
            {formData.location === 'Other' && (
              <input 
                type="text"
                placeholder="Enter custom location name"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white p-4 rounded-2xl outline-none font-bold text-slate-700 text-sm animate-in fade-in"
                value={formData.customLocation}
                onChange={(e) => setFormData(p => ({ ...p, customLocation: e.target.value }))}
                required
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Price (₹)</label>
              <input 
                required
                type="number" 
                placeholder="Ex: 5000000"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white p-4 rounded-2xl outline-none font-bold text-slate-700 text-sm transition-all"
                value={formData.price}
                onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Built-up Area</label>
              <div className="flex gap-2">
                <input 
                  required
                  type="number" 
                  placeholder="Ex: 1200"
                  className="flex-grow bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white p-4 rounded-2xl outline-none font-bold text-slate-700 text-sm transition-all"
                  value={formData.area}
                  onChange={(e) => setFormData(p => ({ ...p, area: e.target.value }))}
                />
                <select 
                   className="bg-slate-50 border-2 border-transparent p-4 rounded-2xl font-black text-[10px] uppercase"
                   value={formData.areaUnit}
                   onChange={(e) => setFormData(p => ({ ...p, areaUnit: e.target.value as 'sq.ft' | 'sq.mt' }))}
                >
                  <option value="sq.ft">sqft</option>
                  <option value="sq.mt">sqmt</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Contact Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm tracking-widest">+91</span>
              <input 
                required
                type="tel" 
                placeholder="99XXXXXXXX"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white p-4 pl-14 rounded-2xl outline-none font-bold text-slate-700 text-sm transition-all"
                value={formData.contactNumber}
                onChange={(e) => setFormData(p => ({ ...p, contactNumber: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Detailed Description</label>
            <textarea 
              required
              rows={4}
              placeholder="Tell us more about the property, nearby amenities, and condition..."
              className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-100 focus:bg-white p-5 rounded-[1.5rem] outline-none font-medium text-slate-700 text-sm transition-all"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 bg-white border-2 border-slate-50 py-5 rounded-2xl font-black text-slate-300 text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all">Discard</button>
            <button type="submit" disabled={loading} className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-100 active:scale-95 transition-all disabled:opacity-50">
              {loading ? 'Publishing...' : 'List Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ListingForm;