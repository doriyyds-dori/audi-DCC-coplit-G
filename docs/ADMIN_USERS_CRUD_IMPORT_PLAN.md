# /admin/users 最小 CRUD + CSV 批量导入设计方案

> 日期：2026-03-26

---

## 1. 本轮目标

**让管理员能在 /admin/users 页面中新增、编辑、启用/禁用用户以及通过 CSV 批量导入用户，形成最小可管理的用户主数据能力。**

---

## 2. /admin/users 最小 CRUD 范围

### 本轮实现

| 能力 | 说明 |
|------|------|
| 用户列表读取 | 已完成（GET /api/admin/users） |
| 新增用户 | 表单填写，后端生成 userId、哈希密码 |
| 编辑用户 | 修改 displayName、role、storeId |
| 启用/禁用 | 切换 enabled 状态 |
| 重置密码 | 管理员重置为指定新密码，后端重新哈希 |
| CSV 批量导入 | 上传 CSV 文件，批量创建用户 |

### 本轮明确不做

- 物理删除用户（只做启用/禁用）
- 批量删除、批量更新
- 复杂筛选、分页
- 审批流
- 用户自助修改密码

---

## 3. 用户最小字段设计

| 字段 | 类型 | 可编辑 | 说明 |
|------|------|--------|------|
| userId | TEXT PK | ❌ 后端自动生成 | 格式：`u_` + UUID，创建后不可变 |
| username | TEXT UNIQUE | ❌ 创建后不可改 | 登录用户名，创建时必填 |
| password | TEXT | 仅重置密码时 | 存储格式：salt:hash（scrypt），前端不展示 |
| displayName | TEXT | ✅ | 显示名称 |
| role | TEXT | ✅ | `super_admin` 或 `user` |
| storeId | TEXT | ✅ | 关联门店 ID，管理员可为空 |
| enabled | INTEGER | ✅ 启用/禁用 | 1=启用，0=禁用 |

说明：
- `userId` 和 `username` 创建后不可修改，避免关联数据混乱
- `password` 永远不返回给前端，新增时由前端传明文、后端哈希存储
- 编辑时不传 password 字段，密码修改仅通过独立的"重置密码"操作

---

## 4. 最小接口建议

### GET /api/admin/users — 用户列表（已有）

已实现，返回 `{ success, users: [...] }`，不含 password。

---

### POST /api/admin/users — 新增用户

| 项目 | 内容 |
|------|------|
| 请求体 | `{ username, password, displayName, role, storeId }` |
| 必填 | username, password, displayName, role |
| 校验 | username 唯一、role 合法、password 长度 ≥ 6 |
| 后端行为 | 生成 userId、scrypt 哈希密码、enabled 默认 1 |
| 成功返回 | `201 { success: true, userId }` |
| 失败返回 | `400 { success: false, error: "用户名已存在" }` |

---

### PUT /api/admin/users/:userId — 编辑用户

| 项目 | 内容 |
|------|------|
| 请求体 | `{ displayName?, role?, storeId? }`（只传需要修改的字段） |
| 校验 | userId 必须存在、role 如传则必须合法 |
| 不可修改 | username、userId |
| 成功返回 | `200 { success: true }` |
| 失败返回 | `404 { success: false, error: "用户不存在" }` |

---

### PATCH /api/admin/users/:userId/enabled — 启用/禁用

| 项目 | 内容 |
|------|------|
| 请求体 | `{ enabled: true/false }` |
| 校验 | userId 存在 |
| 成功返回 | `200 { success: true }` |

---

### POST /api/admin/users/:userId/reset-password — 重置密码

| 项目 | 内容 |
|------|------|
| 请求体 | `{ newPassword }` |
| 校验 | userId 存在、newPassword 长度 ≥ 6 |
| 后端行为 | 重新 scrypt 哈希并更新 |
| 成功返回 | `200 { success: true }` |

---

### POST /api/admin/users/import — CSV 批量导入

| 项目 | 内容 |
|------|------|
| Content-Type | multipart/form-data |
| 字段名 | file |
| 文件类型 | .csv |
| 后端行为 | 解析 CSV → 逐行校验 → 批量 INSERT |
| 成功返回 | `200 { success: true, total, imported, failed, errors: [{ row, reason }] }` |

---

## 5. CSV 批量导入设计

### 推荐模板

```
username,password,displayName,role,storeId,enabled
zhangsan,abc123,张三,user,store_001,1
lisi,abc123,李四,user,store_001,1
wangwu,abc123,王五,super_admin,,1
```

### 字段顺序与要求

| 列序 | 表头 | 必填 | 合法值 | 校验规则 |
|------|------|------|--------|----------|
| 1 | username | ✅ | 非空字符串 | 不可与已有用户重复 |
| 2 | password | ✅ | 字符串 | 长度 ≥ 6 |
| 3 | displayName | ✅ | 非空字符串 | — |
| 4 | role | ✅ | `super_admin` 或 `user` | 不合法则该行失败 |
| 5 | storeId | 可选 | 存在于 stores 表的 storeId | 不存在则该行失败；管理员可为空 |
| 6 | enabled | 可选 | `1` 或 `0` | 不传默认 `1`；其他值则该行失败 |

### 表头要求

