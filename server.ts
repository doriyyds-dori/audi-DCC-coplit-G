import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API 路由：专门用于下载真正的离线单文件
  app.get("/api/download-offline", (req, res) => {
    const filePath = path.resolve(__dirname, "dist", "index.html");
    
    if (fs.existsSync(filePath)) {
      res.download(filePath, "邀约话术助手_完整离线版.html");
    } else {
      res.status(404).send("离线文件尚未生成，请稍后再试或联系管理员执行构建。");
    }
  });

  // 开发模式下的 Vite 中间件
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // 生产模式下提供静态文件
    app.use(express.static(path.resolve(__dirname, "dist")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
