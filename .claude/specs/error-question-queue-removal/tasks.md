# 实施计划（Tasks）

以下任务面向代码生成型 LLM，以测试驱动的增量方式交付。每一步都需在 `src/test/java` 下新增或完善对应测试类，类名以 `Test` 结尾、方法使用 `@Test`，并在代码中加入中文注释（提示与错误信息使用英文）。

1. [ ] 存储适配与数据迁移（StorageAdapter）
   - 目标：为错题数据新增字段并保证历史数据兼容，完成读写与迁移。
   - 参考需求：1.2、6.1、6.2、6.3
   - 代码改动：
     - 新增 `src/assets/js/storage_adapter.js`（或合并至现有 StorageUtil）：提供 `loadErrorQuestions()`、`saveErrorQuestions()`、`migrateIfNeeded()`。
     - 数据结构包含：`errorCount`、`lastErrorTime`、`errorTimes[]`、`correctStreak`、`status: normal|pendingRemoval`、`pendingSince`。
   - 测试：`src/test/java/StorageAdapterTest.java`
     - 验证迁移：旧数据缺失字段时补齐默认值（`0`、`normal`、空数组等）。
     - 验证持久化：写入与读取的一致性；错误处理提示（"Storage write failed"）。

1.1. [ ] 导出/导入兼容性补齐
   - 目标：确保导出/导入与批量模块保留并识别新字段。
   - 参考需求：6.2
   - 代码改动：
     - 修改现有导入/导出使用的读写方法，确保 `errorQuestions` 新字段不丢失。
   - 测试：`src/test/java/ExporterImporterCompatTest.java`
     - 导出后重新导入保持字段一致；批量操作不破坏错题数据结构。

2. [ ] 错题队列服务（ErrorQueueService）- 错误入队与时间记录
   - 目标：错误入队（新增或更新），维护时间与统计。
   - 参考需求：1.1、1.2、5.1
   - 代码改动：
     - 新增 `src/assets/js/error_queue_service.js`：`recordError(questionId)` 更新 `errorCount++`、`lastErrorTime=now`、`errorTimes.push(now)`、`correctStreak=0`、`status=normal`。
   - 测试：`src/test/java/ErrorQueueServiceTest.java`
     - 首次错误入队字段正确；再次错误更新计数与时间；编辑/导入后保留历史时间（除非清空）。

2.1. [ ] 错题队列服务（ErrorQueueService）- 正确计数与转待移除
   - 目标：正确答题递增连续计数，达 3 时转入待移除队列。
   - 参考需求：3.1、3.2、3.4
   - 代码改动：
     - 在 `error_queue_service.js` 中实现 `recordCorrect(questionId)`，达到阈值调用 `PendingRemovalService.moveToPendingRemoval(questionId)`。
   - 测试：`src/test/java/ErrorQueueServiceTest.java`
     - 连续答对计数递增至 3 并转移；处于 `pendingRemoval` 时不参与普通抽取。

3. [ ] 待移除队列服务（PendingRemovalService）- 转移与抽查周期
   - 目标：管理 `pendingRemoval` 状态与抽查周期触发判断。
   - 参考需求：3.2、4.1、4.2
   - 代码改动：
     - 新增 `src/assets/js/pending_removal_service.js`：实现 `moveToPendingRemoval(questionId)`、`shouldAuditNow(now)`（支持 `session`/`time` 两种模式）。
   - 测试：`src/test/java/PendingRemovalServiceTest.java`
     - 转移后 `status=pendingRemoval` 且 `pendingSince` 记录；不同模式下的周期判断正确。

3.1. [ ] 抽查执行与最终移除/回归
   - 目标：在抽查周期触发时抽取 `pendingRemoval` 并根据答题结果移除或回归。
   - 参考需求：4.2、4.3、4.4
   - 代码改动：
     - 在 `pending_removal_service.js` 中实现 `runAuditCycle()`、`finalRemove(questionId)`、`reintegrateOnError(questionId)`。
   - 测试：`src/test/java/PendingRemovalServiceTest.java`
     - 抽查答对最终移除；答错回归错题队列并清零 `correctStreak`；数据持久化正确。

