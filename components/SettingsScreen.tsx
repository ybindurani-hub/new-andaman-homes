
import React, { useState, useEffect } from 'react';
import { Icons } from '../constants.tsx';
import { User } from '../types.ts';
import { updateUserProfile } from '../services/firebase.ts';

interface SettingsScreenProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
  onLogout: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onUpdateUser, onBack, onLogout, onToast }) => {
  const [activeTab, setActiveTab] = useState<'main' | 'edit-profile' | 'notifications' | 'about'>('main');
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phoneNumber || '');
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState({
    propertyAlerts: true,
    chatMessages: true,
    marketNews: false
  });

  useEffect(() => {
    const saved = localStorage.getItem('ah_user_prefs');
    if (saved) setPrefs(JSON.parse(saved));
  }, []);

  const savePref = (key: keyof typeof prefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    localStorage.setItem('ah_user_prefs', JSON.stringify(newPrefs));
    onToast(`Preferences updated`, 'info');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      onToast("Name cannot be empty", "error");
      return;
    }
    setLoading(true);
    try {
      await updateUserProfile(user.id, { name: editName, phoneNumber: editPhone });
      onUpdateUser({ ...user, name: editName, phoneNumber: editPhone });
      onToast("Profile updated successfully", "success");
      setActiveTab('main');
    } catch (err: any) {
      onToast("Sync failed. Signal poor.", "error");
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: 'Account Settings',
      items: [
        { icon: <Icons.User />, label: 'Profile Identity', value: user.name, action: () => setActiveTab('edit-profile') },
        { icon: <Icons.Phone />, label: 'Contact Verification', value: user.phoneNumber || 'Add Phone', action: () => setActiveTab('edit-profile') },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: <Icons.Bookmark />, label: 'Notifications', value: 'Managed', action: () => setActiveTab('notifications') },
      ]
    },
    {
      title: 'App Details',
      items: [
        { icon: <Icons.Message />, label: 'Help & Support', value: 'Customer Care', action: () => onToast("Support line: 99332 XXXXX", "info") },
        { icon: <Icons.Target />, label: 'App Version', value: 'v2.1.0 Stable', action: () => setActiveTab('about') },
      ]
    }
  ];

  if (activeTab === 'edit-profile') {
    return (
      <div className="max-w-xl mx-auto py-10 px-6 pb-32 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => setActiveTab('main')} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-3xl font-black text-slate-900">Edit Profile</h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Your Full Name</label>
            <input 
              type="text" 
              className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-100 focus:bg-white px-6 py-4 rounded-2xl outline-none font-bold text-slate-700 transition-all"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={loading}
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Phone Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300">+91</span>
              <input 
                type="tel" 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-100 focus:bg-white px-6 pl-14 py-4 rounded-2xl outline-none font-bold text-slate-700 transition-all"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="99332 XXXXX"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Registered Email</label>
            <input 
              type="text" 
              className="w-full bg-slate-100 border-2 border-transparent px-6 py-4 rounded-2xl outline-none font-bold text-slate-400 cursor-not-allowed"
              value={user.email}
              disabled
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl active:scale-95 transition-all disabled:opacity-50 mt-10"
          >
            {loading ? 'Updating Servers...' : 'Sync Profile Changes'}
          </button>
        </form>
      </div>
    );
  }

  if (activeTab === 'notifications') {
    return (
      <div className="max-w-xl mx-auto py-10 px-6 pb-32 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => setActiveTab('main')} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-3xl font-black text-slate-900">Preferences</h2>
        </div>
        <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden">
           {[
             { k: 'propertyAlerts' as const, l: 'Property Alerts', d: 'New listings in Port Blair' },
             { k: 'chatMessages' as const, l: 'Chat Messages', d: 'Instant buyer alerts' },
             { k: 'marketNews' as const, l: 'Market News', d: 'Island real estate trends' }
           ].map((item, i) => (
             <div key={i} className="flex items-center justify-between p-6 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-black text-slate-900">{item.l}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.d}</p>
                </div>
                <div 
                  onClick={() => savePref(item.k)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${prefs[item.k] ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${prefs[item.k] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-6 pb-32 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={onBack} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-3xl font-black text-slate-900">Global Settings</h2>
      </div>

      <div className="space-y-10">
        <div className="bg-slate-50 p-8 rounded-[2.5rem] flex items-center gap-6 border border-slate-100">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-xl">
            {user.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 leading-none mb-2">{user.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.email}</p>
          </div>
        </div>

        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-2">{section.title}</h3>
            <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
              {section.items.map((item, iIdx) => (
                <button 
                  key={iIdx} 
                  onClick={item.action}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                      {item.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-900">{item.label}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.value}</p>
                    </div>
                  </div>
                  <Icons.ChevronRight />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-6">
          <button 
            onClick={onLogout}
            className="w-full bg-rose-50 text-rose-600 py-6 rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-rose-100 transition-all active:scale-95"
          >
            Sign Out Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
