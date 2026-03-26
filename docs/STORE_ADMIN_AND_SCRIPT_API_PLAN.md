# 门店管理员与双层话术体系接口边界设计

> 日期：2026-03-26

---

## 1. 本轮目标

**为"统一话术管理、门店自定义话术管理、普通用户获取可用话术"定义最小 API 契约，明确每个接口的路径、权限、请求/返回结构和 storeId 收口规则。**

---

## 2. 统一话术管理的最小接口

> 以下接口仅 **super_admin** 可调用。

---

### GET /api/admin/scripts/global — 获取统一话术列表

| 项目 | 内容 |
|------|------|
| 角色 | super_admin |
| 返回 | `{ success, scripts: [{ scriptId, name, scenarioType, enabled, createdAt, updatedAt }] }` |
| 说明 | 列表不含 content（避免大量数据），只返回 scope=`global` 的话术 |

---

### GET /api/admin/scripts/global/:scriptId — 获取单个统一话术详情

| 项目 | 内容 |
|------|------|
| 角色 | super_admin |
| 返回 | `{ success, script: { scriptId, name, scenarioType, content, enabled, createdAt, updatedAt } }` |
| 说明 | 含完整 content（CSV 文本） |
| 404 | scriptId 不存在或 scope 不是 global |

---

### POST /api/admin/scripts/global — 新增统一话术

| 项目 | 内容 |
|------|------|
| 角色 | super_admin |
| 请求体 | `{ name, scenarioType, content }` |
| 必填 | 全部 |
| 校验 | scenarioType ∈ [`existing`, `new`]；content 非空 |
| 后端行为 | 自动生成 scriptId、scope=`global`、storeId=空、enabled=1、createdAt/updatedAt |
| 返回 | `201 { success: true, scriptId }` |

---

### PUT /api/admin/scripts/global/:scriptId — 更新统一话术

| 项目 | 内容 |
|------|------|
| 角色 | super_admin |
| 请求体 | `{ name?, scenarioType?, content? }`（只传需要修改的字段） |
| 校验 | scriptId 存在且 scope=`global` |
| 后端行为 | 更新传入字段 + updatedAt |
| 返回 | `200 { success: true }` |
| 说明 | 更新统一话术不影响已创建的门店自定义话术 |

---

### PATCH /api/admin/scripts/global/:scriptId/enabled — 启用/禁用统一话术

| 项目 | 内容 |
|------|------|
| 角色 | super_admin |
| 请求体 | `{ enabled: true/false }` |
| 返回 | `200 { success: true }` |

---

## 3. 门店自定义话术管理的最小接口

> 以下接口 **store_admin** 只能操作本店话术，**super_admin** 可操作任意门店话术。

---

### GET /api/admin/scripts/store — 获取门店自定义话术列表

| 项目 | 内容 |
|------|------|
| 角色 | store_admin、super_admin |
| 参数 | super_admin 可选传 `?storeId=xxx` 筛选 |
| 后端收口 | store_admin → 自动按 session.storeId 过滤；super_admin → 不传则返回全部 |
| 返回 | `{ success, scripts: [{ scriptId, name, scenarioType, storeId, sourceScriptId, enabled, createdAt, updatedAt }] }` |
| 说明 | 列表不含 content |

---

### GET /api/admin/scripts/store/:scriptId — 获取单个门店自定义话术详情

| 项目 | 内容 |
|------|------|
| 角色 | store_admin、super_admin |
| 后端收口 | store_admin → 校验该 scriptId 的 storeId 是否等于当前用户 storeId |
| 返回 | `{ success, script: { scriptId, name, scenarioType, storeId, sourceScriptId, content, enabled, createdAt, updatedAt } }` |
| 403 | store_admin 试图访问其他门店的话术 |

---

### POST /api/admin/scripts/store — 基于统一话术创建门店自定义话术

| 项目 | 内容 |
|------|------|
| 角色 | store_admin、super_admin |
| 请求体 | `{ sourceScriptId, name? }` |
| 必填 | sourceScriptId |
| 校验 | sourceScriptId 必须存在且 scope=`global` |
| 后端行为 | 复制统一话术的 content → 新建 scope=`store` 记录，storeId 从 session 取（super_admin 可额外传 storeId） |
| 返回 | `201 { success: true, scriptId }` |
| 说明 | name 不传时默认为"门店自定义 - {原话术名}" |

---

### PUT /api/admin/scripts/store/:scriptId — 更新门店自定义话术

| 项目 | 内容 |
|------|------|
| 角色 | store_admin、super_admin |
| 请求体 | `{ name?, content? }` |
| 后端收口 | store_admin → 校验 storeId 归属 |
| 后端行为 | 更新传入字段 + updatedAt |
| 返回 | `200 { success: true }` |
| 说明 | 不可修改 scenarioType（继承自源话术） |

---

### PATCH /api/admin/scripts/store/:scriptId/enabled — 启用/禁用门店自定义话术

| 项目 | 内容 |
|------|------|
| 角色 | store_admin、super_admin |
| 请求体 | `{ enabled: true/false }` |
| 后端收口 | store_admin → 校验 storeId 归属 |
| 返回 | `200 { success: true }` |

---

## 4. 普通使用者获取可用话术的最小接口

### GET /api/scripts/available — 获取当前用户可用话术列表

| 项目 | 内容 |
|------|------|
| 角色 | user、store_admin、super_admin（所有已登录用户） |
| 参数 | 无（storeId 从 session 获取） |
| 返回 | `{ success, scripts: [{ scriptId, name, scenarioType, scope }] }` |

### 返回逻辑

```
1. 查统一话术：scope='global' AND enabled=1
2. 查本店自定义话术：scope='store' AND storeId=当前用户storeId AND enabled=1
3. 合并返回，每条带 scope 字段供前端区分
```

