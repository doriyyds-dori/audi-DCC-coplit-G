# 在线化迁移分析报告

> 更新时间：2026-03-24

---

## 一、当前项目理解

### 技术架构

```
index.html                       ← SPA 入口
  └─ src/main.tsx                ← React 渲染入口
      └─ src/App.tsx (83 行)     ← 纯组合层，无业务逻辑
          ├─ useScriptManager    ← 话术数据管理（CRUD/CSV/FAQ搜索/下载）
          ├─ useCallSimulation   ← 通话模拟引擎（历史/步骤/全局选项）
          ├─ HeaderToolbar       ← 顶部工具栏（场景切换/上传/下载/重置）
          ├─ ChatPanel           ← 对话面板（消息列表/回复按钮/空状态）
          ├─ FaqPanel            ← FAQ 三级手风琴菜单
          ├─ CurrentStepInfo     ← 当前阶段提示卡片
          └─ HelpModal           ← 使用说明弹窗

server.ts                        ← Express 开发服务器（仅 1 个 API: /api/download-offline）
vite.config.ts                   ← Vite 构建（含 viteSingleFile 插件）
```

### 数据流

```
┌───────────────────────────────────────────────────────┐
│                    数据来源                             │
│  constants.ts      → 保有潜客默认话术 (148行)           │
│  defaultFaqData.ts → FAQ 默认话术库 (170行/38KB)        │
│  faqData.ts        → FAQ 菜单结构 (91行)               │
│  CSV 上传          → 用户自定义话术                     │
└───────────────┬───────────────────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────────────────┐
│              useScriptManager (Hook)                   │
│  ┌────────────────┬────────────────┬─────────────┐    │
│  │ existingScript  │ newScript      │ commonFaq   │    │
│  │ (保有潜客)      │ (首次邀约)     │ (FAQ库)     │    │
│  └───────┬────────┴───────┬────────┴──────┬──────┘    │
│          │                │               │           │
│          ▼                ▼               ▼           │
│      localStorage (safeParse/safeStringify + 版本控制)  │
└───────────────┬───────────────────────────────────────┘
                │ script (当前活跃话术)
                ▼
┌───────────────────────────────────────────────────────┐
│             useCallSimulation (Hook)                   │
│  history[] ← startCall / handleCustomerResponse       │
│  currentStep ← script.find(id === currentStepId)      │
│  globalOptions ← script.find(id === '全局问题')        │
└───────────────────────────────────────────────────────┘
```

### 类型体系

| 类型 | 用途 | 字段 |
|------|------|------|
| `ScriptStep` | 话术步骤 | id, phase, agentScript, customerOptions, coreLogic |
| `ScriptOption` | 客户选项 | label, agentResponse, nextStepId |
| `MenuItem` | FAQ菜单项 | id, label, children?, buttons? |
| `CsvRow` | CSV行数据 | Phase, StepId, CoreLogic, AgentScript, CustomerOption, AgentResponse, NextStepId |
| `CustomerType` | 客户场景 | `'existing' \| 'new'` |
| `ChatMessage` | 对话消息 | role (`'agent' \| 'customer'`), text |

---

## 二、离线版功能边界

### ✅ 能做到的

| 功能 | 实现方式 |
|------|---------|
| 通话流程模拟 | 纯前端状态机（`useCallSimulation`） |
| FAQ 三级查询 | 前端菜单 + 精确/模糊匹配（`useScriptManager.handleFaqClick`） |
| CSV 话术上传 | PapaParse 前端解析 + 列名校验 |
| 数据持久化 | localStorage + 版本控制（`storage.ts`） |
| 离线分发 | `vite-plugin-singlefile` 打包为单 HTML |
| 场景切换 | 保有潜客/首次邀约 两套 ScriptStep[] |

### ❌ 做不到的

| 功能 | 原因 |
|------|------|
| 用户认证 | `file://` 下无后端，账号只能写死在代码中 |
| 管理后台 | 改配置需重新打包分发 |
| 通话数据采集 | 只有 localStorage，关闭即丢 |
| 自动邮件 | 浏览器禁止 `file://` 下发送 SMTP |
| 跨设备数据同步 | 无服务端 |

---

## 三、模块复用分析

### 🟢 可直接复用（无需修改或仅微调）

