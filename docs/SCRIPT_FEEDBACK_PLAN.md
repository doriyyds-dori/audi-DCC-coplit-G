# 话术点赞/点踩功能设计方案

> 日期：2026-03-26

---

## 1. 本轮目标

**让邀约专员在通话过程中，对系统给出的每一条建议话术进行"好/不好"标记，将反馈即时记录到数据库，为后续话术优化提供真实使用数据。**

---

## 2. 功能定义

| 项目 | 说明 |
|------|------|
| 反馈对象 | 系统给出的**单条建议话术**（agentResponse），不是整通电话 |
| 是否强制 | **否**，完全自愿；不点赞/踩不影响任何流程 |
| 触发场景 | 通话进行中，系统展示的每一条回复话术旁边出现反馈按钮 |
| 不涉及 | FAQ 回答、客户消息、步骤跳转逻辑 |

---

## 3. 最小交互设计

### 图标位置

- 每条**系统建议话术气泡**的右下角，紧贴气泡
- 两个小图标并排：👍 👎
- 使用 `lucide-react` 的 `ThumbsUp` / `ThumbsDown` 图标

### 按钮行为

| 状态 | 表现 |
|------|------|
| 初始 | 两个图标灰色，低透明度 |
| 点赞后 | 👍 变为品牌色高亮，👎 保持灰色 |
| 点踩后 | 👎 变为红色高亮，👍 保持灰色 |
| 未点击 | 保持灰色，不影响任何流程 |

### 是否允许改选

- **第一版建议允许改选**
- 点过👍后再点👎 → 切换为👎，覆盖上一条记录
- 覆盖范围：同一 **conversationId + messageIndex**，不影响其他通话中相同 messageIndex 的记录
- 理由：用户可能误点，阻止改选会造成挫败感

### 不显示反馈按钮的场景

- 客户消息气泡
- FAQ 问答追加的消息

---

## 4. 反馈记录粒度

### 定位精度

一条反馈必须能定位到**这通对话中的第 N 条系统话术**，而不仅仅是"某通电话"。

### 为什么 messageIndex 不能单独作为定位键

- messageIndex 是消息在当前对话 history 数组中的下标
- 不同通话之间会重复出现相同的 messageIndex（例如每通电话的第一条 agent 消息都是 index 0）
- 因此**单独使用 messageIndex 无法唯一定位一条反馈**

### 定位方式：conversationId + messageIndex

- **conversationId**：前端在每次开始新对话时生成（`conv_` + UUID）
- 同一通电话内保持不变
- 重置对话或重新开始下一通时生成新的 conversationId
- **messageIndex**：该消息在 history 数组中的下标
- 两者组合可以唯一定位到「哪一通对话的哪一句话术」
- 改选时按 conversationId + messageIndex 覆盖

---

## 5. 最小数据建议

### script_feedbacks 表

| 字段 | 类型 | 必要性 | 说明 |
|------|------|--------|------|
| feedbackId | TEXT PK | 最小必要 | 主键，`fb_` + UUID |
| conversationId | TEXT | 最小必要 | 前端生成，标识当前这一通对话，`conv_` + UUID |
| userId | TEXT | 最小必要 | 从 session 获取 |
| storeId | TEXT | 最小必要 | 从 session 获取 |
| scriptId | TEXT | 最小必要 | 当前使用的话术 ID |
| scriptSource | TEXT | 最小必要 | `global` 或 `store` |
| feedbackType | TEXT | 最小必要 | `like` 或 `dislike` |
| messageIndex | INTEGER | 最小必要 | 对话历史中的消息下标 |
| messageText | TEXT | 建议保留 | 被反馈的话术原文（方便后续分析时不依赖完整回放） |
| stepId | TEXT | 建议保留 | 话术步骤 ID（如 step_1） |
| createdAt | TEXT | 最小必要 | ISO 时间戳 |

> **conversationId 为什么是最小必要**：没有它，messageIndex 在不同通话间会重复，无法唯一定位反馈；也无法实现同通话内的改选覆盖。