- 第一行必须是表头行
- 表头必须严格包含 6 个字段名（大小写不敏感）
- 表头缺失或多出字段 → 整个文件拒绝，返回明确错误

---

## 6. CSV 编码兼容策略

### 检测优先级

1. 检查 BOM 头：如果是 UTF-8 BOM（`EF BB BF`）→ 按 UTF-8 解码
2. 尝试 UTF-8 解码：如果无非法字节序列 → 按 UTF-8 处理
3. 回退 GBK/GB18030 解码：使用 Node 原生 `TextDecoder("gbk")` 或轻量库
4. 最终回退失败 → 返回错误：`"无法识别文件编码，请将文件另存为 UTF-8 编码后重新上传"`

### 推荐编码

- **首选**：UTF-8（无 BOM）
- **兼容**：UTF-8 with BOM、GBK、GB18030
- **不做**：Big5、Shift-JIS、其他非中文编码

### 用户侧建议

- 模板下载为 UTF-8 BOM 格式（Excel 打开不乱码）
- 如用户上传后出现乱码，提示："请用记事本打开 CSV，另存为 UTF-8 编码"

---

## 7. 导入校验与结果回执

### 校验顺序

1. **文件级**：编码检测 → 表头校验
2. **逐行**：跳过空行 → 字段完整性 → 字段合法性 → 唯一性

### 逐条校验规则

| 情况 | 处理 |
|------|------|
| 空行 | 跳过，不计入结果 |
| username 为空 | 该行失败：`"用户名不能为空"` |
| username 已存在 | 该行失败：`"用户名已存在"` |
| username 在本次导入中重复 | 该行失败：`"文件内用户名重复"` |
| password 长度 < 6 | 该行失败：`"密码长度不能少于6位"` |
| displayName 为空 | 该行失败：`"姓名不能为空"` |
| role 不是合法值 | 该行失败：`"角色必须为 super_admin 或 user"` |
| storeId 非空但不存在 | 该行失败：`"门店ID不存在"` |
| enabled 非空且不是 0/1 | 该行失败：`"启用状态必须为 0 或 1"` |

### 返回结构

```
{
  "success": true,
  "total": 10,       // 有效行总数（不含空行和表头）
  "imported": 8,     // 成功导入
  "failed": 2,       // 失败条数
  "errors": [
    { "row": 3, "reason": "用户名已存在" },
    { "row": 7, "reason": "门店ID不存在" }
  ]
}
```

### 导入策略

- 采用"逐行导入，跳过失败行"策略
- 不因某行失败而中止整个导入
- 所有成功行在一个事务内提交

---

## 8. 页面最小交互建议

### 列表页顶部操作区

| 操作 | 形式 | 说明 |
|------|------|------|
| 新增用户 | 按钮 → 弹窗表单 | 填写 username、password、displayName、role、storeId |
| 导入用户 | 按钮 → 文件选择 | 上传 CSV，完成后显示结果回执 |
| 下载模板 | 按钮 → 直接下载 | 下载预填表头的 CSV 模板文件 |

### 每行操作

| 操作 | 形式 | 说明 |
|------|------|------|
| 编辑 | 行内按钮 → 弹窗表单 | 修改 displayName、role、storeId |
| 启用/禁用 | 行内开关或按钮 | 切换 enabled 状态 |
| 重置密码 | 行内按钮 → 确认弹窗 | 输入新密码后提交 |

### 弹窗设计（极简）

- 新增用户弹窗：5 个输入框 + 提交/取消
- 编辑用户弹窗：3 个输入框（displayName、role 下拉、storeId）+ 提交/取消
- 重置密码弹窗：1 个输入框（新密码）+ 确认/取消
- 导入结果弹窗：显示成功/失败条数 + 失败明细列表

---

## 9. 明确暂不做的内容

| 暂不做 | 原因 |
|--------|------|
| 物理删除用户 | 用启用/禁用替代，避免关联数据丢失 |
| 批量删除 | 不需要 |
| 批量更新 | 不需要 |
| 复杂筛选/搜索 | 用户量小，不需要 |
| 分页 | 用户量小，不需要 |
| 审批流 | 超出当前范围 |
| Excel 多格式导入 | 只做 CSV |
| 全编码兼容 | 只做 UTF-8 / GBK 系 |
| 复杂权限分层 | 当前只有 super_admin 和 user 两种角色 |
| /admin/stores CRUD | 本轮只做 users |

---

## 10. 建议的最小编码顺序

1. **后端：新增 POST / PUT / PATCH / reset-password 四个用户管理接口** — 在 server.ts 中实现最小 CRUD
2. **后端：新增 POST /api/admin/users/import 接口** — CSV 解析 + 编码检测 + 逐行校验 + 批量 INSERT
3. **后端：新增 GET /api/admin/users/template 接口** — 返回 UTF-8 BOM 的 CSV 模板文件
4. **前端：AdminUsers.tsx 新增"新增用户""编辑""启用/禁用""重置密码"交互** — 弹窗表单 + 操作按钮
5. **前端：AdminUsers.tsx 新增"导入用户""下载模板"交互** — 文件上传 + 结果回执弹窗
6. **端到端验收** — 新增 → 编辑 → 禁用 → 重置密码 → CSV 导入 → 确认 SQLite 数据正确
