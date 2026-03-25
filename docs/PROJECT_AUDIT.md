# 智慧外呼助手项目审计报告

> 基于工作区实际内容生成，日期：2026-03-24

---

## 1. 当前项目结构概览

```
Smart-Call-Invite-Assistant/
├── .agent/rules/workspace-constitution.md   ← 工作区规则
├── docs/PROJECT_CONTEXT.md                  ← 迁移分析文档
├── index.html                               ← SPA 入口
├── server.ts                                ← Express 开发服务器（含 /api/download-offline）
├── vite.config.ts                           ← Vite 构建配置（含 viteSingleFile 插件）
├── package.json                             ← 依赖管理（name: smart-call-invite-assistant）
├── tsconfig.json                            ← TypeScript 配置
├── .env.example                             ← 环境变量模板（已清理）
├── metadata.json                            ← 项目元信息
├── README.md                                ← 原始 AI Studio 模板说明（内容已过时）
├── dist/                                    ← 构建输出
└── src/
    ├── main.tsx                ← React 渲染入口
    ├── App.tsx (83行)          ← 纯组合层
    ├── useCallSimulation.ts    ← 通话模拟 Hook
    ├── useScriptManager.ts     ← 话术数据管理 Hook
    ├── ChatPanel.tsx           ← 对话面板组件
    ├── FaqPanel.tsx            ← FAQ 三级菜单组件
    ├── HeaderToolbar.tsx       ← 顶部工具栏组件
    ├── CurrentStepInfo.tsx     ← 当前阶段信息组件
    ├── HelpModal.tsx           ← 使用说明弹窗
    ├── storage.ts              ← localStorage 安全读写
    ├── utils.ts                ← cn() 工具函数
    ├── types.ts                ← TypeScript 类型定义
    ├── constants.ts            ← 保有潜客默认话术（148行）
    ├── defaultFaqData.ts       ← FAQ 默认话术库（170行/38KB）
    ├── faqData.ts              ← FAQ 菜单结构（91行）
    ├── index.css               ← Tailwind 入口 + 品牌色变量
    └── __tests__/
        ├── storage.test.ts     ← storage 模块测试（8 用例）
        └── faqSearch.test.ts   ← FAQ 搜索逻辑测试（5 用例）
```

**核心入口**：`index.html` → `main.tsx` → `App.tsx`。`App.tsx` 是应用的组合层，所有业务逻辑分别在 `useCallSimulation.ts` 和 `useScriptManager.ts` 两个 Hook 中。

---

## 2. 已实现功能判断

### 明确可用

| 功能 | 实现位置 | 状态 |
|------|---------|------|
| 通话流程模拟（开场白→核心价值→邀约→收尾） | `useCallSimulation.ts` | ✅ 完整可用 |
| FAQ 三级菜单查询（精确匹配 + 模糊匹配） | `useScriptManager.ts` + `FaqPanel.tsx` | ✅ 完整可用 |
| CSV 话术上传（含列名校验） | `useScriptManager.ts` | ✅ 完整可用 |
| CSV 模板下载 | `useScriptManager.ts` | ✅ 完整可用 |
| 双场景切换（保有潜客 / 首次邀约） | `App.tsx` + `HeaderToolbar.tsx` | ✅ 完整可用 |
| 数据 localStorage 持久化（带版本控制） | `storage.ts` | ✅ 完整可用 |
| 离线单 HTML 打包 | `vite-plugin-singlefile` + `server.ts` | ✅ 完整可用 |
| 首次邀约无话术时的空状态提示 | `ChatPanel.tsx` | ✅ 完整可用 |
| 重置系统 | `useScriptManager.ts` (`clearAll`) | ✅ 完整可用 |
| 使用说明弹窗 | `HelpModal.tsx` | ✅ 完整可用 |
| 单元测试（13 用例） | `__tests__/` | ✅ 可运行 |

### 未实现

| 功能 | 状态 |
|------|------|
| 用户登录/注册 | 未发现任何登录相关代码 |
| 用户管理/门店映射 | 未发现 |
| 通话记录采集 | 未发现 |
| 通话状态选择（未接通/无意向/有意向） | 未发现 |
| 统计看板 | 未发现 |
| 管理后台 | 未发现 |
| 邮件回传 | 未发现 |
| 路由系统 | 未发现（当前是单页无路由） |

---

## 3. 核心模块拆解

### useCallSimulation.ts（72 行）
**职责**：通话模拟引擎。管理对话历史（`history`）、当前步骤（`currentStepId`）、通话状态（`isCallActive`）、全局选项（`globalOptions`）。提供 `startCall`、`resetCall`、`handleCustomerResponse`、`appendMessages` 四个操作。
**特点**：与数据来源完全解耦，只接收 `script: ScriptStep[]` 参数。

### useScriptManager.ts（176 行）
**职责**：话术数据管理。管理三套话术（保有潜客/首次邀约/FAQ），负责 localStorage 持久化、CSV 上传解析、FAQ 搜索（精确→模糊）、模板下载、离线版下载、系统重置。
**特点**：当前数据源是 localStorage，在线化时需改为 API 调用。

### ChatPanel.tsx（149 行）
**职责**：对话面板 UI。展示消息历史、客户回复按钮、全局追问按钮、通话结束状态、无话术空状态。自动滚动到最新消息。
**特点**：纯展示组件，所有数据和回调通过 props 传入。

