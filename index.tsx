import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("%c 🚀 [AUDI CORE] System ignition sequence started... ", "background: #000; color: #fff; font-weight: bold; padding: 4px;");

const container = document.getElementById('root');

if (container) {
  const root = ReactDOM.createRoot(container);
  // React 接管后，loader 会自动被替换
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("%c ✅ [AUDI CORE] UI Engine mounted and running ", "color: #10b981; font-weight: bold;");
} else {
  console.error("❌ [AUDI CORE] CRITICAL ERROR: Mount point #root missing");
}