| 模块 | 文件 | 说明 |
|------|------|------|
| **通话模拟引擎** | `useCallSimulation.ts` | 纯前端状态逻辑，与数据来源解耦，**零改动复用** |
| **对话面板** | `ChatPanel.tsx` | 纯 UI 组件，**零改动复用** |
| **FAQ 面板** | `FaqPanel.tsx` | 纯 UI 组件，**零改动复用** |
| **当前阶段** | `CurrentStepInfo.tsx` | 纯 UI 组件，**零改动复用** |
| **帮助弹窗** | `HelpModal.tsx` | 纯 UI 组件，**零改动复用** |
| **工具函数** | `utils.ts` | cn() 工具，**零改动复用** |
| **类型定义** | `types.ts` | 扩展新增字段即可（如 userId），**基础复用** |
| **FAQ 菜单结构** | `faqData.ts` | 纯数据，**零改动复用** |
| **默认话术** | `constants.ts`, `defaultFaqData.ts` | 纯数据，可作为初始种子，**零改动复用** |
| **CSV 解析逻辑** | `useScriptManager.ts` 中的 `handleFileUpload` | 提取为独立函数即可复用 |
| **FAQ 搜索逻辑** | `useScriptManager.ts` 中的 `handleFaqClick` | 同上 |
| **单元测试** | `__tests__/` | 测试基础可复用，需补充新模块测试 |

### 🟡 需要改造

| 模块 | 文件 | 改造点 |
|------|------|--------|
| **顶部工具栏** | `HeaderToolbar.tsx` | 新增：用户信息显示、登出按钮 |
| **组合层** | `App.tsx` | 新增：路由（登录页/主页/管理后台）、认证上下文 |
| **数据管理** | `useScriptManager.ts` | 数据源从 localStorage 改为 API 调用 |
| **持久化** | `storage.ts` | 在线模式下降级为缓存层，主存储转为后端 |

### 🔴 需要移除或替换

| 模块 | 说明 |
|------|------|
| `vite-plugin-singlefile` | 在线版不需要打包为单文件 |
| `server.ts` (当前版) | 需要替换为完整后端或云函数 |

---

## 四、在线化必须新增的模块

### 后端（云函数 / API）

| 模块 | 功能 | 技术方案 |
|------|------|---------|
| **用户认证 API** | 登录/登出/Token 校验 | JWT + bcrypt |
| **用户管理 API** | CRUD 用户、门店映射 | REST API |
| **通话记录 API** | 写入/查询通话记录 | POST /api/call-records |
| **统计查询 API** | 按用户/日期/门店汇总 | GET /api/stats |
| **定时邮件任务** | 每日生成 Excel 并发邮件 | 云函数定时触发器 + SheetJS + Nodemailer |
| **数据库** | 用户表/门店表/通话记录表 | SQLite / 云数据库 |

### 前端新增

| 模块 | 功能 |
|------|------|
| **登录页** | 用户名密码输入 + Token 管理 |
| **通话状态弹窗** | 通话结束后选择：未接通/无意向/有意向 |
| **管理后台页面** | 用户 CRUD、统计看板、话术管理 |
| **认证上下文** | `AuthContext` + `ProtectedRoute` |
| **API 调用层** | `api.ts`（封装 fetch + Token 注入 + 错误处理） |

---

## 五、分阶段迁移方案

> 原则：**小步快跑、每步可验收**。每个阶段结束后有明确的可测试交付物。

### Stage 1：项目改造 + 登录页（预计 1-2 天）

**目标**：在线版能访问，有登录页，登录后看到与离线版一致的话术助手界面。

```
交付物：
├─ 前端
│   ├─ 路由：/login → /app
│   ├─ LoginPage 组件
│   ├─ AuthContext（Token 管理）
│   └─ HeaderToolbar 显示用户名 + 登出
├─ 后端
│   ├─ POST /api/auth/login（JWT）
│   └─ 用户数据文件（JSON，初始 3-5 个测试账号）
└─ 验收标准
    ✅ 打开网址 → 跳转登录页
    ✅ 输入正确账号 → 进入话术助手
    ✅ 刷新不丢登录态
    ✅ 话术模拟功能与离线版完全一致
```

---

### Stage 2：通话状态 + 记录上报（预计 1-2 天）

**目标**：每次通话结束后选择状态，记录自动上报到后端。

