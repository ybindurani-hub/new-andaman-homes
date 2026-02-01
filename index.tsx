
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Simple Error Boundary for Stability
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[AH-CRITICAL]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8 text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center font-black text-3xl mb-8 animate-bounce">A</div>
          <h1 className="text-3xl font-black mb-4">Something went wrong</h1>
          <p className="text-slate-400 max-w-xs mb-10 text-sm font-medium">An unexpected error occurred. Tap below to refresh your island marketplace session.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-white text-slate-900 px-10 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] active:scale-95 transition-all shadow-2xl"
          >
            Recover Session
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
