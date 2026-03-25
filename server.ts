import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// call_records 写入相关常量与辅助
// ============================================================

const DATA_DIR = path.resolve(__dirname, "data");
const RECORDS_FILE = path.resolve(DATA_DIR, "call_records.json");

const VALID_STATUS = ["not_connected", "no_intent", "has_intent"] as const;
const VALID_SCENARIO = ["existing", "new"] as const;

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeFileSync(RECORDS_FILE, "[]", "utf-8");
  }
}

function readRecords(): unknown[] {
  ensureDataFile();
  const raw = fs.readFileSync(RECORDS_FILE, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendRecord(record: Record<string, unknown>): void {
  const records = readRecords();
  records.push(record);
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), "utf-8");
}

// ============================================================
// 服务器启动
// ============================================================

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON 请求体解析（所有 POST API 的前提）
  app.use(express.json());

  // API 路由：专门用于下载真正的离线单文件
  app.get("/api/download-offline", (req, res) => {
    const filePath = path.resolve(__dirname, "dist", "index.html");
    
    if (fs.existsSync(filePath)) {
      res.download(filePath, "邀约话术助手_完整离线版.html");
    } else {
      res.status(404).send("离线文件尚未生成，请稍后再试或联系管理员执行构建。");
    }
  });

  // API 路由：写入通话记录
  app.post("/api/call-records", (req, res) => {
    try {
      const { userId, storeId, status, scenarioType } = req.body || {};

      // 字段必填校验
      const missing: string[] = [];
      if (!userId) missing.push("userId");
      if (!storeId) missing.push("storeId");
      if (!status) missing.push("status");
      if (!scenarioType) missing.push("scenarioType");

      if (missing.length > 0) {
        res.status(400).json({ success: false, error: `缺少必填字段：${missing.join(", ")}` });
        return;
      }

      // 枚举值校验
      if (!VALID_STATUS.includes(status)) {
        res.status(400).json({ success: false, error: `status 值不合法，允许值：${VALID_STATUS.join(", ")}` });
        return;
      }
      if (!VALID_SCENARIO.includes(scenarioType)) {
        res.status(400).json({ success: false, error: `scenarioType 值不合法，允许值：${VALID_SCENARIO.join(", ")}` });
        return;
      }

      // 后端自动生成字段
      const now = new Date();
      const record = {
        id: `rec_${crypto.randomUUID()}`,
        userId,
        storeId,
        status,
        scenarioType,
        callDate: now.toISOString().slice(0, 10),
        createdAt: now.toISOString(),
      };

      appendRecord(record);
      console.log("[call-records] 写入成功：", record.id);

      res.status(201).json({ success: true, id: record.id });
    } catch (err) {
      console.error("[call-records] 写入失败：", err);
      res.status(500).json({ success: false, error: "服务端写入失败" });
    }
  });

  // API 路由：管理员今日统计（只读）
  app.get("/api/admin/stats/today", (req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const allRecords = readRecords() as Array<Record<string, unknown>>;
      const todayRecords = allRecords.filter((r) => r.callDate === today);

      const summary = {
        totalCalls: todayRecords.length,
        notConnected: todayRecords.filter((r) => r.status === "not_connected").length,
        noIntent: todayRecords.filter((r) => r.status === "no_intent").length,
        hasIntent: todayRecords.filter((r) => r.status === "has_intent").length,
      };

      res.json({ success: true, summary, records: todayRecords });
    } catch (err) {
      console.error("[admin/stats/today] 读取失败：", err);
      res.status(500).json({ success: false, error: "服务端读取失败" });
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
    // SPA fallback：非 API 路由返回 index.html，支持 BrowserRouter 深链
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api/")) {
        res.sendFile(path.resolve(__dirname, "dist", "index.html"));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
