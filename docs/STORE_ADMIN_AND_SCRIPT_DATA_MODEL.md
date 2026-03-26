# 门店管理员与双层话术体系数据模型设计

> 日期：2026-03-26

---

## 1. 本轮目标

**为"门店管理员角色 + 双层话术体系"定义最小数据模型，包括 users 表扩展、scripts 表设计、话术内容存储方式、通话记录字段补充，以及门店级数据权限的查询约束。**

---

## 2. 对现有 users 表的最小调整

### role 字段扩展

| role 值 | 含义 | storeId 要求 |
|---------|------|-------------|
| `super_admin` | 超级管理员 | 允许为空（不绑定具体门店） |
| `store_admin` | 门店人员管理员 | **必须绑定**，不可为空 |
| `user` | 普通使用者 | **必须绑定**，不可为空 |

### 具体调整点

- `role` 字段合法值从 `['super_admin', 'user']` 扩展为 `['super_admin', 'store_admin', 'user']`
- 新增用户时校验：如果 role 不是 `super_admin`，则 `storeId` 必填
- `enabled` 字段在三类角色中含义一致：`0` = 禁止登录，`1` = 正常

### 不需要改表结构

- users 表当前字段已够用，不需要加列
- 只需在应用层增加 `store_admin` 枚举值的校验逻辑

---

## 3. 双层话术数据的最小对象设计

### 建议：只用一张 scripts 表，不拆分 script_contents

理由：
1. 当前话术内容是一整份 CSV 文本（或等价 JSON），不是结构化的逐行数据库记录
2. 话术的"步骤"从 CSV 解析生成，解析逻辑已在前端 `useScriptManager.ts` 中成熟运行
3. 如果拆成 `scripts` + `script_steps` 两张表，需要重写整个前端解析和渲染链路，改动巨大
4. 一张 scripts 表 + 一个 `content` 字段（存完整 CSV 文本）是当前项目最省改动的方式

### 数据对象关系

```
stores  1 ──── N  users          一个门店有多个用户
stores  1 ──── N  scripts        一个门店有多套自定义话术
scripts 1 ──── N  call_records   一条通话记录关联一套话术
```

---

## 4. scripts 最小字段设计

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| scriptId | TEXT PK | ✅ | 唯一标识，格式：`scr_` + UUID |
| name | TEXT | ✅ | 话术名称，如"2026Q1保客统一话术" |
| scope | TEXT | ✅ | `global`（统一话术）或 `store`（门店自定义） |
| scenarioType | TEXT | ✅ | `existing`（保客）或 `new`（新客） |
| storeId | TEXT | 视 scope | `global` 时为空，`store` 时必填 |
| sourceScriptId | TEXT | 否 | 门店自定义话术创建时记录来源统一话术的 scriptId |
| content | TEXT | ✅ | 完整的 CSV 文本（话术内容） |
| enabled | INTEGER | ✅ | 1=启用，0=禁用，默认 1 |
| createdAt | TEXT | ✅ | ISO 时间戳 |
| updatedAt | TEXT | ✅ | ISO 时间戳，每次编辑更新 |

### 统一话术必填字段

- scriptId、name、scope=`global`、scenarioType、content、enabled、createdAt、updatedAt
- storeId 为空
- sourceScriptId 为空

### 门店自定义话术必填字段

- scriptId、name、scope=`store`、scenarioType、content、enabled、createdAt、updatedAt
- **storeId 必填**
- **sourceScriptId 填写来源统一话术的 scriptId**

### sourceScriptId 的作用

- 仅用于溯源：记录"这套门店话术是基于哪套统一话术创建的"
- **不用于同步**：总部修改统一话术后，不会根据此字段自动更新门店版本
- 后续如需手动"重新同步"，可通过此字段找到对应的统一话术

---

## 5. 话术内容如何存

### 明确建议：主数据在 SQLite，内容以 CSV 文本存在 content 字段中

理由：

1. **当前现状**：话术内容以 CSV 格式在前端通过 `papaparse` 解析，解析后生成 `ScriptStep[]` 数组供 `ChatPanel` 渲染。这套解析链路已经稳定运行。
2. **最省改动**：把完整 CSV 文本存进 SQLite 的 `content TEXT` 字段，前端获取后用现有 `papaparse` 解析，无需改动任何渲染逻辑。
3. **不适合结构化存储**：如果把每个步骤、每个选项拆成行存进关系表，需要重新设计前端数据流，改动面极大且无收益。
4. **SQLite TEXT 字段无长度限制**：一份 CSV 话术通常几 KB 到几十 KB，完全没有存储压力。

### 不建议的方案

- ❌ 继续用 localStorage：多用户/多设备无法共享
- ❌ 继续用纯文件系统：无法按门店隔离和权限控制
- ❌ 结构化拆表存步骤：改动过大，收益不明显

---

