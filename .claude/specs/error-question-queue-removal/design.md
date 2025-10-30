# 错题队列与待移除机制（Design）

## 概览
本设计围绕“错题生命周期管理”展开：
- 新错题自动入队与时间记录；旧错题按策略轮训抽取；
- 错题在练习中连续答对 3 次后进入“待移除队列”；
- 隔一周期进行抽查，抽查仍答对则最终移除，否则回归错题队列并清零连续计数；
- 数据持久化与现有系统兼容、UI 状态可视化、用户操作安全。

为提高记忆与练习效率，抽取策略与队列维护参考“间隔重复（Spaced Repetition）”与“Leitner 盒系统”思想，同时保持实现的可控与简洁。

## 研究与依据（摘要）
- 间隔重复（Spaced Repetition）：通过在即将遗忘的时间点复习提升记忆保持率。参考：Wikipedia Spaced Repetition（https://en.wikipedia.org/wiki/Spaced_repetition）。
- Leitner 系统：使用多级盒对卡片进行复习调度，答对进入更高级盒、答错回退，从而实现间隔增大与强化记忆。参考：Wikipedia Leitner System（https://en.wikipedia.org/wiki/Leitner_system）。
- SuperMemo/SM-2：早期间隔重复算法，通过记忆质量评分动态调整间隔。参考：SuperMemo SM-2（https://www.supermemo.com/en/archives1990-2015/english/ol/sm2）。

本系统不直接实现复杂算法，采用“连续答对计数 + 会话/时间周期抽查”的简化策略，保证可实现性与可维护性，同时保留可扩展至更复杂 SRS 算法的空间。

## 架构
- 核心模块：
  - ErrorQueueService：错题入队、更新、轮训与抽查调度；
  - PendingRemovalService：管理“待移除队列”的抽查周期与最终移除；
  - PracticeSessionController：监听答题事件（正确/错误），调用队列服务并驱动下一题；
  - StorageAdapter：与现有 localStorage/StorageUtil 兼容的读写层；
  - UIStatusBinder：在表格/练习界面展示错题状态与计数、提供安全操作入口。
- 数据流：
  - 答题事件 -> PracticeSessionController -> ErrorQueueService.recordError / recordCorrect
  -> StorageAdapter 持久化 -> UIStatusBinder 刷新视图；
  - 连续答对计数达标 -> PendingRemovalService.moveToPendingRemoval；抽查周期触发 -> 抽查 -> 移除或回退。

```mermaid
flowchart TD
    A[用户答题] --> B{答案正确?}
    B -- 否 --> C[recordError(questionId)]
    C --> D[更新 errorCount / lastErrorTime]
    D --> E[持久化]
    E --> F[刷新 UI]
    B -- 是 --> G[recordCorrect(questionId)]
    G --> H{correctStreak >= 3?}
    H -- 否 --> E
    H -- 是 --> I[moveToPendingRemoval]
    I --> J[标记 pendingRemoval / 记录时间]
    J --> E
    K[抽查周期触发] --> L[抽取 pendingRemoval]
    L --> M{抽查答对?}
    M -- 是 --> N[finalRemove]
    M -- 否 --> O[回到错题队列 + 清零计数]
    N --> E
    O --> E
```

## 组件与接口
- ErrorQueueService（JS）：
  - `recordError(questionId)`：
    - 新增或更新错题记录：`errorCount++`，`lastErrorTime=now`，`errorTimes.push(now)`，`status=normal`，`correctStreak=0`。
  - `recordCorrect(questionId)`：
    - 若处于错题系统（normal 或 pendingRemoval），则 `correctStreak++`；当 `correctStreak>=3` 时，调用 `moveToPendingRemoval(questionId)`。
    - 若题目当前不在错题系统（从未错误或已移除），此处可忽略，或按配置决定是否计入 streak。
  - `scheduleNextSet(options)`：
    - 轮训抽取集合：支持“未做优先/仅未做”、“近期错误优先（按 lastErrorTime 降序权重）”、“FIFO”。
  - `reintegrateOnError(questionId)`：
    - 当 pendingRemoval 题目在抽查或日常模式中答错，回归错题队列并 `correctStreak=0`。
- PendingRemovalService（JS）：
  - `moveToPendingRemoval(questionId)`：
    - 将题目状态设为 `pendingRemoval`，记录 `pendingSince`。
  - `shouldAuditNow(now)`：
    - 判断抽查周期是否达到（支持“下一次错题练习会话”或“时间周期”两类配置）。
  - `runAuditCycle()`：
    - 抽取部分或全部 `pendingRemoval` 题目进行验证；
    - 调用 `finalRemove(questionId)` 或 `reintegrateOnError(questionId)`。
  - `finalRemove(questionId)`：
    - 将题目从错题系统中移除（在错题本与抽取集中不再出现），保留历史记录以供统计。
- StorageAdapter（JS）：
  - `loadErrorQuestions()` / `saveErrorQuestions(data)`：维护兼容结构；
  - `migrateIfNeeded()`：对历史数据进行字段补齐（如 `correctStreak`、`status`、`pendingSince`）。
- PracticeSessionController（JS）：
  - `onAnswerSubmit(questionId, isCorrect)`：调用队列服务并触发 UI 刷新与下一题；
  - 与现有 `showAnswer()` / 练习模式事件绑定整合。