```
交付物：
├─ 前端
│   ├─ CallStatusModal（未接通/无意向/有意向）
│   ├─ 通话结束时弹出，选择后才关闭
│   └─ POST /api/call-records 上报
├─ 后端
│   ├─ POST /api/call-records（写入数据库）
│   ├─ 数据库表：call_records
│   │   ├─ id, userId, date, status, startTime, endTime
│   │   └─ stepsCount（本次通话经历的步数）
│   └─ GET /api/call-records?userId=&date=（查询）
└─ 验收标准
    ✅ 通话走完流程 → 弹出状态选择
    ✅ 不选状态 → 无法关闭弹窗
    ✅ 选择后 → 数据写入后端
    ✅ 数据库可查到记录
```

---

### Stage 3：管理后台 — 用户管理（预计 1-2 天）

**目标**：管理员可在后台增删改查用户，用户映射到门店。

```
交付物：
├─ 前端（/admin 路由，仅管理员可访问）
│   ├─ 用户列表（含门店、状态）
│   ├─ 新增/编辑/禁用用户
│   └─ 门店管理
├─ 后端
│   ├─ CRUD /api/users
│   ├─ CRUD /api/stores
│   ├─ 数据库表：users, stores
│   │   ├─ users: id, username, password_hash, storeId, role, enabled
│   │   └─ stores: id, name, region
│   └─ 角色鉴权中间件（admin / user）
└─ 验收标准
    ✅ 管理员登录后可切换到管理页面
    ✅ 新增用户 → 该用户可正常登录
    ✅ 禁用用户 → 该用户无法登录
    ✅ 普通用户无法访问管理页面
```

---

### Stage 4：管理后台 — 统计看板（预计 1 天）

**目标**：管理员可查看每人每天的通话统计。

```
交付物：
├─ 前端
│   ├─ 统计看板页面
│   │   ├─ 日期选择器
│   │   ├─ 按门店/用户筛选
│   │   └─ 表格：用户名 | 门店 | 总通话 | 未接通 | 无意向 | 有意向
│   └─ 手动导出 Excel 按钮（备用）
├─ 后端
│   └─ GET /api/stats（聚合查询）
└─ 验收标准
    ✅ 选择日期 → 显示当日统计
    ✅ 数据与实际通话记录一致
    ✅ Excel 导出正常
```

---

### Stage 5：自动邮件回传（预计 1 天）

**目标**：每天自动生成 Excel 发送到指定邮箱。

```
交付物：
├─ 后端
│   ├─ 定时任务（每天 20:00 触发）
│   ├─ 生成 Excel（SheetJS）
│   │   ├─ 文件名：{用户名}{YYYYMMDD}.xlsx
│   │   └─ 内容：当日该用户的通话记录明细
│   ├─ SMTP 发送（Nodemailer + QQ企业邮箱）
│   └─ 发送日志记录
└─ 验收标准
    ✅ 每天 20:00 后指定邮箱收到邮件
    ✅ Excel 文件名格式正确
    ✅ 内容与统计看板数据一致
    ✅ 发送失败有重试和告警
```

---

### Stage 6：部署上线（预计 0.5 天）

**目标**：部署到腾讯云 CloudBase，分发给 400 名用户。

```
交付物：
├─ 部署
│   ├─ 前端静态托管（CloudBase）
│   ├─ 后端云函数（CloudBase）
│   ├─ 云数据库
│   └─ 域名配置（可选）
├─ 分发
│   ├─ 批量创建 400 个用户账号
│   └─ 分发访问链接
└─ 验收标准
    ✅ 全国各地可正常访问
    ✅ 400 人同时使用无卡顿
    ✅ 监控免费额度使用情况
```

---

## 附：代码量估算

| 阶段 | 新增前端代码 | 新增后端代码 | 总计 |
|------|------------|------------|------|
| Stage 1 | ~300 行 | ~150 行 | ~450 行 |
| Stage 2 | ~150 行 | ~100 行 | ~250 行 |
| Stage 3 | ~400 行 | ~200 行 | ~600 行 |
| Stage 4 | ~200 行 | ~50 行 | ~250 行 |
| Stage 5 | 0 | ~150 行 | ~150 行 |
| Stage 6 | 配置为主 | 配置为主 | ~50 行 |
| **合计** | **~1,050 行** | **~650 行** | **~1,750 行** |

> 现有可直接复用的代码：**~900 行**（占当前全部前端代码的 **92%**）
