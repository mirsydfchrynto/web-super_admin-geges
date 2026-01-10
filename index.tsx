import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import { store } from './store';
import * as Sentry from "@sentry/react";

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
        <div className="min-h-screen bg-[#111827] flex items-center justify-center p-4">
           <div className="bg-[#1f2937] border border-red-500/20 rounded-2xl p-8 max-w-md text-center shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
              <p className="text-gray-400 mb-6">Sistem telah mencatat error ini. Tim kami akan segera memperbaikinya.</p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-[#C3A47B] text-black font-bold py-2 px-6 rounded-lg hover:bg-[#d4b58c] transition-colors"
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