### 各种情况

| 情况 | 返回内容 | 前端行为 |
|------|---------|---------|
| 本店无自定义话术 | 只有 scope=`global` 的记录 | 不显示选择器，直接使用 |
| 本店有自定义话术 | global + store 记录混合 | 按 scenarioType 分组，显示选择器 |
| super_admin 无 storeId | 只有 scope=`global` 的记录 | 直接使用统一话术 |

### 不含 content

- 列表只返回元数据，不含 CSV 内容
- 用户选择后，通过详情接口获取 content

---

## 5. 话术内容读取接口

### GET /api/scripts/:scriptId — 获取话术完整内容

| 项目 | 内容 |
|------|------|
| 角色 | 所有已登录用户 |
| 权限校验 | global 话术所有人可读；store 话术仅本店用户可读（后端校验 storeId） |
| 返回 | `{ success, script: { scriptId, name, scenarioType, scope, content } }` |
| 说明 | content 为完整 CSV 文本，前端用 papaparse 解析 |
| 403 | user 或 store_admin 试图读取非本店的 store 话术 |

### 为什么需要单独详情接口

- 列表接口不含 content（避免一次加载全部 CSV 文本）
- 用户选择具体话术后，按需请求完整内容
- 一份 CSV 通常几 KB ~ 几十 KB，单次加载无压力

---

## 6. 通话记录接口需要怎样调整

### 现有 POST /api/call-records 请求体

```
当前：{ status, scenarioType }
调整：{ status, scenarioType, scriptId }
```

### 字段来源划分

| 字段 | 来源 | 理由 |
|------|------|------|
| status | 前端传 | 用户选择的通话结果 |
| scenarioType | 前端传 | 用户选择的客户场景 |
| scriptId | **前端传** | 用户选择的具体话术 |
| scriptSource | **后端补** | 后端根据 scriptId 查 scripts 表的 scope 字段自动填入 |
| userId | 后端补 | 从 session 获取 |
| storeId | 后端补 | 从 session 获取 |

### 为什么 scriptSource 由后端补

- 前端传的 scriptId 已足够
- 后端查 scripts 表即可确定 scope 是 `global` 还是 `store`
- 避免前端传入不一致的值

---

## 7. 权限校验原则

### 接口-角色矩阵

| 接口 | super_admin | store_admin | user |
|------|:-----------:|:-----------:|:----:|
| GET /api/admin/scripts/global | ✅ | ❌ | ❌ |
| GET /api/admin/scripts/global/:id | ✅ | ❌ | ❌ |
| POST /api/admin/scripts/global | ✅ | ❌ | ❌ |
| PUT /api/admin/scripts/global/:id | ✅ | ❌ | ❌ |
| PATCH .../global/:id/enabled | ✅ | ❌ | ❌ |
| GET /api/admin/scripts/store | ✅ 全部 | ✅ 仅本店 | ❌ |
| GET /api/admin/scripts/store/:id | ✅ | ✅ 仅本店 | ❌ |
| POST /api/admin/scripts/store | ✅ | ✅ 仅本店 | ❌ |
| PUT /api/admin/scripts/store/:id | ✅ | ✅ 仅本店 | ❌ |
| PATCH .../store/:id/enabled | ✅ | ✅ 仅本店 | ❌ |
| GET /api/scripts/available | ✅ | ✅ | ✅ |
| GET /api/scripts/:id | ✅ | ✅ 仅本店+global | ✅ 仅本店+global |
| POST /api/call-records | ✅ | ✅ | ✅ |

### 必须在后端按 storeId 收口的接口

- GET /api/admin/scripts/store（列表过滤）
- GET /api/admin/scripts/store/:id（归属校验）
- POST /api/admin/scripts/store（storeId 从 session 取）
- PUT /api/admin/scripts/store/:id（归属校验）
- PATCH .../store/:id/enabled（归属校验）
- GET /api/scripts/:id（store 类型话术的归属校验）
- GET /api/scripts/available（按 storeId 查本店话术）

### 必须禁止跨店访问的操作

- store_admin 读写其他门店的自定义话术 → 403
- user 读取其他门店的自定义话术 → 403

---

## 8. 明确暂不做的接口

| 暂不做 | 原因 |
|--------|------|
| 自动同步接口 | 不做总部→门店推送 |
| 版本 diff / merge | 不做话术对比 |
| 跨店复制话术 | 不做跨门店复制 |
| 批量导入/导出话术 | 单个 CSV 上传已满足 |
| 审批流接口 | 话术修改不需要审批 |
| 复杂搜索筛选 | 话术数量少，不需要 |
| 话术删除接口 | 用启用/禁用替代 |
| 话术历史版本接口 | 不做版本回溯 |

---

## 9. 建议的最小编码顺序

1. **后端：scripts 建表 + 统一话术 CRUD 接口** — 在 server.ts 中建 scripts 表，实现 5 个 `/api/admin/scripts/global` 接口，把现有硬编码话术导入为第一条 global 记录
2. **后端：门店自定义话术管理接口** — 实现 5 个 `/api/admin/scripts/store` 接口，含 storeId 归属校验和"基于统一话术创建"的复制逻辑
3. **后端：GET /api/scripts/available + GET /api/scripts/:id** — 普通用户获取可用话术列表和详情
4. **前端：话术选择器 + AppPage 对接** — 在话术助手页增加话术来源选择，通话前调用 /api/scripts/available 获取选项
5. **后端+前端：call_records 增加 scriptId/scriptSource** — 通话记录写入补充话术来源字段
6. **端到端验收** — 超级管理员管理统一话术 → 门店管理员创建自定义话术 → 普通用户选择话术通话 → 通话记录包含话术来源