### 写入策略建议

**第一版建议：UPSERT（按 conversationId + messageIndex 覆盖更新）**

- 后端用 `INSERT ... ON CONFLICT(conversationId, messageIndex) DO UPDATE SET feedbackType = ?, createdAt = ?`
- 同一通话同一消息只保留最新反馈，天然支持改选
- 理由：比"每次插入新记录再删旧记录"更简单；不产生冗余数据；查询时无需去重
- 需要在表上为 conversationId + messageIndex 建唯一索引

### 第一版不需要的字段

| 不需要 | 理由 |
|--------|------|
| callRecordId | 反馈是即时发送的，通话可能还没结束，尚未生成 callRecordId |
| 文字备注 | 点赞/踩本身是最轻量的反馈形式，加文字输入框会大幅降低使用率 |
| 评分数值 | 二值反馈已足够区分好坏，多维评分增加认知负担 |

---

## 6. 与现有通话链路的关系

### 不影响现有流程

| 流程 | 影响 |
|------|------|
| 结束并记录通话 | 不影响，反馈已即时入库 |
| 重置对话 | 不影响，已提交的反馈保留在数据库 |
| FAQ 使用 | 不影响，FAQ 消息不显示反馈按钮 |
| 话术来源选择 | 不影响，反馈记录带有 scriptId |

### 即时记录 vs 随通话提交

**建议：即时记录（点击时立即 POST）**

理由：
1. 用户可能点完赞/踩后忘记点"结束并记录通话"，即时记录不会丢失数据
2. 通话可能很长，等到结束再批量提交增加数据丢失风险
3. 即时记录实现更简单，每次点击一个独立 POST 请求
4. 不需要在前端维护待提交的反馈队列

---

## 7. 后台与后续分析价值

### 可支持的分析

| 分析维度 | 说明 |
|----------|------|
| 统一话术 vs 自定义话术 | 按 scriptSource 分组统计 like/dislike 比例 |
| 哪些话术最受欢迎 | 按 scriptId + stepId 统计 like 数，排序取 Top N |
| 哪些话术需要优化 | 按 scriptId + stepId 统计 dislike 数，排序取最差 N 条 |
| 门店差异 | 按 storeId 分组，对比不同门店对同一话术的反馈差异 |
| 话术优化效果验证 | 更新话术前后的 like/dislike 比例变化 |
| messageText 辅助定位 | 直接看到被踩的原文，不需要回放整通对话 |

---

## 8. 明确暂不做的内容

| 暂不做 | 原因 |
|--------|------|
| 评论区 | 本轮只做二值反馈 |
| 长文本备注 | 降低使用率 |
| 多维评分 | 增加认知负担 |
| 强制填写原因 | 违反"不影响正常流程"原则 |
| 即时推荐替代话术 | 不是本轮目标 |
| 复杂报表页 | 后续再做 |
| 反馈删除/撤回 | 允许改选已够用 |
| 反馈与 callRecordId 关联 | 第一版即时记录，通话未结束时无 callRecordId |

---

## 9. 建议的最小实现顺序

1. **后端：建表 + POST /api/script-feedbacks** — 新增 script_feedbacks 表（含 conversationId + messageIndex 唯一索引），实现 UPSERT 写入接口，接收 conversationId、scriptId、feedbackType、messageIndex、messageText、stepId，后端从 session 补 userId/storeId，查 scripts 表补 scriptSource
2. **前端：conversationId 生成** — 在 startCall 时生成 `conv_` + UUID，重置对话时清除
3. **前端：ChatPanel 每条 agent 消息增加 👍/👎 按钮** — 在 agent 气泡右下角增加反馈图标，点击即时 POST，支持改选覆盖
4. **前端：反馈状态管理** — 用 Map\<messageIndex, 'like' | 'dislike'\> 管理当前对话中的反馈状态，控制按钮高亮
5. **端到端验收** — 开始通话 → 点赞某条话术 → 改选为点踩 → 结束通话 → 验证数据库中同一 conversationId + messageIndex 只有一条最新记录