## 6. 门店自定义话术创建规则如何落到数据上

### 创建流程

1. 门店管理员在后台点击"基于统一话术创建门店话术"
2. 后端接收请求，读取指定统一话术（scope=`global`）的 `content` 字段
3. 创建一条新的 scripts 记录：
   - scope = `store`
   - storeId = 当前管理员的 storeId
   - sourceScriptId = 来源统一话术的 scriptId
   - content = **完整复制**统一话术的 CSV 内容
   - name = 可由管理员指定，默认为"门店自定义 - {原话术名}"
4. 复制完成后，门店话术与统一话术完全独立

### 为什么用完整复制而不是引用

- **引用模式**的问题：需要维护同步/不同步逻辑，总部改了要判断是否覆盖门店版，门店改了要判断是否脱离引用。复杂度极高。
- **完整复制**的好处：门店话术创建后就是独立实体，后续编辑互不影响，逻辑简单。
- `sourceScriptId` 仅记录"来源于谁"，不构成运行时依赖。

### 如何保证总部更新不同步

- 数据上没有任何自动同步机制
- 总部更新统一话术 = 更新 scope=`global` 的那条记录
- 门店自定义话术 = scope=`store` 的独立记录，不受影响
- 如果门店想手动重新同步，需要删除旧的门店话术，重新执行"基于统一话术创建"

---

## 7. 通话记录最小字段补充建议

### 建议新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| scriptSource | TEXT | `global` 或 `store`，记录本次使用的话术来源层级 |
| scriptId | TEXT | 具体使用的话术 ID |

### 为什么这两个字段是最少必要

- `scriptSource`：支持按"统一话术 vs 门店自定义话术"维度分析转化率差异
- `scriptId`：支持定位到具体哪套话术，后续可分析不同版本的效果

### 是否需要 scriptName 快照

**建议暂不加。** 理由：
- scriptId 已可关联到 scripts 表查到 name
- 快照适合高频变更场景，当前话术变更频率低
- 后续如果真的需要，加一个 TEXT 字段即可，不影响当前设计

---

## 8. 数据权限与查询约束如何落到模型上

### store_admin 查用户

```
后端逻辑：
  从 session 取 currentUser.role 和 currentUser.storeId
  如果 role = store_admin → SELECT * FROM users WHERE storeId = ?
  如果 role = super_admin → SELECT * FROM users（全部）
```

### store_admin 查话术

```
后端逻辑：
  如果 role = store_admin → 
    统一话术：SELECT * FROM scripts WHERE scope = 'global'（只读）
    门店话术：SELECT * FROM scripts WHERE scope = 'store' AND storeId = ?（可编辑）
  如果 role = super_admin → SELECT * FROM scripts（全部）
```

### 普通 user 获取可用话术

```
后端逻辑：
  1. 查本店是否有门店自定义话术：
     SELECT * FROM scripts WHERE scope = 'store' AND storeId = ? AND enabled = 1
  2. 查统一话术：
     SELECT * FROM scripts WHERE scope = 'global' AND enabled = 1
  3. 如果本店有自定义话术 → 返回两套（统一 + 门店），前端显示选择器
  4. 如果本店没有自定义话术 → 只返回统一话术，前端不显示选择器
```

### 核心原则

- 所有筛选在后端完成，storeId 从 session 获取
- 前端不传 storeId 参数，前端只负责展示后端返回的数据
- super_admin 是唯一可以跨门店查询的角色

---

## 9. 明确暂不做的模型能力

| 暂不做 | 原因 |
|--------|------|
| 话术版本表 | 不做版本历史，编辑即覆盖 |
| 自动同步链路 | 不做总部→门店自动推送 |
| 版本 diff / merge | 不做话术对比合并 |
| 多级组织架构 | 只有门店一层 |
| 跨店管理员 | 一个 store_admin 只管一个门店 |
| 复杂审计字段 | 不记录 updatedBy、操作日志 |
| 话术步骤结构化存储 | 内容以 CSV 文本存储，不拆 |
| 话术标签/分类 | 用 scenarioType 区分即可 |

---

## 10. 建议的下一步设计顺序

1. **接口边界设计** — 定义话术管理的最小 API 契约（统一话术 CRUD、门店话术创建/编辑、用户获取可用话术列表），以及 store_admin 角色的权限校验接口规范
2. **store_admin 角色接入** — users 表 role 扩展、前端路由守卫适配三角色、后端管理接口增加 storeId 过滤
3. **scripts 表建表 + 统一话术导入** — 在 SQLite 中建 scripts 表，把当前硬编码在 constants.ts 中的默认话术导入为第一条 global 记录
4. **前端话术选择器** — 通话前根据后端返回的可用话术列表，显示"统一话术 / 门店自定义话术"选择器
5. **call_records 字段补充 + 端到端验收** — 增加 scriptSource / scriptId 字段，完成全链路验收
