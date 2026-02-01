
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Enhanced Error Boundary for Production Stability
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, errorInfo: string }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[ANDAMAN-HOMES-CRITICAL]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8 text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center font-black text-3xl mb-8">A</div>
          <h1 className="text-3xl font-black mb-4 tracking-tight">Marketplace Sync Error</h1>
          <p className="text-slate-400 max-w-xs mb-8 text-sm font-medium">
            We couldn't synchronize your island session. This usually happens on slow networks or if authentication is interrupted.
          </p>
          
          <div className="bg-white/5 p-4 rounded-2xl mb-10 w-full max-w-sm">
             <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Diagnostic Detail</p>
             <p className="text-[11px] font-mono text-emerald-400/80 break-words">{this.state.errorInfo || 'Unknown Handshake Exception'}</p>
          </div>

          <button 
            onClick={() => {
               // Clear local corrupted session and reload
               localStorage.clear();
               window.location.href = window.location.origin;
            }}
            className="bg-white text-slate-900 px-10 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] active:scale-95 transition-all shadow-2xl"
          >
            Reset & Reconnect
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
