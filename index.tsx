import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("🚀 [Audi System] 初始化序列启动...");

const container = document.getElementById('root');

if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("✅ [Audi System] UI 渲染引擎已就绪");
} else {
  console.error("❌ [Audi System] 关键错误：未找到挂载点 #root");
}