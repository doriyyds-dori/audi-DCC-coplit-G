# 智慧外呼助手 (Smart Call Invite Assistant)

一线销售人员的邀约话术辅助工具。支持模拟通话练习、话术查阅、通话结果记录和管理后台统计。

---

## 功能概览

### 话术助手（普通用户）
- **通话模拟**：按流程引导销售对话，点选客户反馈查看应对话术
- **场景切换**：支持"保有潜客"和"首次邀约"两种场景
- **常见问题速查**：FAQ 面板快速检索常见客户问题和应答
- **话术上传**：通过 CSV 上传自定义流程话术和常见话术
- **通话记录**：点击"结束并记录通话"选择通话结果（未接通/无意向/有意向），真实写入后端
- **离线版下载**：可导出完整离线 HTML 单文件

### 管理后台（超级管理员）
- **今日统计**：查看各用户通话数据汇总
- **用户管理**：查看系统用户列表
- **门店管理**：查看门店列表

> 管理后台当前为静态占位数据，真实数据将在后端完善后接入。

---

## 技术栈

| 层 | 技术 |
|---|------|
| 前端框架 | React 19 + TypeScript |
| 路由 | react-router-dom v7 |
| 样式 | TailwindCSS v4 |
| 图标 | lucide-react |
| 构建 | Vite 6 |
| 后端 | Express（复用 server.ts） |
| 数据存储 | 本地 JSON 文件（第一阶段） |

---

## 快速开始

### 前置条件

- Node.js >= 18

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

启动后访问 **http://localhost:3000**

### 测试账号

| 角色 | 用户名 | 密码 | 登录后跳转 |
|------|--------|------|-----------|
| 超级管理员 | `admin` | `admin123` | `/admin` |
| 普通用户 | `user1` | `user123` | `/app` |
| 普通用户 | `user2` | `user123` | `/app` |

> 当前为前端硬编码测试账号，后续将接入后端认证。

---

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（Express + Vite HMR） |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | TypeScript 类型检查 |
| `npm run test` | 运行测试（Vitest） |
| `npm run clean` | 清理 dist 目录 |

---

## 项目结构

```
├── server.ts                   # Express 服务端（API + Vite 中间件）
├── package.json
├── vite.config.ts
├── data/
│   └── call_records.json       # 通话记录存储文件（运行时生成）
├── src/
│   ├── main.tsx                # 应用入口（BrowserRouter + AuthProvider）
│   ├── App.tsx                 # 路由分发
│   ├── auth/
│   │   ├── AuthContext.tsx     # 认证上下文（登录/登出/用户状态）
│   │   └── ProtectedRoute.tsx  # 路由守卫
│   ├── pages/
│   │   ├── LoginPage.tsx       # 登录页
│   │   ├── AppPage.tsx         # 话术助手主页
│   │   ├── AdminLayout.tsx     # 管理后台布局
│   │   ├── AdminStats.tsx      # 今日统计（占位）
│   │   ├── AdminUsers.tsx      # 用户管理（占位）
│   │   └── AdminStores.tsx     # 门店管理（占位）
│   ├── ChatPanel.tsx           # 通话模拟面板
│   ├── CallStatusModal.tsx     # 通话状态选择弹窗
│   ├── HeaderToolbar.tsx       # 顶部工具栏
│   ├── FaqPanel.tsx            # FAQ 速查面板
│   ├── CurrentStepInfo.tsx     # 当前步骤信息
│   ├── HelpModal.tsx           # 使用说明弹窗
│   ├── useCallSimulation.ts    # 通话模拟状态管理
│   ├── useScriptManager.ts     # 话术数据管理
│   ├── storage.ts              # localStorage 封装
│   ├── types.ts                # TypeScript 类型定义
│   └── utils.ts                # 工具函数
└── docs/                       # 设计文档
    ├── PROJECT_CONTEXT.md
    ├── PROJECT_AUDIT.md
    ├── ONLINE_MVP_SCOPE.md
    ├── ROLE_PERMISSION_SCOPE.md
    ├── DATA_MODEL_MVP.md
    ├── LOGIN_HOME_FLOW_PLAN.md
    ├── FRONTEND_IMPLEMENTATION_TODO.md
    └── CALL_RECORDS_REAL_WRITE_PLAN.md
```

---

## 路由说明

| 路由 | 访问条件 | 说明 |
|------|---------|------|
| `/login` | 公开 | 登录页 |
| `/app` | 登录后 | 话术助手主页 |
| `/admin` | 超级管理员 | 管理后台 - 今日统计 |
| `/admin/users` | 超级管理员 | 管理后台 - 用户管理 |
| `/admin/stores` | 超级管理员 | 管理后台 - 门店管理 |
| `/` | — | 按登录态和角色重定向 |

---

## API 接口

### POST /api/call-records

写入一条通话记录。

**请求体：**
```json
{
  "userId": "u_user_001",
  "storeId": "store_001",
  "status": "has_intent",
  "scenarioType": "existing"
}
```

- `status` 允许值：`not_connected` / `no_intent` / `has_intent`
- `scenarioType` 允许值：`existing` / `new`

**成功响应（201）：**
```json
{ "success": true, "id": "rec_xxx" }
```

**失败响应（400/500）：**
```json
{ "success": false, "error": "错误描述" }
```

### GET /api/download-offline

下载离线版 HTML 文件（需先执行 `npm run build`）。

---

## 设计文档

项目设计文档位于 `docs/` 目录，记录了从离线版到在线版的完整迁移规划：

| 文档 | 内容 |
|------|------|
| `PROJECT_CONTEXT.md` | 项目架构与迁移分析 |
| `PROJECT_AUDIT.md` | 现有能力审计 |
| `ONLINE_MVP_SCOPE.md` | 第一阶段范围定义 |
| `ROLE_PERMISSION_SCOPE.md` | 角色与权限说明 |
| `DATA_MODEL_MVP.md` | 最小数据模型 |
| `LOGIN_HOME_FLOW_PLAN.md` | 登录与首页交互方案 |
| `FRONTEND_IMPLEMENTATION_TODO.md` | 前端实施任务清单 |
| `CALL_RECORDS_REAL_WRITE_PLAN.md` | 通话记录写入方案 |
