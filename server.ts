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
    createdAt TEXT NOT NULL,
    scriptId TEXT NOT NULL DEFAULT '',
    scriptSource TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS scripts (
    scriptId TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scope TEXT NOT NULL,
    scenarioType TEXT NOT NULL,
    storeId TEXT DEFAULT '',
    sourceScriptId TEXT DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS script_feedbacks (
    feedbackId TEXT PRIMARY KEY,
    conversationId TEXT NOT NULL,
    userId TEXT NOT NULL,
    storeId TEXT NOT NULL DEFAULT '',
    scriptId TEXT NOT NULL,
    scriptSource TEXT NOT NULL DEFAULT '',
    feedbackType TEXT NOT NULL,
    messageIndex INTEGER NOT NULL,
    messageText TEXT NOT NULL DEFAULT '',
    stepId TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

// script_feedbacks 唯一索引：conversationId + messageIndex
try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_conv_msg ON script_feedbacks (conversationId, messageIndex)"); } catch { /* 已存在 */ }

// 迁移：给已有 call_records 表添加 scriptId / scriptSource 列（如不存在）
try { db.exec("ALTER TABLE call_records ADD COLUMN scriptId TEXT NOT NULL DEFAULT ''"); } catch { /* 列已存在 */ }
try { db.exec("ALTER TABLE call_records ADD COLUMN scriptSource TEXT NOT NULL DEFAULT ''"); } catch { /* 列已存在 */ }

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
  "INSERT INTO call_records (id, userId, storeId, status, scenarioType, callDate, createdAt, scriptId, scriptSource) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
);

function appendRecord(record: { id: string; userId: string; storeId: string; status: string; scenarioType: string; callDate: string; createdAt: string; scriptId: string; scriptSource: string }): void {
  insertRecordStmt.run(record.id, record.userId, record.storeId, record.status, record.scenarioType, record.callDate, record.createdAt, record.scriptId, record.scriptSource);
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

      const { status, scenarioType, scriptId } = req.body || {};

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

      // 话术来源查询：根据 scriptId 确定 scriptSource
      let resolvedScriptId = "";
      let resolvedScriptSource = "";
      if (scriptId) {
        const scriptRow = db.prepare(
          "SELECT scope FROM scripts WHERE scriptId = ?"
        ).get(scriptId) as { scope: string } | undefined;
        if (!scriptRow) {
          res.status(400).json({ success: false, error: "scriptId 不存在" });
          return;
        }
        resolvedScriptId = scriptId;
        resolvedScriptSource = scriptRow.scope; // 'global' 或 'store'
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
        scriptId: resolvedScriptId,
        scriptSource: resolvedScriptSource,
      };

      appendRecord(record);
      console.log("[call-records] 写入成功：", record.id, "用户：", currentUser.userId, "话术：", resolvedScriptId || "未指定");

      res.status(201).json({ success: true, id: record.id });
    } catch (err) {
      console.error("[call-records] 写入失败：", err);
      res.status(500).json({ success: false, error: "服务端写入失败" });
    }
  });

  // API 路由：管理员今日统计（只读，SQLite）
  app.get("/api/admin/stats/today", (req, res) => {
    try {
      const user = resolveSession(req);
      if (!user) { res.status(401).json({ success: false, error: "未登录或登录已过期" }); return; }
      if (user.role !== "super_admin" && user.role !== "store_admin") { res.status(403).json({ success: false, error: "无权访问" }); return; }

      const today = new Date().toISOString().slice(0, 10);
      const storeFilter = user.role === "store_admin" ? " AND storeId = ?" : "";
      const params: unknown[] = [today];
      if (user.role === "store_admin") params.push(user.storeId);

      const todayRecords = db.prepare(
        `SELECT cr.*, u.displayName, s.name AS storeName
         FROM call_records cr
         LEFT JOIN users u ON cr.userId = u.userId
         LEFT JOIN stores s ON cr.storeId = s.storeId
         WHERE cr.callDate = ?${storeFilter.replace(/storeId/g, 'cr.storeId')}`
      ).all(...params) as Array<Record<string, unknown>>;

      const counts = db.prepare(
        `SELECT status, COUNT(*) AS cnt FROM call_records WHERE callDate = ?${storeFilter} GROUP BY status`
      ).all(...params) as Array<{ status: string; cnt: number }>;

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

  // API 路由：管理员今日反馈统计（只读，SQLite）
  app.get("/api/admin/stats/feedback-today", (req, res) => {
    try {
      const user = resolveSession(req);
      if (!user) {
        res.status(401).json({ success: false, error: "未登录或登录已过期" });
        return;
      }
      if (user.role !== "super_admin" && user.role !== "store_admin") {
        res.status(403).json({ success: false, error: "无权访问" });
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      // store_admin 只看本店数据
      const storeFilter = user.role === "store_admin" ? " AND storeId = ?" : "";
      const params: unknown[] = [today];
      if (user.role === "store_admin") params.push(user.storeId);

      // 概览统计
      const countRows = db.prepare(
        `SELECT scriptSource, feedbackType, COUNT(*) AS cnt FROM script_feedbacks WHERE createdAt >= ?${storeFilter} GROUP BY scriptSource, feedbackType`
      ).all(...params) as Array<{ scriptSource: string; feedbackType: string; cnt: number }>;

      let totalLikes = 0, totalDislikes = 0;
      let globalLikes = 0, globalDislikes = 0;
      let storeLikes = 0, storeDislikes = 0;

      for (const row of countRows) {
        if (row.feedbackType === "like") {
          totalLikes += row.cnt;
          if (row.scriptSource === "global") globalLikes += row.cnt;
          else storeLikes += row.cnt;
        } else {
          totalDislikes += row.cnt;
          if (row.scriptSource === "global") globalDislikes += row.cnt;
          else storeDislikes += row.cnt;
        }
      }

      // Top 5 点赞话术
      const topLiked = db.prepare(
        `SELECT messageText, COUNT(*) AS count FROM script_feedbacks WHERE createdAt >= ? AND feedbackType = 'like'${storeFilter} GROUP BY messageText ORDER BY count DESC LIMIT 5`
      ).all(...params) as Array<{ messageText: string; count: number }>;

      // Top 5 点踩话术
      const topDisliked = db.prepare(
        `SELECT messageText, COUNT(*) AS count FROM script_feedbacks WHERE createdAt >= ? AND feedbackType = 'dislike'${storeFilter} GROUP BY messageText ORDER BY count DESC LIMIT 5`
      ).all(...params) as Array<{ messageText: string; count: number }>;

      res.json({
        success: true,
        summary: { totalLikes, totalDislikes, globalLikes, globalDislikes, storeLikes, storeDislikes },
        topLiked,
        topDisliked,
      });
    } catch (err) {
      console.error("[admin/stats/feedback-today] 读取失败：", err);
      res.status(500).json({ success: false, error: "反馈统计读取失败" });
    }
  });

  // API 路由：管理员用户列表（只读）
  app.get("/api/admin/users", (req, res) => {
    try {
      const user = resolveSession(req);
      if (!user) { res.status(401).json({ success: false, error: "未登录或登录已过期" }); return; }
      if (user.role !== "super_admin" && user.role !== "store_admin") { res.status(403).json({ success: false, error: "无权访问" }); return; }

      const sql = user.role === "store_admin"
        ? "SELECT userId, username, displayName, role, storeId, enabled FROM users WHERE storeId = ?"
        : "SELECT userId, username, displayName, role, storeId, enabled FROM users";
      const params = user.role === "store_admin" ? [user.storeId] : [];

      const rows = db.prepare(sql).all(...params) as Array<{ userId: string; username: string; displayName: string; role: string; storeId: string; enabled: number }>;

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
      const user = resolveSession(req);
      if (!user) { res.status(401).json({ success: false, error: "未登录或登录已过期" }); return; }
      if (user.role !== "super_admin" && user.role !== "store_admin") { res.status(403).json({ success: false, error: "无权访问" }); return; }

      const sql = user.role === "store_admin"
        ? "SELECT storeId, name FROM stores WHERE storeId = ?"
        : "SELECT storeId, name FROM stores";
      const params = user.role === "store_admin" ? [user.storeId] : [];

      const stores = db.prepare(sql).all(...params) as StoreRecord[];
      res.json({ success: true, stores });
    } catch (err) {
      console.error("[admin/stores] 读取失败：", err);
      res.status(500).json({ success: false, error: "门店列表加载失败" });
    }
  });

  // ========== 统一话术管理接口（仅 super_admin） ==========

  const VALID_SCENARIO_TYPE = ["existing", "new"] as const;

  // GET /api/admin/scripts/global — 统一话术列表（不含 content）
  app.get("/api/admin/scripts/global", (req, res) => {
    try {
      const user = resolveSession(req);
      if (!user || user.role !== "super_admin") {
        res.status(403).json({ success: false, error: "权限不足" });
        return;
      }
      const scripts = db.prepare(
        "SELECT scriptId, name, scenarioType, enabled, createdAt, updatedAt FROM scripts WHERE scope = 'global'"
      ).all();
      res.json({ success: true, scripts });
    } catch (err) {
      console.error("[admin/scripts/global] 列表读取失败：", err);
      res.status(500).json({ success: false, error: "话术列表加载失败" });
    }
  });

  // GET /api/admin/scripts/global/:scriptId — 统一话术详情（含 content）
  app.get("/api/admin/scripts/global/:scriptId", (req, res) => {
    try {
      const user = resolveSession(req);
      if (!user || user.role !== "super_admin") {
        res.status(403).json({ success: false, error: "权限不足" });
        return;
      }
      const script = db.prepare(
        "SELECT scriptId, name, scenarioType, content, enabled, createdAt, updatedAt FROM scripts WHERE scriptId = ? AND scope = 'global'"
      ).get(req.params.scriptId);
      if (!script) {
        res.status(404).json({ success: false, error: "话术不存在" });
        return;
      }
      res.json({ success: true, script });
    } catch (err) {
      console.error("[admin/scripts/global] 详情读取失败：", err);
      res.status(500).json({ success: false, error: "话术详情加载失败" });
    }
  });

  // POST /api/admin/scripts/global — 新增统一话术
  app.post("/api/admin/scripts/global", (req, res) => {
    try {
      const user = resolveSession(req);
      if (!user || user.role !== "super_admin") {
        res.status(403).json({ success: false, error: "权限不足" });
        return;
      }
      const { name, scenarioType, content } = req.body || {};
      const missing: string[] = [];
      if (!name) missing.push("name");
      if (!scenarioType) missing.push("scenarioType");
      if (!content) missing.push("content");
      if (missing.length > 0) {
        res.status(400).json({ success: false, error: `缺少必填字段：${missing.join(", ")}` });
        return;
      }
      if (!VALID_SCENARIO_TYPE.includes(scenarioType)) {
        res.status(400).json({ success: false, error: `scenarioType 不合法，允许值：${VALID_SCENARIO_TYPE.join(", ")}` });
        return;
      }
      const now = new Date().toISOString();
      const scriptId = `scr_${crypto.randomUUID()}`;
      db.prepare(
        "INSERT INTO scripts (scriptId, name, scope, scenarioType, storeId, sourceScriptId, content, enabled, createdAt, updatedAt) VALUES (?, ?, 'global', ?, '', '', ?, 1, ?, ?)"
      ).run(scriptId, name, scenarioType, content, now, now);
      console.log("[admin/scripts/global] 新增成功：", scriptId);
      res.status(201).json({ success: true, scriptId });
    } catch (err) {
      console.error("[admin/scripts/global] 新增失败：", err);
      res.status(500).json({ success: false, error: "话术创建失败" });
    }
  });

  // PUT /api/admin/scripts/global/:scriptId — 更新统一话术
  app.put("/api/admin/scripts/global/:scriptId", (req, res) => {
    try {
      const user = resolveSession(req);
      if (!user || user.role !== "super_admin") {
        res.status(403).json({ success: false, error: "权限不足" });
        return;
      }
      const existing = db.prepare(
        "SELECT scriptId FROM scripts WHERE scriptId = ? AND scope = 'global'"
      ).get(req.params.scriptId);
      if (!existing) {
        res.status(404).json({ success: false, error: "话术不存在" });
        return;
      }
      const { name, scenarioType, content } = req.body || {};
      if (scenarioType && !VALID_SCENARIO_TYPE.includes(scenarioType)) {
        res.status(400).json({ success: false, error: `scenarioType 不合法，允许值：${VALID_SCENARIO_TYPE.join(", ")}` });
        return;
      }
      const updates: string[] = [];
      const params: unknown[] = [];
      if (name !== undefined) { updates.push("name = ?"); params.push(name); }
      if (scenarioType !== undefined) { updates.push("scenarioType = ?"); params.push(scenarioType); }
      if (content !== undefined) { updates.push("content = ?"); params.push(content); }
      if (updates.length === 0) {
        res.status(400).json({ success: false, error: "未提供任何更新字段" });
        return;
      }
      updates.push("updatedAt = ?");
      params.push(new Date().toISOString());
      params.push(req.params.scriptId);
      db.prepare(`UPDATE scripts SET ${updates.join(", ")} WHERE scriptId = ?`).run(...params);
      console.log("[admin/scripts/global] 更新成功：", req.params.scriptId);
      res.json({ success: true });
    } catch (err) {
      console.error("[admin/scripts/global] 更新失败：", err);
      res.status(500).json({ success: false, error: "话术更新失败" });
    }
  });

  // PATCH /api/admin/scripts/global/:scriptId/enabled — 启用/禁用统一话术
  app.patch("/api/admin/scripts/global/:scriptId/enabled", (req, res) => {
    try {
      const user = resolveSession(req);
      if (!user || user.role !== "super_admin") {
        res.status(403).json({ success: false, error: "权限不足" });
        return;
      }
      const existing = db.prepare(
        "SELECT scriptId FROM scripts WHERE scriptId = ? AND scope = 'global'"
      ).get(req.params.scriptId);
      if (!existing) {
        res.status(404).json({ success: false, error: "话术不存在" });
        return;
      }
      const { enabled } = req.body || {};
      if (typeof enabled !== "boolean") {
        res.status(400).json({ success: false, error: "enabled 必须为 true 或 false" });
        return;
      }
      db.prepare("UPDATE scripts SET enabled = ?, updatedAt = ? WHERE scriptId = ?").run(
        enabled ? 1 : 0, new Date().toISOString(), req.params.scriptId
      );
      console.log("[admin/scripts/global] 启用/禁用：", req.params.scriptId, enabled);
      res.json({ success: true });
    } catch (err) {
      console.error("[admin/scripts/global] 启用/禁用失败：", err);
      res.status(500).json({ success: false, error: "操作失败" });
    }
  });

  // ========== 门店自定义话术管理接口（store_admin 本店 / super_admin 全部） ==========

  /** 门店话术接口权限辅助：返回 storeId 或 null（无权限） */
  function resolveStoreScriptAccess(req: express.Request): { user: PublicUser; storeId: string } | null {
    const user = resolveSession(req);
    if (!user) return null;
    if (user.role === "super_admin") return { user, storeId: "" }; // super_admin 不限 storeId
    if (user.role === "store_admin") return { user, storeId: user.storeId };
    return null; // user 角色无权访问管理接口
  }

  // GET /api/admin/scripts/store — 门店自定义话术列表（不含 content）
  app.get("/api/admin/scripts/store", (req, res) => {
    try {
      const access = resolveStoreScriptAccess(req);
      if (!access) {
        res.status(403).json({ success: false, error: "权限不足" });
        return;
      }
      let scripts;
      if (access.user.role === "super_admin") {
        const filterStoreId = req.query.storeId as string | undefined;
        if (filterStoreId) {
          scripts = db.prepare(
            "SELECT scriptId, name, scenarioType, storeId, sourceScriptId, enabled, createdAt, updatedAt FROM scripts WHERE scope = 'store' AND storeId = ?"
          ).all(filterStoreId);
        } else {
          scripts = db.prepare(
            "SELECT scriptId, name, scenarioType, storeId, sourceScriptId, enabled, createdAt, updatedAt FROM scripts WHERE scope = 'store'"
          ).all();
        }
      } else {
        scripts = db.prepare(
          "SELECT scriptId, name, scenarioType, storeId, sourceScriptId, enabled, createdAt, updatedAt FROM scripts WHERE scope = 'store' AND storeId = ?"
        ).all(access.storeId);
      }
      res.json({ success: true, scripts });
    } catch (err) {
      console.error("[admin/scripts/store] 列表读取失败：", err);
      res.status(500).json({ success: false, error: "门店话术列表加载失败" });
    }
  });

  // GET /api/admin/scripts/store/:scriptId — 门店自定义话术详情（含 content）
  app.get("/api/admin/scripts/store/:scriptId", (req, res) => {
    try {
      const access = resolveStoreScriptAccess(req);
      if (!access) {
        res.status(403).json({ success: false, error: "权限不足" });
        return;
      }
      const script = db.prepare(
        "SELECT scriptId, name, scenarioType, storeId, sourceScriptId, content, enabled, createdAt, updatedAt FROM scripts WHERE scriptId = ? AND scope = 'store'"
      ).get(req.params.scriptId) as { storeId: string } | undefined;
      if (!script) {
        res.status(404).json({ success: false, error: "话术不存在" });
        return;
      }
      if (access.user.role === "store_admin" && script.storeId !== access.storeId) {
        res.status(403).json({ success: false, error: "无权访问其他门店话术" });
        return;
      }
      res.json({ success: true, script });
    } catch (err) {
      console.error("[admin/scripts/store] 详情读取失败：", err);
      res.status(500).json({ success: false, error: "门店话术详情加载失败" });
    }
  });

  // POST /api/admin/scripts/store — 基于统一话术创建门店自定义话术
  app.post("/api/admin/scripts/store", (req, res) => {
    try {
      const access = resolveStoreScriptAccess(req);
      if (!access) {
        res.status(403).json({ success: false, error: "权限不足" });
        return;
      }
      const { sourceScriptId, name: customName, storeId: reqStoreId } = req.body || {};
      if (!sourceScriptId) {
        res.status(400).json({ success: false, error: "缺少必填字段：sourceScriptId" });
        return;
      }
      // 查找来源统一话术
      const source = db.prepare(
        "SELECT scriptId, name, scenarioType, content FROM scripts WHERE scriptId = ? AND scope = 'global'"
      ).get(sourceScriptId) as { scriptId: string; name: string; scenarioType: string; content: string } | undefined;
      if (!source) {
        res.status(404).json({ success: false, error: "来源统一话术不存在" });
        return;
      }
      // 确定目标 storeId
      let targetStoreId: string;
      if (access.user.role === "super_admin") {
        targetStoreId = reqStoreId || access.user.storeId || "";
        if (!targetStoreId) {
          res.status(400).json({ success: false, error: "super_admin 需指定 storeId" });
          return;
        }
      } else {
        targetStoreId = access.storeId;
      }
      const now = new Date().toISOString();
      const scriptId = `scr_${crypto.randomUUID()}`;
      const finalName = customName || `门店自定义 - ${source.name}`;
      db.prepare(
        "INSERT INTO scripts (scriptId, name, scope, scenarioType, storeId, sourceScriptId, content, enabled, createdAt, updatedAt) VALUES (?, ?, 'store', ?, ?, ?, ?, 1, ?, ?)"
      ).run(scriptId, finalName, source.scenarioType, targetStoreId, sourceScriptId, source.content, now, now);
      console.log("[admin/scripts/store] 创建成功：", scriptId, "门店：", targetStoreId);
      res.status(201).json({ success: true, scriptId });
    } catch (err) {
      console.error("[admin/scripts/store] 创建失败：", err);
      res.status(500).json({ success: false, error: "门店话术创建失败" });
    }
  });

  // PUT /api/admin/scripts/store/:scriptId — 更新门店自定义话术（仅 name / content）
  app.put("/api/admin/scripts/store/:scriptId", (req, res) => {
    try {
      const access = resolveStoreScriptAccess(req);
      if (!access) {
        res.status(403).json({ success: false, error: "权限不足" });
        return;
      }
      const existing = db.prepare(
        "SELECT scriptId, storeId FROM scripts WHERE scriptId = ? AND scope = 'store'"
      ).get(req.params.scriptId) as { scriptId: string; storeId: string } | undefined;
      if (!existing) {
        res.status(404).json({ success: false, error: "话术不存在" });
        return;
      }
      if (access.user.role === "store_admin" && existing.storeId !== access.storeId) {
        res.status(403).json({ success: false, error: "无权修改其他门店话术" });
        return;
      }
      const { name, content } = req.body || {};
      const updates: string[] = [];
      const params: unknown[] = [];
      if (name !== undefined) { updates.push("name = ?"); params.push(name); }
      if (content !== undefined) { updates.push("content = ?"); params.push(content); }
      if (updates.length === 0) {
        res.status(400).json({ success: false, error: "未提供任何更新字段" });
        return;
      }
      updates.push("updatedAt = ?");
      params.push(new Date().toISOString());
      params.push(req.params.scriptId);
      db.prepare(`UPDATE scripts SET ${updates.join(", ")} WHERE scriptId = ?`).run(...params);
      console.log("[admin/scripts/store] 更新成功：", req.params.scriptId);
      res.json({ success: true });
    } catch (err) {
      console.error("[admin/scripts/store] 更新失败：", err);
      res.status(500).json({ success: false, error: "门店话术更新失败" });
    }
  });

  // PATCH /api/admin/scripts/store/:scriptId/enabled — 启用/禁用门店自定义话术
  app.patch("/api/admin/scripts/store/:scriptId/enabled", (req, res) => {
    try {
      const access = resolveStoreScriptAccess(req);
      if (!access) {
        res.status(403).json({ success: false, error: "权限不足" });
        return;
      }
      const existing = db.prepare(
        "SELECT scriptId, storeId FROM scripts WHERE scriptId = ? AND scope = 'store'"
      ).get(req.params.scriptId) as { scriptId: string; storeId: string } | undefined;
      if (!existing) {
        res.status(404).json({ success: false, error: "话术不存在" });
        return;
      }
      if (access.user.role === "store_admin" && existing.storeId !== access.storeId) {
        res.status(403).json({ success: false, error: "无权操作其他门店话术" });
        return;
      }
      const { enabled } = req.body || {};
      if (typeof enabled !== "boolean") {
        res.status(400).json({ success: false, error: "enabled 必须为 true 或 false" });
        return;
      }
      db.prepare("UPDATE scripts SET enabled = ?, updatedAt = ? WHERE scriptId = ?").run(
        enabled ? 1 : 0, new Date().toISOString(), req.params.scriptId
      );
      console.log("[admin/scripts/store] 启用/禁用：", req.params.scriptId, enabled);
      res.json({ success: true });
    } catch (err) {
      console.error("[admin/scripts/store] 启用/禁用失败：", err);
      res.status(500).json({ success: false, error: "操作失败" });
    }
  });

  // ========== 普通使用者话术接口（所有已登录用户） ==========

  // GET /api/scripts/available — 获取当前用户可用话术列表（不含 content）
  app.get("/api/scripts/available", (req, res) => {
    try {
      const user = resolveSession(req);
      if (!user) {
        res.status(401).json({ success: false, error: "未登录或登录已过期" });
        return;
      }
      // 统一话术
      const globalScripts = db.prepare(
        "SELECT scriptId, name, scenarioType, scope FROM scripts WHERE scope = 'global' AND enabled = 1"
      ).all();
      // 本店自定义话术
      let storeScripts: unknown[] = [];
      if (user.storeId) {
        storeScripts = db.prepare(
          "SELECT scriptId, name, scenarioType, scope FROM scripts WHERE scope = 'store' AND storeId = ? AND enabled = 1"
        ).all(user.storeId);
      }
      const scripts = [...globalScripts, ...storeScripts];
      res.json({ success: true, scripts });
    } catch (err) {
      console.error("[scripts/available] 读取失败：", err);
      res.status(500).json({ success: false, error: "话术列表加载失败" });
    }
  });

  // GET /api/scripts/:scriptId — 获取单个话术完整内容
  app.get("/api/scripts/:scriptId", (req, res) => {
    try {
      const user = resolveSession(req);
      if (!user) {
        res.status(401).json({ success: false, error: "未登录或登录已过期" });
        return;
      }
      const script = db.prepare(
        "SELECT scriptId, name, scenarioType, scope, storeId, content FROM scripts WHERE scriptId = ? AND enabled = 1"
      ).get(req.params.scriptId) as { scriptId: string; name: string; scenarioType: string; scope: string; storeId: string; content: string } | undefined;
      if (!script) {
        res.status(404).json({ success: false, error: "话术不存在或已禁用" });
        return;
      }
      // store 话术仅本店用户可读
      if (script.scope === "store" && user.storeId !== script.storeId) {
        res.status(403).json({ success: false, error: "无权访问其他门店话术" });
        return;
      }
      res.json({
        success: true,
        script: {
          scriptId: script.scriptId,
          name: script.name,
          scenarioType: script.scenarioType,
          scope: script.scope,
          content: script.content,
        },
      });
    } catch (err) {
      console.error("[scripts/:scriptId] 读取失败：", err);
      res.status(500).json({ success: false, error: "话术内容加载失败" });
    }
  });

  // ========== 话术反馈接口（所有已登录用户） ==========

  const VALID_FEEDBACK_TYPE = ["like", "dislike"] as const;

  // POST /api/script-feedbacks — 提交话术反馈（UPSERT）
  app.post("/api/script-feedbacks", (req, res) => {
    try {
      const user = resolveSession(req);
      if (!user) {
        res.status(401).json({ success: false, error: "未登录或登录已过期" });
        return;
      }

      const { conversationId, scriptId, feedbackType, messageIndex, messageText, stepId } = req.body || {};

      // 必填校验
      const missing: string[] = [];
      if (!conversationId) missing.push("conversationId");
      if (!scriptId) missing.push("scriptId");
      if (!feedbackType) missing.push("feedbackType");
      if (messageIndex === undefined || messageIndex === null) missing.push("messageIndex");
      if (missing.length > 0) {
        res.status(400).json({ success: false, error: `缺少必填字段：${missing.join(", ")}` });
        return;
      }

      // feedbackType 校验
      if (!VALID_FEEDBACK_TYPE.includes(feedbackType)) {
        res.status(400).json({ success: false, error: `feedbackType 不合法，允许值：${VALID_FEEDBACK_TYPE.join(", ")}` });
        return;
      }

      // messageIndex 校验
      if (typeof messageIndex !== "number" || messageIndex < 0) {
        res.status(400).json({ success: false, error: "messageIndex 必须为非负整数" });
        return;
      }

      // scriptId 校验 + 查询 scriptSource
      const scriptRow = db.prepare("SELECT scope FROM scripts WHERE scriptId = ?").get(scriptId) as { scope: string } | undefined;
      if (!scriptRow) {
        res.status(400).json({ success: false, error: "scriptId 不存在" });
        return;
      }

      const now = new Date().toISOString();
      const feedbackId = `fb_${crypto.randomUUID()}`;

      // UPSERT: 同一 conversationId + messageIndex 覆盖更新
      db.prepare(`
        INSERT INTO script_feedbacks (feedbackId, conversationId, userId, storeId, scriptId, scriptSource, feedbackType, messageIndex, messageText, stepId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(conversationId, messageIndex) DO UPDATE SET
          feedbackType = excluded.feedbackType,
          messageText = excluded.messageText,
          stepId = excluded.stepId,
          updatedAt = excluded.updatedAt
      `).run(
        feedbackId, conversationId, user.userId, user.storeId,
        scriptId, scriptRow.scope, feedbackType, messageIndex,
        messageText || "", stepId || "", now, now
      );

      console.log("[script-feedbacks] UPSERT：", conversationId, "msg:", messageIndex, feedbackType);
      res.status(201).json({ success: true });
    } catch (err) {
      console.error("[script-feedbacks] 写入失败：", err);
      res.status(500).json({ success: false, error: "反馈记录失败" });
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
