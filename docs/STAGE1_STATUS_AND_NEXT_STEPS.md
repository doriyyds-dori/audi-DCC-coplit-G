# 智慧外呼助手 — 第一阶段完成状态与下一步计划

> 更新日期：2026-03-26

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
- AuthContext（后端 scrypt 密码校验 + session token）
- ProtectedRoute（支持角色白名单）
- localStorage 存储 token，启动时通过 /api/auth/me 恢复登录态
- 登出调用后端 /api/auth/logout 清除 session

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
- 后端 `POST /api/call-records`（需认证，userId/storeId 从 session 获取）
- 字段校验 + 枚举校验
- 后端自动生成 id / callDate / createdAt
- 数据写入 SQLite `call_records` 表
- 前端 fetch 替代 console.log
- 成功后重置对话，失败时保持状态
- 未登录调用返回 401

### 管理员今日统计 ✅
- 后端 `GET /api/admin/stats/today`
- AdminStats 页前端对接真实数据
- 汇总卡片：总通话 / 未接通 / 无意向 / 有意向
- 明细表格展示每条记录
- 加载中 / 加载失败 / 无数据状态处理

### 管理后台页面框架 ✅
- AdminLayout（顶部导航 + Outlet）
- AdminStats → 今日统计（已接真实数据，SQLite 查询）
- AdminUsers → 用户管理（已接真实数据，GET /api/admin/users）
- AdminStores → 门店管理（已接真实数据，GET /api/admin/stores）
- 管理员可在 /admin 和 /app 之间双向切换（AdminLayout 提供「进入话术助手」，HeaderToolbar 提供「管理后台」）

### 双层话术体系 ✅
- `scripts` 表支持 `global`（统一话术）和 `store`（门店自定义话术）两种 scope
- `GET /api/scripts/available` 返回当前用户可用话术列表（统一 + 本店）
- `GET /api/scripts/:scriptId` 返回话术详情（含 CSV 内容）
- 前端话术选择器支持统一话术 / 自定义话术切换
- `call_records` 表新增 `scriptId` / `scriptSource` 字段，记录话术来源

### 话术点赞/点踩 ✅
- `script_feedbacks` 表落地（conversationId + messageIndex 唯一约束）
- `POST /api/script-feedbacks` 支持 UPSERT（改选覆盖）
- 前端每条系统建议话术旁增加 👍 / 👎 按钮
- 每通对话生成 `conversationId`，反馈精确到单句话术
- 乐观 UI 更新 + 静默 POST

### 多角色管理后台 ✅
- `store_admin` 角色可登录 `/admin`，自动只看本店数据
- `/api/admin/stats/today` — store_admin 按 storeId 过滤通话记录
- `/api/admin/stats/feedback-today` — store_admin 按 storeId 过滤反馈统计
- `/api/admin/users` — store_admin 只看本店用户
- `/api/admin/stores` — store_admin 只看本店门店
- 导航栏对 store_admin 隐藏「门店管理」入口
- 所有管理接口均增加认证校验（Authorization header）

### 管理后台展示增强 ✅
- `/admin` 首页新增「话术反馈概览」区域（6 张指标卡片 + Top 5 表格）
- 明细表改为显示用户姓名 / 门店名称（LEFT JOIN users/stores）
- 明细表限制最大高度 440px，超出内部滚动
- 新增「下载明细」CSV 导出功能

### 多门店测试数据 ✅
- store_001（北京朝阳店）/ store_002（上海浦东店）差异化测试数据已导入
- 包含不同通话量、意向分布、话术来源占比、反馈倾向
- 新增 storeadmin2 / user3 / user4 测试账号

### 双向导航 ✅
- 管理后台顶部导航 → 「进入话术助手」链接
- 话术助手顶部工具栏 → 「管理后台」链接（仅管理员角色可见，普通用户不可见）

---

## 3. 当前技术现状