4. [ ] 抽取策略与队列维护
   - 目标：实现轮训抽取集合，支持未做优先/仅未做与近期错误权重。
   - 参考需求：2.1、2.2、2.3、2.4、5.2、5.3
   - 代码改动：
     - 在 `error_queue_service.js` 中实现 `scheduleNextSet(options)`：
       - `onlyUnseen`（仅未做）过滤；`preferUnseen` 加权排序；`recentErrorWeighted` 按 `lastErrorTime` 权重；`fifo` 备选策略。
   - 测试：`src/test/java/ExtractionStrategyTest.java`
     - 不同策略下的抽取结果与排序；包含 pendingRemoval 默认不抽取。

5. [ ] 练习控制器集成（PracticeSessionController）
   - 目标：对接答题事件（正确/错误），驱动队列更新与下一题。
   - 参考需求：1.1、3.1、5.2
   - 代码改动：
     - 新增 `src/assets/js/practice_session_controller.js`：`onAnswerSubmit(questionId, isCorrect)`。
     - 在 `src/rror_question_practice_platform.html` 的判题流程（例如 `showAnswer()` 或提交处理器）中调用 `onAnswerSubmit()`。
   - 测试：`src/test/java/PracticeSessionControllerTest.java`
     - 正确/错误事件路径完整；连续答对转入待移除；错误回归清零。

6. [ ] UI 状态绑定与可视化
   - 目标：在错题本表格与题目详情显示 `status`、`correctStreak`、`lastErrorTime`，提供手动移除/还原入口。
   - 参考需求：7.1、7.2、7.3
   - 代码改动：
     - 修改 `src/rror_question_practice_platform.html`：
       - 在题目行或详情面板添加状态徽章（normal/pendingRemoval）、连续计数与最近错误时间。
       - 添加“手动移除”“还原至错题队列”按钮，含确认弹窗（英文文案）。
   - 测试：`src/test/java/UIStatusBinderTest.java`
     - 徽章与计数显示正确；确认弹窗流程与数据一致性；误操作防护。

7. [ ] 配置常量与模式切换
   - 目标：集中管理阈值与抽查模式，便于后续扩展。
   - 参考需求：4.1、设计文档“配置与扩展”
   - 代码改动：
     - 新增 `src/assets/js/config.js`：`CORRECT_STREAK_THRESHOLD=3`、`AUDIT_MODE='session'|'time'`、`AUDIT_TIME_DAYS=7` 等。
     - 各服务引用配置常量而非硬编码。
   - 测试：`src/test/java/ConfigWiringTest.java`
     - 不同配置下行为变化；参数被正确引用。

8. [ ] 编辑/导入内容变更策略与兼容性
   - 目标：当题目内容或选项变化时保留既有错题时间记录与计数策略。
   - 参考需求：1.3、边界与约束
   - 代码改动：
     - 在 `storage_adapter.js` 与相关服务中，以题目 ID 为主键维持历史；按默认策略保留计数与时间（除非显式清空）。
   - 测试：`src/test/java/EditImportCompatTest.java`
     - 编辑后记录仍在；导入覆盖不丢历史；显式清空生效。

9. [ ] 端到端整合测试（E2E）
   - 目标：覆盖主要用户路径与跨模块协同。
   - 参考需求：1.*、2.*、3.*、4.*、5.*、7.*
   - 代码改动：
     - 使用现有端到端测试框架（与 Selenium/WebDriver 集成）在 `src/test/java` 下新增 `ErrorWorkflowE2ETest.java`。
     - 场景：错误入队→轮训抽取→连续 3 次答对转入待移除→下一会话抽查→答对最终移除/答错回归。
   - 测试：验证 UI 与数据同步、状态转移、过滤兼容、确认弹窗与错误提示文案。

10. [ ] 文档与示例数据更新（仅代码关联文档）
   - 目标：更新内嵌注释与示例数据的兼容性，确保开发者可读性。
   - 参考需求：6.3、7.2
   - 代码改动：
     - 为新增 JS 文件与关键方法添加中文注释；更新 `src/assets/sample` 示例数据以包含新字段。
   - 测试：`src/test/java/SampleDataCompatTest.java`
     - 示例数据加载不报错；新字段被正确识别。