### FaqPanel.tsx（115 行）
**职责**：FAQ 三级手风琴菜单。展示 `faqData.ts` 中定义的菜单结构，支持一级/二级展开折叠，点击问题按钮触发 `onFaqClick` 回调。
**特点**：纯 UI 组件，自己管理展开状态，不涉及数据搜索逻辑。

### CurrentStepInfo.tsx（30 行）
**职责**：显示当前通话阶段名称和核心逻辑提示。
**特点**：最简单的展示组件，接收 `currentStep` prop。

### HeaderToolbar.tsx（101 行）
**职责**：顶部导航栏。包含品牌标识、客户类型切换按钮、使用说明/重置/离线下载/模板下载/上传话术等操作入口。
**特点**：纯 UI 组件，所有操作通过回调 props 传出。两个 `<input type="file">` 选后自动重置。

### HelpModal.tsx（84 行）
**职责**：使用说明弹窗。覆盖三个部分：快速上手、CSV 编写规范、更新分发流程。
**特点**：纯内容组件，只接收 `isOpen` 和 `onClose`。

---

## 4. 可直接复用到在线版的部分

| 模块 | 复用方式 | 原因 |
|------|---------|------|
| `useCallSimulation.ts` | 零改动 | 纯状态逻辑，只依赖 `ScriptStep[]` 输入，不绑定任何数据源 |
| `ChatPanel.tsx` | 零改动 | 纯 props 驱动的 UI 组件 |
| `FaqPanel.tsx` | 零改动 | 纯 UI 组件，不涉及数据层 |
| `CurrentStepInfo.tsx` | 零改动 | 纯展示组件 |
| `HelpModal.tsx` | 零改动 | 纯内容组件 |
| `utils.ts` | 零改动 | 通用工具函数 |
| `types.ts` | 扩展即可 | 基础类型定义，新增字段（如 userId）不影响现有类型 |
| `faqData.ts` | 零改动 | 纯菜单结构数据 |
| `constants.ts` | 零改动 | 保有潜客默认话术，可作为初始种子数据 |
| `defaultFaqData.ts` | 零改动 | FAQ 话术库，38KB 业务数据 |
| `index.css` | 零改动 | 样式入口 |
| `__tests__/` | 基础可用 | 需补充新模块测试 |

**复用率**：现有 `src/` 下 16 个文件中，12 个可零改动复用。

---

## 5. 在线化必须新增的部分

| 缺失模块 | 原因 |
|---------|------|
| **路由系统** | 当前无路由，在线版至少需要登录页和主页两个路由 |
| **登录页组件** | 当前无用户认证入口 |
| **认证逻辑**（AuthContext + Token 管理） | 当前无任何用户概念 |
| **后端 API 层** | 当前 `server.ts` 只有一个下载端点，无用户/数据相关 API |
| **数据库** | 当前所有数据存 localStorage，在线版需持久化到服务端 |
| **通话状态选择组件** | 当前通话结束即完毕，无状态标记步骤 |
| **通话记录写入逻辑** | 当前不记录任何通话数据 |
| **管理后台页面** | 当前无管理入口 |
| **统计查询与展示** | 当前无统计能力 |
| **定时邮件任务** | 当前无任何邮件相关代码 |
| **API 调用封装**（api.ts） | 当前前端不与任何后端交互 |

---

## 6. 当前技术风险和迁移风险

| 风险 | 具体问题 |
|------|---------|
| **useScriptManager 改造范围大** | 该 Hook（176 行）同时承担数据读写、CSV 解析、FAQ 搜索、下载等多种职责。在线化时需将数据源从 localStorage 改为 API，影响面广。建议迁移时拆分为多个更小的 Hook，而非直接在原文件上改。 |
| **无路由基础设施** | 当前项目完全没有路由（react-router 未安装），引入路由是第一步必须做的事情，会影响 `App.tsx` 的结构。 |
| **server.ts 职责冲突** | 当前 `server.ts` 是开发用途（Vite 中间件 + 离线下载），在线版需要一个真正的后端。建议新建独立后端目录，不在原 `server.ts` 上叠加。 |
| **README.md 内容过时** | 仍然引用 AI Studio 和 GEMINI_API_KEY，与当前项目实际情况不符。不是技术风险，但会误导新接手者。 |
| **vite-plugin-singlefile 与在线版冲突** | 在线版不需要打包为单文件。迁移后需要从 `vite.config.ts` 中移除，否则构建产物不适合 CDN 部署。 |

---

## 7. 建议的最小下一步

**安装 react-router，为 App.tsx 加上最基础的路由结构，创建一个空的 LoginPage 占位组件。**

具体来说：
1. 安装 `react-router-dom`
2. `App.tsx` 中加入 `<BrowserRouter>` + `<Routes>`
3. 路由 `/login` 渲染一个占位的 `LoginPage`（只有用户名密码输入框，不接后端）
4. 路由 `/` 渲染当前已有的话术助手界面
5. 不改动任何现有业务组件

**验收标准**：打开 `/` 看到原来的话术助手，打开 `/login` 看到登录表单。两个页面都能正常渲染，现有功能不受影响。
