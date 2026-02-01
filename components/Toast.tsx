import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-slate-800';

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-top duration-300">
      <div className={`${bgColor} text-white px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3`}>
        {type === 'success' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        {message}
      </div>
    </div>
  );
};

export default Toast;