- UIStatusBinder（JS/HTML）：
  - 在错题本表格与题目详情展示 `status`、`correctStreak`、`lastErrorTime`；
  - 提供“手动移除”“还原至错题队列”操作，包含确认弹窗与错误处理反馈（英文提醒文案）。

## 数据模型
- 存储键（兼容现有）：
  - `questions`（已有）；`errorQuestions`（扩展）
- `errorQuestions` 元素结构建议：
  ```json
  {
    "id": "string|number",                // 题目ID
    "errorCount": 3,                       // 累计错误次数
    "lastErrorTime": 1730246400000,        // 最近错误时间（ms since epoch）
    "errorTimes": [ ... ],                 // 错误时间历史
    "correctStreak": 2,                    // 连续答对计数
    "status": "normal|pendingRemoval",    // 错题状态
    "pendingSince": 1730246400000,         // 进入待移除时间（可选）
    "meta": {                              // 兼容扩展字段
      "source": "manual|import",         // 来源
      "note": "string"                   // 备注
    }
  }
  ```
- 兼容性：
  - 加载时为空字段默认：`errorCount=0`、`correctStreak=0`、`status=normal`、`errorTimes=[]`；
  - 导出/导入与批量操作模块保持键名与结构兼容。

## 错误处理
- 常见问题与策略：
  - `questionId` 缺失或无效：忽略并记录告警日志，不中断会话；
  - 本地存储写入失败：回退至内存态并提示用户（"Storage write failed"）；
  - 数据迁移异常（旧数据无法补齐）：保留基本字段并提示（"Data migration partial"），标识需要用户导出/重新导入；
  - 抽查周期解析失败（配置错误）：回退至会话周期；
  - 并发写入（多个入口同时更新）：采用“读-改-写”原子操作并在 UI 端去抖；
  - 手动移除/还原误操作：弹窗确认（"Are you sure?"），失败提示（"Action failed"）。

## 设计决策与理由
- 简化的 SRS：以 `correctStreak >= 3` 触发待移除，降低实现复杂度，同时通过抽查周期避免过早删除；
- 周期默认“会话周期”：下一次错题练习即进行抽查，用户体验更直观；可切换为时间周期（如 7 天）；
- 兼容性优先：不改变既有键名与导入导出流程；通过迁移补齐新字段；
- UI 明确反馈：状态徽章与计数展示，操作带确认与英文提示文案；
- 可扩展：后续可引入 SM-2 等更精细调度算法作为策略插件。

## 测试策略
- 单元测试（Java，位于 `src/test/java`，类名以 `Test` 结尾，方法使用 `@Test`）：
  - `ErrorQueueServiceTest`：
    - 记录错误：`recordError` 应正确更新计数与时间；
    - 记录正确：`recordCorrect` 应递增 streak 并在达标时迁移至 `pendingRemoval`；
    - 回归逻辑：抽查答错或日常答错应回归 `normal` 并清零 streak；
  - `PendingRemovalServiceTest`：
    - 周期判断：会话/时间周期配置下的 `shouldAuditNow`；
    - 抽查与移除：`runAuditCycle` 在不同答题结果下的状态变更；
  - `StorageAdapterTest`：
    - 迁移与兼容：旧数据自动补齐字段；读写原子性与错误提示。
- 集成测试（端到端自动化，保留前端事件模拟）：
  - 练习流程中错误/正确事件触发与 UI 状态刷新；
  - 连续答对 3 次后转入待移除；下一会话抽查与最终移除；
  - 手动操作（移除/还原）的确认与数据一致性。
- 覆盖边界：
  - 导入/编辑后 ID 保持与历史记录保留；
  - 无 `lastErrorTime` 的历史数据；
  - 存储异常与部分迁移的容错。

## 与现有代码的集成点
- `rror_question_practice_platform.html`：
  - 在答题判定位置（如 `showAnswer()` 或提交处理器）注入 `onAnswerSubmit(questionId, isCorrect)`；
  - 在错题本表格行上增加状态徽章与计数展示（利用现有 `data-*` 属性拓展）；
  - 与现有过滤逻辑兼容：`status=pendingRemoval` 默认不参与普通错题抽取；
  - 统一过滤面板保留已有高级筛选，与错题状态相互独立。
- 存储：沿用现有 StorageUtil/localStorage 访问方式，增加迁移与默认值逻辑。

## 配置与扩展
- 全局配置（JSON 或常量）：
  - `CORRECT_STREAK_THRESHOLD = 3`
  - `AUDIT_MODE = "session" | "time"`
  - `AUDIT_TIME_DAYS = 7`（当 `AUDIT_MODE=time` 时生效）
  - `抽取策略`：`recentErrorWeighted`、`fifo`、`onlyUnseen`、`preferUnseen`

## 迁移策略
- 读取旧版 `errorQuestions` 时自动补齐：
  - 缺少 `correctStreak` -> 0；缺少 `status` -> `normal`；缺少 `errorTimes` -> `[]`；
  - 缺少 `pendingSince` -> `null`；
- 写入时保持原键与导出结构，避免破坏其他模块（导入/批量）。

## 参考文献（链接）
- Spaced Repetition（Wikipedia）：https://en.wikipedia.org/wiki/Spaced_repetition
- Leitner System（Wikipedia）：https://en.wikipedia.org/wiki/Leitner_system
- SuperMemo SM-2（官方档案）：https://www.supermemo.com/en/archives1990-2015/english/ol/sm2

