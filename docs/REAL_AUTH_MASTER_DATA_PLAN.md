# 真实身份与主数据最小实现方案

> 日期：2026-03-25

---

## 1. 本轮目标

**将前端硬编码测试账号替换为后端校验的真实用户体系，使 API 不再信任前端直接传 userId/storeId，从根源消除身份伪造风险。**

---

## 2. 推荐的最小落地路径

### users / stores 先用本地 JSON 文件

理由：
- 当前 call_records 已证明 JSON 文件方案在第一阶段可用
- 避免同时引入数据库，保持改动范围最小
- 后续升级 SQLite 时只替换读写层，不影响接口契约
- 文件路径：`data/users.json`、`data/stores.json`

### 登录由 server.ts 提供接口

理由：
- server.ts 已是唯一后端入口，新增登录接口改动最小
- 前端 AuthContext.login 从本地比对改为 fetch 请求后端
- 后端校验用户名密码，返回用户信息 + session token

### 使用最小 token 机制（不上 JWT）

理由：
- JWT 需要引入签名、过期、刷新等复杂度
- 第一阶段用后端内存 Map 存 session 即可（服务重启即失效，可接受）
- 前端将 token 存入 localStorage，后续请求通过 Authorization header 携带
- 后端通过 token 查 session 获取真实 userId / storeId，不再依赖前端传入

---

## 3. 最小数据对象

### users

为什么需要：登录校验和身份绑定的数据源。

| 字段 | 类型 | 说明 |
|------|------|------|
| userId | string | 唯一标识 |
| username | string | 登录用户名 |
| password | string | 密码（第一阶段明文；后续加 bcrypt） |
| displayName | string | 显示名称 |
| role | string | `super_admin` 或 `user` |
| storeId | string | 所属门店 ID（管理员可为空） |
| enabled | boolean | 是否启用 |

### stores

为什么需要：用户关联门店，通话记录按门店归属。

| 字段 | 类型 | 说明 |
|------|------|------|
| storeId | string | 唯一标识 |
| name | string | 门店名称 |

### sessions（后端内存 Map，不落文件）

为什么需要：将 token 映射到真实用户身份，API 不再信任前端传 userId。

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | 随机生成的 session token |
| userId | string | 关联的用户 ID |
| createdAt | string | 创建时间（可选，用于调试） |

---

## 4. 最小接口建议

### POST /api/auth/login — 登录

| 项目 | 内容 |
|------|------|
| 请求体 | `{ username, password }` |
| 校验 | 从 `data/users.json` 查找匹配用户，验证密码和 enabled 状态 |
| 成功 | 生成 session token，存入内存 Map，返回 `{ success: true, token, user: { userId, username, displayName, role, storeId } }` |
| 失败 | 返回 `{ success: false, error: "用户名或密码错误" }` |

### GET /api/auth/me — 获取当前登录用户

| 项目 | 内容 |
|------|------|
| 请求头 | `Authorization: Bearer <token>` |
| 校验 | 从 session Map 中查找 token，返回对应用户信息 |
| 成功 | 返回 `{ success: true, user: { ... } }` |
| 失败 | 返回 401 `{ success: false, error: "未登录或登录已过期" }` |

### POST /api/auth/logout — 登出

| 项目 | 内容 |
|------|------|
| 请求头 | `Authorization: Bearer <token>` |
| 行为 | 删除 session Map 中对应 token |
| 返回 | `{ success: true }` |

### POST /api/call-records — 改造

| 改造点 | 说明 |
|--------|------|
| 不再接收前端传的 userId / storeId | 从 session 中获取 |
| 请求体简化 | 只需传 `{ status, scenarioType }` |
| 新增 | 利用 Authorization header 校验身份 |

### GET /api/admin/stats/today — 改造

| 改造点 | 说明 |
|--------|------|
| 新增 | 可选：校验请求者角色为 super_admin |

---

## 5. 前端最小改造点

### LoginPage
- `handleSubmit` 改为 `fetch('/api/auth/login', ...)`
- 登录成功后将 token 存入 localStorage
- 不再在前端比对密码

### AuthContext
- 移除 `TEST_ACCOUNTS` 硬编码数组
- `login()` 改为 async，内部调用 `/api/auth/login`
- 启动时从 localStorage 取 token，调用 `/api/auth/me` 恢复登录态
- `logout()` 增加 fetch `/api/auth/logout`
- 新增 `getToken()` 方法或在 fetch 时自动携带 Authorization header

### AppPage 通话记录提交
- `handleStatusSelect` 中的 fetch 请求：
  - 移除 body 中的 `userId`、`storeId`
  - 增加 `Authorization: Bearer <token>` header
  - 只传 `{ status, scenarioType }`

---

## 6. 后端最小改造点

在 `server.ts` 中新增以下能力：

1. **启动时加载 `data/users.json` 和 `data/stores.json`**
2. **内存 session Map**：`Map<string, { userId: string; createdAt: string }>`
3. **新增 3 个认证接口**：`/api/auth/login`、`/api/auth/me`、`/api/auth/logout`
4. **提取一个最小的 `resolveSession` 辅助函数**：从 Authorization header 解析 token → 查 session → 查用户 → 返回 AuthUser 或 null
5. **改造 `POST /api/call-records`**：不再从 body 取 userId/storeId，改为从 session 中获取
6. **可选改造 `GET /api/admin/stats/today`**：校验请求者是否为 super_admin

---

## 7. 明确暂不做的内容

| 暂不做 | 原因 |
|--------|------|
| 数据库升级（SQLite/MySQL） | 下一轮 P1 再做 |
| 密码加密（bcrypt） | 第一阶段明文足够，升级数据库时一起做 |
| 复杂权限中间件 | 一个 resolveSession 函数够用 |
| 用户管理 CRUD 接口 | P2 范围 |
| 门店管理 CRUD 接口 | P2 范围 |
| 统计增强 | P3 范围 |
| Token 自动过期与刷新 | 服务重启即失效，第一阶段可接受 |
| 注册 / 找回密码 | 不在第一阶段范围 |

---

## 8. 建议的最小编码顺序

1. **准备 `data/users.json` 和 `data/stores.json` 种子数据** — 将现有硬编码测试账号迁移为 JSON 文件
2. **server.ts 新增认证 3 接口**（login / me / logout）+ session Map + resolveSession 辅助函数
3. **改造 `POST /api/call-records`** — 不再接收前端传的 userId/storeId，从 session 获取
4. **改造前端 `AuthContext`** — login/logout/恢复登录态全部走后端
5. **改造前端 `AppPage` 通话记录提交** — 去掉 body 中的 userId/storeId，加 Authorization header
6. **端到端验收** — 登录 → 通话 → 记录写入 → 确认 userId/storeId 来自后端 session
