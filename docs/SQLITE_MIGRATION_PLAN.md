# SQLite 最小迁移方案

> 日期：2026-03-25

---

## 1. 本轮目标

**将当前 3 个 JSON 文件（users / stores / call_records）的读写全部迁移到本地 SQLite，保持所有现有 API 路径和返回结构不变，只替换存储层。**

---

## 2. 推荐的最小落地路径

### 保持 API 契约不变，只换存储层

- 所有 API 路径、请求体、返回结构完全不变
- 前端零改动
- 只改 server.ts 中的数据读写函数

### 使用 better-sqlite3

- 理由：同步 API，与当前 `fs.readFileSync` / `fs.writeFileSync` 的同步风格一致
- 无需引入 async/await 改造已有读写函数
- 零配置，Node 原生 C++ 绑定，性能远优于 JSON 文件
- 需要 `npm install better-sqlite3`（唯一新增依赖）
- TypeScript 类型需要 `npm install -D @types/better-sqlite3`

### 数据库文件位置

- `data/app.db`（与现有 JSON 文件同目录）
- `.gitignore` 中已有 `data/`，不会误提交

---

## 3. 最小表设计

### users

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | TEXT PRIMARY KEY | 唯一标识 |
| username | TEXT UNIQUE NOT NULL | 登录用户名 |
| password | TEXT NOT NULL | scrypt 哈希（salt:hash） |
| displayName | TEXT NOT NULL | 显示名称 |
| role | TEXT NOT NULL | `super_admin` 或 `user` |
| storeId | TEXT | 所属门店（管理员可为空） |
| enabled | INTEGER NOT NULL DEFAULT 1 | 是否启用（0/1） |

### stores

| 字段 | 类型 | 说明 |
|------|------|------|
| storeId | TEXT PRIMARY KEY | 唯一标识 |
| name | TEXT NOT NULL | 门店名称 |

### call_records

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PRIMARY KEY | 记录 ID（rec_uuid） |
| userId | TEXT NOT NULL | 操作用户 |
| storeId | TEXT NOT NULL | 所属门店 |
| status | TEXT NOT NULL | not_connected / no_intent / has_intent |
| scenarioType | TEXT NOT NULL | existing / new |
| callDate | TEXT NOT NULL | 日期（YYYY-MM-DD） |
| createdAt | TEXT NOT NULL | ISO 时间戳 |

---

## 4. 当前 JSON 到 SQLite 的映射关系

### users.json → users 表

| JSON 字段 | 表字段 | 说明 |
|-----------|--------|------|
| userId | userId | 直接迁移 |
| username | username | 直接迁移 |
| password | password | 直接迁移（已是 salt:hash 格式） |
| displayName | displayName | 直接迁移 |
| role | role | 直接迁移 |
| storeId | storeId | 直接迁移 |
| enabled | enabled | `true` → `1`，`false` → `0` |

### stores.json → stores 表

| JSON 字段 | 表字段 | 说明 |
|-----------|--------|------|
| storeId | storeId | 直接迁移 |
| name | name | 直接迁移 |

### call_records.json → call_records 表

| JSON 字段 | 表字段 | 说明 |
|-----------|--------|------|
| id | id | 直接迁移 |
| userId | userId | 直接迁移 |
| storeId | storeId | 直接迁移 |
| status | status | 直接迁移 |
| scenarioType | scenarioType | 直接迁移 |
| callDate | callDate | 直接迁移 |
| createdAt | createdAt | 直接迁移 |

注意事项：
- users 表的 `enabled` 需从 boolean 转为 integer（0/1）
- 其余字段全部为字符串，可直接迁移

---

## 5. 最小后端改造点

### server.ts 改造清单

1. **新增：初始化 SQLite 连接和建表**
   - 启动时打开 `data/app.db`
   - 如果表不存在则创建

2. **替换：readUsers()**
   - 从 `SELECT * FROM users` 读取
   - `enabled` 字段从 0/1 转回 boolean

3. **替换：readStores()**
   - 从 `SELECT * FROM stores` 读取

4. **替换：readRecords()**
   - 从 `SELECT * FROM call_records` 读取

5. **替换：appendRecord()**
   - 改为 `INSERT INTO call_records`

6. **替换：今日统计查询**
   - 从 `SELECT ... WHERE callDate = ?` 读取
   - 汇总可直接用 SQL 聚合

7. **移除：ensureDataFile()**
   - 不再需要 JSON 文件初始化逻辑

### 不需要改的部分

- 认证接口（login / me / logout）的逻辑不变，只是底层 readUsers 换了
- session Map 保持内存方式不变
- 密码校验逻辑不变
- 所有 API 返回结构不变

---

## 6. 数据初始化与迁移建议

### 推荐方式：启动时自动初始化

- server.ts 启动时检查 SQLite 表是否为空
- 如果 users 表为空，且 `data/users.json` 存在，则一次性导入
- stores 和 call_records 同理
- 导入完成后 JSON 文件可保留不删除（作为备份）

### 具体流程

1. 启动 → 打开 `data/app.db`
2. `CREATE TABLE IF NOT EXISTS ...`（建表）
3. 检查 `SELECT COUNT(*) FROM users`
4. 如果为 0 且 `users.json` 存在 → 批量 INSERT
5. stores 和 call_records 同理
6. 后续正常运行

### 好处

- 零手动操作
- 首次启动自动迁移
- 后续启动跳过导入

---

## 7. 明确暂不做的内容

| 暂不做 | 原因 |
|--------|------|
| ORM（Prisma / Drizzle / Sequelize） | 增加复杂度，当前 3 张表用原生 SQL 足够 |
| 复杂索引 | 数据量极小，不需要 |
| 分页查询 | 本阶段不需要 |
| 外键约束 | 保持简单，应用层已有校验 |
| 数据迁移脚本 | 启动时自动处理即可 |
| 多数据库支持 | 只用 SQLite |
| 查询性能优化 | 数据量不构成瓶颈 |
| 删除原 JSON 文件 | 保留作为备份 |

---

## 8. 建议的最小编码顺序

1. **安装 better-sqlite3 和 @types/better-sqlite3** — 唯一新增依赖
2. **在 server.ts 中新增 SQLite 初始化模块** — 建表 + 自动导入 JSON 种子数据
3. **替换 readUsers / readStores / readRecords / appendRecord** — 从文件读写改为 SQL 读写
4. **替换今日统计查询** — 可选用 SQL 聚合简化
5. **端到端验收** — 登录 → 写入 → 统计 → 确认数据在 SQLite 中
6. **可选：清理 ensureDataFile 等 JSON 遗留代码**
