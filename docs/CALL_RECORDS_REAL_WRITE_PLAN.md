# 智慧外呼助手 call_records 真实写入最小实现方案

> 日期：2026-03-25

---

## 1. 本阶段目标

**将通话状态弹窗选择后的 console.log 替换为真实的后端写入，确保每次完整通话的记录持久化到服务端，不因用户关闭浏览器而丢失。**

---

## 2. 推荐的最小落地路径

**复用现有 `server.ts`，在其中新增一个 API 端点。**

理由：
- 当前项目已有 `server.ts`（Express + Vite 中间件），具备完整的 HTTP 服务能力
- 该文件已存在一个 API 端点（`/api/download-offline`），追加一个端点改动最小
- 第一阶段不需要独立后端服务或云函数，一个文件搞定
- 数据存储采用本地 JSON 文件，不引入数据库依赖，后续可平滑迁移到 SQLite 或云数据库

---

## 3. 最小接口契约

### 接口：写入通话记录

| 项目 | 内容 |
|------|------|
| 路径 | `POST /api/call-records` |
| Content-Type | `application/json` |

### 请求体字段

| 字段 | 类型 | 必填 | 含义 | 由谁提供 |
|------|------|------|------|---------|
| userId | string | 是 | 操作用户 ID | 前端（从 AuthContext 获取） |
| storeId | string | 是 | 用户所属门店 ID | 前端（从 AuthContext 获取） |
| status | string | 是 | 通话结果：`not_connected` / `no_intent` / `has_intent` | 前端（弹窗选择） |
| scenarioType | string | 是 | 使用场景：`existing` / `new` | 前端（当前 customerType） |

### 后端自动生成的字段（不由前端传）

| 字段 | 含义 |
|------|------|
| id | 记录唯一标识（UUID 或自增） |
| callDate | 通话日期（服务端当日日期，避免前端时区偏差） |
| createdAt | 精确创建时间戳（服务端时间） |

### 成功返回

```
HTTP 201
{ "success": true, "id": "rec_xxx" }
```

### 失败返回

```
HTTP 400 / 500
{ "success": false, "error": "错误描述" }
```

---

## 4. 前端最小改造点

仅需修改 **`src/pages/AppPage.tsx`** 中的 `handleStatusSelect` 函数：

| 当前行为 | 改为 |
|---------|------|
| `console.log('[AppPage] 通话记录（模拟）：', record)` | `fetch('/api/call-records', { method: 'POST', body: JSON.stringify(payload) })` |

改动要点：
1. 将 `console.log` 替换为 `fetch` POST 请求
2. 请求体包含 `userId`、`storeId`、`status`、`scenarioType` 四个字段
3. 请求成功后再执行 `resetCall()` + 关闭弹窗
4. 请求失败时提示用户"记录保存失败，请重试"，不重置对话
5. 不需要改 ChatPanel、CallStatusModal 或其他组件

---

## 5. 后端最小改造点

仅需在 **`server.ts`** 中新增以下能力：

1. **添加 JSON 解析中间件**：`app.use(express.json())`（放在 API 路由之前）
2. **新增 POST /api/call-records 端点**：
   - 校验必填字段（userId、storeId、status、scenarioType）
   - 校验 status 枚举值合法性
   - 生成 id（UUID）、callDate（当日）、createdAt（当前时间）
   - 将完整记录追加写入本地 JSON 文件（如 `data/call_records.json`）
   - 返回 `{ success: true, id }` 或错误信息
3. **确保 data 目录存在**：首次写入前自动创建

不需要：认证中间件（第一阶段信任前端传的 userId）、分页查询、聚合统计。

---

## 6. 数据落库最小要求

### 每条记录完整字段

| 字段 | 来源 | 说明 |
|------|------|------|
| id | 后端生成 | 避免前端伪造 |
| userId | 前端传 | 操作者 |
| storeId | 前端传 | 门店归属 |
| status | 前端传 | 通话结果枚举 |
| scenarioType | 前端传 | 保有潜客/首次邀约 |
| callDate | 后端生成 | 服务端日期，避免时区问题 |
| createdAt | 后端生成 | 精确时间戳 |

### 存储方式

- 第一阶段使用本地 JSON 文件（`data/call_records.json`）
- 文件内容为 JSON 数组，每条记录一个对象
- 后续迁移到 SQLite 或云数据库时，只需替换读写层

---

## 7. 错误处理最小要求

| 错误场景 | 处理方式 |
|---------|---------|
| 请求体缺少必填字段 | 返回 400 + 明确错误信息 |
| status 值不在枚举范围内 | 返回 400 + 明确错误信息 |
| JSON 文件写入失败 | 返回 500 + "服务端写入失败" |
| 前端 fetch 网络异常 | 前端 catch 后提示"网络异常，请重试"，不重置对话 |
| 前端 fetch 返回非 201 | 前端提示错误信息，不重置对话 |

不做：重试队列、离线缓存、请求去重、幂等性校验。

---

## 8. 明确暂不做的内容

| 暂不做 | 原因 |
|--------|------|
| Token 认证校验 | 第一阶段信任前端传的 userId，后续再加中间件 |
| 批量写入 | 每次通话单独写入即可 |
| 查询/分页/聚合接口 | 管理后台统计另做，本次只做写入 |
| 数据库（SQLite/MySQL） | JSON 文件足够第一阶段使用 |
| 请求去重/幂等性 | 第一阶段通话频率低，重复风险极小 |
| 复杂日志系统 | 控制台 log 即可 |
| 前端 loading 状态 | 写入极快，暂不需要 |

---

## 9. 下一步最小编码顺序

1. **server.ts 添加 `express.json()` 中间件** — 所有 POST 接口的前提
2. **server.ts 新增 `POST /api/call-records` 端点** — 接收、校验、生成字段、写入 JSON 文件、返回结果
3. **AppPage.tsx 替换 console.log 为 fetch 调用** — 成功后重置对话，失败后提示用户
4. **手动验证写入** — 登录 → 模拟通话 → 选择状态 → 检查 `data/call_records.json` 文件内容
5. **补充 `.gitignore` 忽略 `data/` 目录** — 避免数据文件被提交
