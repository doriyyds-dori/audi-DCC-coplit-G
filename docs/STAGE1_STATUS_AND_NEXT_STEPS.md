# 智慧外呼助手 — 第一阶段完成状态与下一步计划

> 更新日期：2026-03-25

---

## 1. 第一阶段目标回顾

将离线版话术助手迁移为在线版，具备最小可用的认证、路由、通话记录写入和管理后台框架。

---

## 2. 已完成清单

### 路由基础设施 ✅
- react-router-dom v7 引入
- `/login`、`/app`、`/admin`、`/admin/users`、`/admin/stores` 路由全部就位
- `/` 根路径按登录态和角色自动重定向

### 登录页 ✅
- 用户名 + 密码表单，含前端校验
- 错误提示
- 登录成功后按角色跳转

### 认证上下文 + 路由守卫 ✅
- AuthContext（测试账号：admin / user1 / user2）
- ProtectedRoute（支持角色白名单）
- localStorage 登录态持久化
- 登出闭环

### HeaderToolbar 用户信息 ✅
- 顶部显示当前用户名
- 登出按钮
- 管理员在话术助手页可见「返回管理后台」入口，支持在 /app 与 /admin 间双向切换

### 结束并记录通话按钮 ✅
- 「结束并记录通话」与「重置对话」完全分离
- 重置对话 = 仅重新演练，不记录
- 结束并记录 = 弹出状态选择弹窗

### 通话状态选择弹窗 ✅
- 3 个状态选项：未接通 / 明确无意向 / 有意向
- 无关闭按钮，必须选择状态
- 选择后提交，提交中按钮禁用
- 失败时显示错误提示，不关闭弹窗

### call_records 真实写入 ✅
- 后端 `POST /api/call-records`（server.ts）
- 字段校验 + 枚举校验
- 后端自动生成 id / callDate / createdAt
- 数据写入 `data/call_records.json`
- 前端 fetch 替代 console.log
- 成功后重置对话，失败时保持状态

### 管理员今日统计 ✅
- 后端 `GET /api/admin/stats/today`
- AdminStats 页前端对接真实数据
- 汇总卡片：总通话 / 未接通 / 无意向 / 有意向
- 明细表格展示每条记录
- 加载中 / 加载失败 / 无数据状态处理

### 管理后台页面框架 ✅
- AdminLayout（顶部导航 + Outlet）
- AdminStats → 今日统计（已接真实数据）
- AdminUsers → 用户管理（静态占位）
- AdminStores → 门店管理（静态占位）
- 管理员可在 /admin 和 /app 之间双向切换（AdminLayout 提供「进入话术助手」，HeaderToolbar 提供「管理后台」）

### 双向导航 ✅
- 管理后台顶部导航 → 「进入话术助手」链接
- 话术助手顶部工具栏 → 「管理后台」链接（仅管理员角色可见，普通用户不可见）

---

## 3. 当前技术现状

| 项目 | 状态 |
|------|------|
| 前端框架 | React + TypeScript + react-router-dom |
| 认证方式 | 前端硬编码测试账号 + AuthContext + localStorage |
| 后端形态 | 复用 server.ts 提供最小 API |
| 数据存储 | 本地 JSON 文件 `data/call_records.json` |
| 通话记录写入 | ✅ 已接真实后端接口（POST 201 + 文件写入确认） |
| 今日统计读取 | ✅ 已接真实后端接口（GET 200 + 页面数据一致） |
| TypeScript 检查 | ✅ tsc --noEmit 零报错 |
| 第一阶段闭环验证 | ✅ 已完成 |
| 代码版本管理 | 已完成本地版本管理；当前版本是否已同步远端仓库，以实际 Git 推送结果为准 |

---

## 4. 已有但暂未接入的占位页面

| 页面 | 路由 | 当前状态 |
|------|------|---------|
| 用户管理 | /admin/users | 静态占位表格 |
| 门店管理 | /admin/stores | 静态占位表格 |

---

## 5. 明确暂不做的内容

- 真实后端认证（JWT / Session）
- 数据库（SQLite / MySQL）
- 用户 CRUD（新增/编辑/删除）
- 门店 CRUD（新增/编辑/删除）
- 历史统计 / 趋势图表
- 日期筛选 / 门店筛选
- 数据导出
- 批量写入 / 请求去重
- 复杂审计日志

---

## 6. 已知注意事项

- 修改 `server.ts` 后，需要重启 `npm run dev`，否则新接口不会生效
- 当前登录仍依赖硬编码测试账号，仅适用于第一阶段开发验证
- 当前 `call_records` 数据保存在本地 JSON 文件中，不适合作为长期正式存储方案
- 当前管理员后台仅「今日统计」页面接入真实数据，用户管理与门店管理仍为静态占位
- 当前后端接口尚未做严格身份校验，仍存在前端伪造 `userId` / `storeId` 的风险

---

## 7. 下一步建议

### 优先级 P0：真实身份与主数据
1. 将硬编码测试账号替换为真实 users / stores 数据源
2. 登录改为后端校验，API 不再信任前端直接传 userId
3. 建立最小可用的身份校验机制（Session 或 JWT 二选一）

### 优先级 P1：数据存储升级
1. 将 call_records 从 JSON 文件迁移到 SQLite
2. 保持现有接口契约不变，先替换存储层
3. 为后续统计查询做准备

### 优先级 P2：后台主数据管理
1. 用户管理页接真实数据 + 最小 CRUD
2. 门店管理页接真实数据 + 最小 CRUD

### 优先级 P3：统计增强
1. 日期筛选 + 门店筛选
2. 趋势统计与导出

---

## 8. 文件变更清单

本阶段新增和修改的关键文件：

| 文件 | 类型 | 说明 |
|------|------|------|
| src/auth/AuthContext.tsx | 新增 | 认证上下文 |
| src/auth/ProtectedRoute.tsx | 新增 | 路由守卫 |
| src/pages/LoginPage.tsx | 新增 | 登录页 |
| src/pages/AppPage.tsx | 新增 | 话术助手主页（包裹层） |
| src/pages/AdminLayout.tsx | 新增 | 管理后台布局 |
| src/pages/AdminStats.tsx | 新增 | 今日统计（真实数据） |
| src/pages/AdminUsers.tsx | 新增 | 用户管理（占位） |
| src/pages/AdminStores.tsx | 新增 | 门店管理（占位） |
| src/CallStatusModal.tsx | 新增 | 通话状态弹窗 |
| src/App.tsx | 修改 | 路由分发 |
| src/ChatPanel.tsx | 修改 | 新增结束并记录按钮 |
| src/HeaderToolbar.tsx | 修改 | 用户信息 + 管理后台入口 |
| src/main.tsx | 修改 | BrowserRouter + AuthProvider |
| server.ts | 修改 | POST /api/call-records + GET /api/admin/stats/today |
| README.md | 修改 | 完整项目文档 |
