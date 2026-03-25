# 智慧外呼助手第一阶段最小数据模型说明

> 日期：2026-03-24

---

## 1. 第一阶段核心数据对象

| 对象 | 存在原因 |
|------|---------|
| **stores（门店）** | 用户必须归属到具体门店，统计需要按门店维度汇总 |
| **users（用户）** | 登录认证、通话记录归属、统计数据的主体 |
| **call_records（通话记录）** | 每次完整通话的状态和归属，是统计的数据来源 |

**共 3 个数据对象。**

---

## 2. 每个数据对象的最小字段设计

### stores（门店）

| 字段名 | 含义 | 类型 | 必填 | 第一阶段必须 |
|--------|------|------|------|------------|
| id | 门店唯一标识 | 字符串 | 是 | 是 |
| name | 门店名称（如"北京朝阳店"） | 字符串 | 是 | 是 |
| created_at | 创建时间 | 日期时间 | 是 | 是 |

### users（用户）

| 字段名 | 含义 | 类型 | 必填 | 第一阶段必须 |
|--------|------|------|------|------------|
| id | 用户唯一标识 | 字符串 | 是 | 是 |
| username | 登录用户名 | 字符串 | 是 | 是 |
| password_hash | 密码哈希值 | 字符串 | 是 | 是 |
| display_name | 显示名称（真实姓名） | 字符串 | 是 | 是 |
| store_id | 所属门店 | 字符串 | 是 | 是 |
| role | 角色 | 枚举：`super_admin` / `user` | 是 | 是 |
| enabled | 是否启用 | 布尔 | 是 | 是 |
| created_at | 创建时间 | 日期时间 | 是 | 是 |

### call_records（通话记录）

| 字段名 | 含义 | 类型 | 必填 | 第一阶段必须 |
|--------|------|------|------|------------|
| id | 记录唯一标识 | 字符串 | 是 | 是 |
| user_id | 谁打的 | 字符串 | 是 | 是 |
| store_id | 所属门店（冗余存储，方便按门店统计） | 字符串 | 是 | 是 |
| status | 通话结果 | 枚举：`not_connected` / `no_intent` / `has_intent` | 是 | 是 |
| scenario_type | 使用场景 | 枚举：`existing`（保有潜客）/ `new`（首次邀约） | 是 | 是 |
| call_date | 通话日期（如2026-03-24） | 字符串 | 是 | 是 |
| created_at | 记录创建时间 | 日期时间 | 是 | 是 |

---

## 3. 数据对象之间的关系

```
stores 1 ──── N users      一个门店有多个用户
users  1 ──── N call_records  一个用户有多条通话记录
```

- `users.store_id` → `stores.id`
- `call_records.user_id` → `users.id`
- 查询某门店的通话统计：通过 `call_records.user_id` 关联到 `users.store_id`

---

## 4. 哪些字段支撑登录

| 字段 | 用途 |
|------|------|
| `users.username` | 用户输入的登录名 |
| `users.password_hash` | 与输入密码比对 |
| `users.enabled` | 为 `false` 时拒绝登录 |
| `users.role` | 登录成功后决定是否显示管理后台入口 |
| `users.id` | 签发 Token 时写入，后续请求用于识别身份 |
| `users.display_name` | 登录后页面头部显示 |

---

## 5. 哪些字段支撑通话记录

| 字段 | 解决什么问题 |
|------|------------|
| `call_records.id` | 唯一标识每条记录，避免重复 |
| `call_records.user_id` | 这通电话是谁打的 |
| `call_records.store_id` | 属于哪个门店（冗余存储，无需 JOIN 即可按门店统计） |
| `call_records.status` | 这通电话的结果是什么（未接通/无意向/有意向） |
| `call_records.scenario_type` | 用的哪个场景（保有潜客还是首次邀约，支撑场景维度分析） |
| `call_records.call_date` | 这通电话属于哪一天（按天统计的依据） |
| `call_records.created_at` | 精确记录时间，排序和排查用 |

---

## 6. 哪些字段支撑后台统计

### 统计需求 → 依赖字段

| 统计项 | 依赖字段 |
|--------|---------|
| 某用户某天打了多少通电话 | `call_records.user_id` + `call_records.call_date` → COUNT |
| 某用户某天的接通率 | `call_records.status`（统计各状态数量后计算） |
| 某门店某天的总通话量 | `call_records.store_id` + `call_records.call_date`（无需 JOIN） |
| 按门店筛选 | `call_records.store_id` → `stores.name` |
| 按日期筛选 | `call_records.call_date` |
| 按场景分析 | `call_records.scenario_type`（保有潜客 vs 首次邀约的分布） |

---

## 7. 第一阶段明确不纳入的数据

| 不做 | 原因 |
|------|------|
| 通话持续时长（duration） | 当前是话术模拟工具，不是真实通话计时 |
| 通话步骤明细（steps_detail） | 第一阶段只统计次数和状态，不分析通话路径 |
| 客户信息表 | 第一阶段不管理客户档案 |
| 组织架构表（区域/大区） | 第一阶段只有门店一层 |
| 操作日志表 | 第一阶段不记录管理操作 |
| 话术版本表 | 话术继续用 CSV 管理，不做在线版本控制 |
| 邮件发送记录表 | 第一阶段不做邮件 |
| 用户偏好/设置表 | 第一阶段无个性化设置需求 |

---

## 8. 数据模型结论

1. **第一阶段只需 3 个数据对象**：stores、users、call_records，总字段数不超过 22 个
2. **call_records 记录简洁但够用**：记录“谁、哪个门店、哪个场景、哪天、什么结果”，不记录通话步骤细节
3. **call_records 冗余存储 store_id 和 scenario_type**，避免统计时频繁 JOIN，提升查询效率
4. **所有统计基于 call_records 按 user_id / store_id / scenario_type / call_date / status 聚合**，不需要预计算表
5. **用户与门店是多对一关系**，不做多门店归属
