import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 启动日志
console.log("🚀 [AUDI CORE] System ignition sequence started...");

const container = document.getElementById('root');

if (container) {
  const root = ReactDOM.createRoot(container);
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  // 监听加载完成，移除首屏动画
  window.addEventListener('load', () => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.5s ease';
        setTimeout(() => loader.remove(), 500);
      }, 300);
    }
  });

  console.log("✅ [AUDI CORE] UI Engine mounted successfully");
} else {
  console.error("❌ [AUDI CORE] Mount point #root missing");
}