| 项目 | 状态 |
|------|------|
| 前端框架 | React + TypeScript + react-router-dom |
| 认证方式 | 后端 scrypt 密码校验 + 内存 session + token |
| 后端形态 | server.ts 提供完整 API（认证 + 业务 + 管理） |
| 数据存储 | SQLite（`data/app.db`：users / stores / call_records / scripts / script_feedbacks） |
| 通话记录写入 | ✅ userId/storeId 从 session 获取，scriptId/scriptSource 自动记录 |
| 话术管理 | ✅ 双层话术体系（global + store），API 加载 + 前端选择 |
| 话术反馈 | ✅ 点赞/点踩入库，UPSERT 支持改选 |
| 今日统计读取 | ✅ SQL 聚合查询，store_admin 自动按 storeId 收口 |
| 反馈统计 | ✅ 概览卡片 + Top 5 表格，store_admin 自动按 storeId 收口 |
| 用户管理 | ✅ 已接真实 SQLite 数据（只读，按角色收口） |
| 门店管理 | ✅ 已接真实 SQLite 数据（只读，按角色收口） |
| 明细导出 | ✅ CSV 下载（含用户姓名 / 门店名称） |
| TypeScript 检查 | ✅ tsc --noEmit 零报错 |
| 代码版本管理 | 已同步至 GitHub |

---

## 4. 明确暂不做的内容

- 用户 CRUD（新增/编辑/删除）
- 门店 CRUD（新增/编辑/删除）
- 历史统计 / 趋势图表
- 日期筛选 / 门店筛选
- 数据导出
- 批量写入 / 请求去重
- 复杂审计日志
- JWT / Token 自动过期与刷新

---

## 5. 已知注意事项

- 修改 `server.ts` 后，需要重启 `npm run dev`，否则新接口不会生效
- 密码目前使用 scrypt 哈希存储，但尚未实现密码修改功能
- session 存储在内存 Map 中，服务重启后所有登录态失效
- 用户/门店管理目前为只读，尚未实现 CRUD 操作
- SQLite 数据库文件在 `data/app.db`，已通过 `.gitignore` 排除提交

---

## 6. 下一步建议

### 优先级 P0：主数据 CRUD
1. 用户管理新增 / 编辑 / 禁用
2. 门店管理新增 / 编辑 / 删除

### 优先级 P1：统计增强
1. 日期筛选 + 门店筛选（管理后台）
2. 趋势统计与导出
3. 反馈详情审核页

### 优先级 P2：安全增强
1. Token 自动过期与刷新
2. 密码修改功能
3. 持久化 session（替代内存 Map）

---

## 7. 文件变更清单

| 文件 | 类型 | 说明 |
|------|------|------|
| src/auth/AuthContext.tsx | 新增 | 认证上下文（后端校验 + token） |
| src/auth/ProtectedRoute.tsx | 新增 | 路由守卫 |
| src/pages/LoginPage.tsx | 新增 | 登录页（调用后端接口） |
| src/pages/AppPage.tsx | 新增 | 话术助手主页（包裹层） |
| src/pages/AdminLayout.tsx | 新增 | 管理后台布局 |
| src/pages/AdminStats.tsx | 新增 | 今日统计（SQLite 真实数据） |
| src/pages/AdminUsers.tsx | 新增 | 用户管理（SQLite 真实数据） |
| src/pages/AdminStores.tsx | 新增 | 门店管理（SQLite 真实数据） |
| src/CallStatusModal.tsx | 新增 | 通话状态弹窗 |
| src/App.tsx | 修改 | 路由分发 |
| src/ChatPanel.tsx | 修改 | 新增结束并记录按钮 |
| src/HeaderToolbar.tsx | 修改 | 用户信息 + 管理后台入口 |
| src/main.tsx | 修改 | BrowserRouter + AuthProvider |
| server.ts | 修改 | 全部认证 + 业务 + 管理 API（SQLite） |
| data/users.json | 新增 | 用户种子数据（scrypt 哈希密码） |
| data/stores.json | 新增 | 门店种子数据 |
| README.md | 修改 | 完整项目文档 |
