import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import { store } from './store';
import * as Sentry from "@sentry/react";
import { XCircle } from 'lucide-react';

const SENTRY_DSN = "https://2481b65344e0e6129dfcbde37a8b0d57@o4510682370015232.ingest.us.sentry.io/4510682379845632"; // GANTI DENGAN DSN DARI SENTRY.IO

Sentry.init({
  dsn: SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, 
  // Session Replay
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0, 
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <Sentry.ErrorBoundary fallback={
        <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
           <div className="bg-[#1E1E1E] border border-white/5 rounded-2xl p-10 max-w-md text-center shadow-2xl">
              <div className="w-20 h-20 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
                 <XCircle size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
              <p className="text-gray-500 mb-8 text-sm">Sistem telah mencatat error ini secara otomatis. Tim teknis kami akan segera memperbaikinya.</p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-[#C3A47B] text-black font-bold py-4 px-6 rounded-xl hover:bg-[#B9976E] transition-all shadow-lg shadow-gold/20 active:scale-95"
              >
                Muat Ulang Halaman
              </button>
           </div>
        </div>
      }>
        <App />
      </Sentry.ErrorBoundary>
    </Provider>
  </React.StrictMode>
);