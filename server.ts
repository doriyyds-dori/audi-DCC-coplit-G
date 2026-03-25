import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// 数据目录与文件路径
// ============================================================

const DATA_DIR = path.resolve(__dirname, "data");
const DB_FILE = path.resolve(DATA_DIR, "app.db");
const USERS_JSON = path.resolve(DATA_DIR, "users.json");
const STORES_JSON = path.resolve(DATA_DIR, "stores.json");
const RECORDS_JSON = path.resolve(DATA_DIR, "call_records.json");

// ============================================================
// 类型定义
// ============================================================

interface UserRecord {
  userId: string;
  username: string;
  password: string; // salt:hash (scrypt)
  displayName: string;
  role: string;
  storeId: string;
  enabled: boolean;
}

interface UserRow {
  userId: string;
  username: string;
  password: string;
  displayName: string;
  role: string;
  storeId: string;
  enabled: number; // SQLite: 0/1
}

interface StoreRecord {
  storeId: string;
  name: string;
}

/** 公开的用户信息（不含密码） */
interface PublicUser {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  storeId: string;
}

// ============================================================
// SQLite 初始化
// ============================================================

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");

// 建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    displayName TEXT NOT NULL,
    role TEXT NOT NULL,
    storeId TEXT DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS stores (
    storeId TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS call_records (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    storeId TEXT NOT NULL,
    status TEXT NOT NULL,
    scenarioType TEXT NOT NULL,
    callDate TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

// 自动导入 JSON 种子数据（仅在表为空时）
function seedFromJson(): void {
  const userCount = (db.prepare("SELECT COUNT(*) AS cnt FROM users").get() as { cnt: number }).cnt;
  if (userCount === 0 && fs.existsSync(USERS_JSON)) {
    try {
      const users: UserRecord[] = JSON.parse(fs.readFileSync(USERS_JSON, "utf-8"));
      const insert = db.prepare(
        "INSERT OR IGNORE INTO users (userId, username, password, displayName, role, storeId, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      const tx = db.transaction(() => {
        for (const u of users) {
          insert.run(u.userId, u.username, u.password, u.displayName, u.role, u.storeId, u.enabled ? 1 : 0);
        }
      });
      tx();
      console.log(`[sqlite] 已从 users.json 导入 ${users.length} 条用户记录`);
    } catch (err) {
      console.error("[sqlite] users.json 导入失败：", err);
    }
  }

  const storeCount = (db.prepare("SELECT COUNT(*) AS cnt FROM stores").get() as { cnt: number }).cnt;
  if (storeCount === 0 && fs.existsSync(STORES_JSON)) {
    try {
      const stores: StoreRecord[] = JSON.parse(fs.readFileSync(STORES_JSON, "utf-8"));
      const insert = db.prepare("INSERT OR IGNORE INTO stores (storeId, name) VALUES (?, ?)");
      const tx = db.transaction(() => {
        for (const s of stores) {
          insert.run(s.storeId, s.name);
        }
      });
      tx();
      console.log(`[sqlite] 已从 stores.json 导入 ${stores.length} 条门店记录`);
    } catch (err) {
      console.error("[sqlite] stores.json 导入失败：", err);
    }
  }

  // call_records 种子导入
  const recordCount = (db.prepare("SELECT COUNT(*) AS cnt FROM call_records").get() as { cnt: number }).cnt;
  if (recordCount === 0 && fs.existsSync(RECORDS_JSON)) {
    try {
      const records = JSON.parse(fs.readFileSync(RECORDS_JSON, "utf-8")) as Array<Record<string, string>>;
      const insert = db.prepare(
        "INSERT OR IGNORE INTO call_records (id, userId, storeId, status, scenarioType, callDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      );
      const tx = db.transaction(() => {
        for (const r of records) {
          insert.run(r.id, r.userId, r.storeId, r.status, r.scenarioType, r.callDate, r.createdAt);
        }
      });
      tx();
      console.log(`[sqlite] 已从 call_records.json 导入 ${records.length} 条通话记录`);
    } catch (err) {
      console.error("[sqlite] call_records.json 导入失败：", err);
    }
  }
}

seedFromJson();

// ============================================================
// 主数据读取（SQLite）
// ============================================================

function readUsers(): UserRecord[] {
  const rows = db.prepare("SELECT * FROM users").all() as UserRow[];
  return rows.map((r) => ({ ...r, enabled: r.enabled === 1 }));
}

function readStores(): StoreRecord[] {
  return db.prepare("SELECT * FROM stores").all() as StoreRecord[];
}

// ============================================================
// 密码校验（scrypt）
// ============================================================

function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(plain, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

// ============================================================
// 会话管理（内存 Map，服务重启即失效）
// ============================================================

interface Session {
  userId: string;
  createdAt: string;
}

const sessions = new Map<string, Session>();

function createSession(userId: string): string {
  const token = crypto.randomUUID();
  sessions.set(token, { userId, createdAt: new Date().toISOString() });
  return token;
}

function resolveSession(req: express.Request): PublicUser | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const session = sessions.get(token);
  if (!session) return null;
  const user = readUsers().find((u) => u.userId === session.userId);
  if (!user || !user.enabled) return null;
  return toPublicUser(user);
}

function toPublicUser(u: UserRecord): PublicUser {
  return {
    userId: u.userId,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    storeId: u.storeId,
  };
}

// ============================================================
// call_records 辅助（SQLite）
// ============================================================

const VALID_STATUS = ["not_connected", "no_intent", "has_intent"] as const;
const VALID_SCENARIO = ["existing", "new"] as const;

const insertRecordStmt = db.prepare(
  "INSERT INTO call_records (id, userId, storeId, status, scenarioType, callDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
);

function appendRecord(record: { id: string; userId: string; storeId: string; status: string; scenarioType: string; callDate: string; createdAt: string }): void {
  insertRecordStmt.run(record.id, record.userId, record.storeId, record.status, record.scenarioType, record.callDate, record.createdAt);
}

// ============================================================
// 服务器启动
// ============================================================

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON 请求体解析
  app.use(express.json());

  // ========== 认证接口 ==========

  // POST /api/auth/login — 登录
  app.post("/api/auth/login", (req, res) => {
    try {
      const { username, password } = req.body || {};

      if (!username || !password) {
        res.status(400).json({ success: false, error: "请输入用户名和密码" });
        return;
      }

      const user = readUsers().find((u) => u.username === username);

      if (!user) {
        res.status(401).json({ success: false, error: "用户名或密码错误" });
        return;
      }

      if (!user.enabled) {
        res.status(403).json({ success: false, error: "账号已被禁用" });
        return;
      }

      if (!verifyPassword(password, user.password)) {
        res.status(401).json({ success: false, error: "用户名或密码错误" });
        return;
      }

      const token = createSession(user.userId);
      console.log("[auth/login] 登录成功：", user.userId);

      res.json({ success: true, token, user: toPublicUser(user) });
    } catch (err) {
      console.error("[auth/login] 登录失败：", err);
      res.status(500).json({ success: false, error: "服务端登录异常" });
    }
  });

  // GET /api/auth/me — 获取当前登录用户
  app.get("/api/auth/me", (req, res) => {
    const user = resolveSession(req);
    if (!user) {
      res.status(401).json({ success: false, error: "未登录或登录已过期" });
      return;
    }
    res.json({ success: true, user });
  });

  // POST /api/auth/logout — 登出
  app.post("/api/auth/logout", (req, res) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      const token = auth.slice(7);
      sessions.delete(token);
    }
    res.json({ success: true });
  });

  // ========== 业务接口 ==========

  // API 路由：下载离线文件
  app.get("/api/download-offline", (req, res) => {
    const filePath = path.resolve(__dirname, "dist", "index.html");
    if (fs.existsSync(filePath)) {
      res.download(filePath, "邀约话术助手_完整离线版.html");
    } else {
      res.status(404).send("离线文件尚未生成，请稍后再试或联系管理员执行构建。");
    }
  });

  // API 路由：写入通话记录（需认证）
  app.post("/api/call-records", (req, res) => {
    try {
      // 身份校验：从 session 获取 userId/storeId
      const currentUser = resolveSession(req);
      if (!currentUser) {
        res.status(401).json({ success: false, error: "未登录或登录已过期" });
        return;
      }

      const { status, scenarioType } = req.body || {};

      // 字段必填校验
      const missing: string[] = [];
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

      // 后端自动生成字段 + 从 session 取身份
      const now = new Date();
      const record = {
        id: `rec_${crypto.randomUUID()}`,
        userId: currentUser.userId,
        storeId: currentUser.storeId,
        status,
        scenarioType,
        callDate: now.toISOString().slice(0, 10),
        createdAt: now.toISOString(),
      };

      appendRecord(record);
      console.log("[call-records] 写入成功：", record.id, "用户：", currentUser.userId);

      res.status(201).json({ success: true, id: record.id });
    } catch (err) {
      console.error("[call-records] 写入失败：", err);
      res.status(500).json({ success: false, error: "服务端写入失败" });
    }
  });

  // API 路由：管理员今日统计（只读，SQLite）
  app.get("/api/admin/stats/today", (req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);

      const todayRecords = db.prepare("SELECT * FROM call_records WHERE callDate = ?").all(today) as Array<Record<string, unknown>>;

      const counts = db.prepare(
        "SELECT status, COUNT(*) AS cnt FROM call_records WHERE callDate = ? GROUP BY status"
      ).all(today) as Array<{ status: string; cnt: number }>;

      const countMap = Object.fromEntries(counts.map((c) => [c.status, c.cnt]));

      const summary = {
        totalCalls: todayRecords.length,
        notConnected: countMap["not_connected"] ?? 0,
        noIntent: countMap["no_intent"] ?? 0,
        hasIntent: countMap["has_intent"] ?? 0,
      };

      res.json({ success: true, summary, records: todayRecords });
    } catch (err) {
      console.error("[admin/stats/today] 读取失败：", err);
      res.status(500).json({ success: false, error: "服务端读取失败" });
    }
  });

  // API 路由：管理员用户列表（只读）
  app.get("/api/admin/users", (req, res) => {
    try {
      const rows = db.prepare(
        "SELECT userId, username, displayName, role, storeId, enabled FROM users"
      ).all() as Array<{ userId: string; username: string; displayName: string; role: string; storeId: string; enabled: number }>;

      const users = rows.map((r) => ({ ...r, enabled: r.enabled === 1 }));
      res.json({ success: true, users });
    } catch (err) {
      console.error("[admin/users] 读取失败：", err);
      res.status(500).json({ success: false, error: "用户列表加载失败" });
    }
  });

  // API 路由：管理员门店列表（只读）
  app.get("/api/admin/stores", (req, res) => {
    try {
      const stores = db.prepare("SELECT storeId, name FROM stores").all() as StoreRecord[];
      res.json({ success: true, stores });
    } catch (err) {
      console.error("[admin/stores] 读取失败：", err);
      res.status(500).json({ success: false, error: "门店列表加载失败" });
    }
  });

  // ========== 静态文件与 SPA ==========

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
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
