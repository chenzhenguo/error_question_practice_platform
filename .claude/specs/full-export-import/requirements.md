# 全量导出/导入（含合并导入）功能需求（EARS）

## 引言（Introduction）
本功能旨在为错题练习平台（EQPP）提供完整的数据备份（全部导出）与恢复（全部导入）能力，并支持“合并导入（MERGE）”模式以在不同设备或备份版本间安全合并数据。备份与恢复的数据范围包括题库、错题、学习数据、映射数据（eqpp.*）、练习设置、每日一练设置、批次与映射模板，以及筛选规则快照（practiceFilter:*）。功能需具备稳健的错误处理、明确的用户交互提示、良好的性能，以及一致的数据映射与事件刷新机制。

---

## 1. 全量导出（Full Export）
- 用户故事：
  - 作为一名使用者，我希望可以一键导出所有练习相关数据，以便在设备迁移或数据备份时完整保留我的学习记录与设置。
- 验收标准（EARS）：
  1. 当用户点击 `全部导出` 按钮时，系统应生成一个包含 `meta` 与 `payload` 的 JSON 备份文件。
  2. 当生成 `meta` 时，系统应包含 `app="EQPP"`、`feature="full-backup"`、时间戳 `timestamp`、版本 `version` 与可选 `note` 字段。
  3. 当生成 `payload` 时，系统应包含以下键：`questions`、`errorQuestions`、`studyData`、`eqpp_questions`、`eqpp_errorQuestions`、`eqpp_studyIndex`、`practiceSettings`、`dailyPracticeSettings`、`eqpp_batches`、`eqpp_mappingTemplates`、`practiceFilters`。
  4. 如果某个数据键不存在或为空，系统应以合理的默认值导出（如对象 `{}`、数组 `[]`）。
  5. 当存在筛选规则快照时，系统应导出所有以 `practiceFilter:` 前缀命名的键至 `practiceFilters` 字段。
  6. 当备份文件组装完成时，系统应以 `eqpp_backup_{timestamp}.json` 的文件名触发下载。
  7. 如果备份体积超过合理阈值（例如 50MB），系统应给出英文警告 `Backup too large.` 并可取消导出以避免性能问题。
  8. 当导出完成时，系统应不修改任何现有本地数据状态，仅触发下载。

## 2. 全量导入（覆盖式，Overwrite）
- 用户故事：
  - 作为一名使用者，我希望从备份文件恢复全部数据，并覆盖当前数据，以在重置或替换设备时快速恢复我的学习环境。
- 验收标准（EARS）：
  1. 当用户点击 `全部导入` 按钮并选择备份文件，系统应读取文件并解析为 JSON 对象。
  2. 当解析过程中发现 `payload` 字段缺失或无效时，系统应弹出英文提示 `Invalid backup file.` 并终止导入。
  3. 当用户选择覆盖模式时，系统应将备份中的各键值完全替换当前对应键值（包括：`questions`、`errorQuestions`、`studyData`、`eqpp.questions`、`eqpp.errorQuestions`、`eqpp.studyIndex`、`practiceSettings`、`dailyPracticeSettings`、`eqpp.batches`、`eqpp.mappingTemplates`、`practiceFilter:*`）。
  4. 当覆盖写入完成时，系统应派发相关更新事件（如 `legacy:questions:updated`、`legacy:errorQuestions:updated`、`eqpp:questions:updated`、`eqpp:errorQuestions:updated`、`legacy:studyData:updated`）。
  5. 当覆盖导入完成时，系统应刷新 UI（包含列表与统计等）并弹出英文提示 `Import completed successfully.`。

## 3. 全量导入（合并式，Merge）
- 用户故事：
  - 作为一名使用者，我希望从备份文件合并数据到当前环境，以保留本地数据同时融合备份内容，避免覆盖导致的数据丢失。
- 验收标准（EARS）：
  1. 当用户选择合并模式时，系统应按 `id` 对 `questions`、`errorQuestions` 进行数组级合并，若备份项无 `id`，系统应生成唯一 `id` 并纳入合并。
  2. 当同一 `id` 的项在两个来源同时存在时，系统应以备份字段覆盖同名字段，并保留本地仅有字段（对象合并）。
  3. 当题库合并完成后，系统应重建 `eqpp.questions` 映射（与保存逻辑一致）以确保字段标准化（`question`、`answer`、`type`、`tags`、`createdAt` 等），并对 `errorQuestions` 生成对应映射（包含 `errorCount` 与 `lastErrorTime`）。
  4. 当合并 `studyData` 时，系统应对计数类字段（`totalStudyTime`、`totalAnswered`、`totalErrors`）执行求和，对 `studyDays` 取最大值，其余字段以备份覆盖。
  5. 当合并 `eqpp.studyIndex` 时，系统应对相同题目 `id` 的 `answeredCount` 求和，并取两者中较新的 `lastAnsweredTime`。
  6. 当合并 `practiceSettings` 与 `dailyPracticeSettings` 时，系统应执行对象浅合并（备份覆盖同名键，保留本地其他键）。
  7. 当合并 `eqpp.batches` 时，系统应执行数组去重合并（若元素含 `id` 则按 `id` 去重，否则按内容串去重）。
  8. 当合并 `eqpp.mappingTemplates` 时，系统应执行浅合并（备份覆盖同名模板）。
  9. 当合并 `practiceFilters` 时，系统应对同名 `practiceFilter:*` 键以备份覆盖为准。
  10. 当合并导入完成时，系统应派发相关更新事件并刷新 UI，弹出英文提示 `Merge import completed successfully.`。

## 4. 数据一致性与映射（Consistency & Mapping）
- 用户故事：
  - 作为一名使用者，我希望导出与导入后的数据在所有视图与统计中保持一致与正确，从而可靠地继续学习与做题。
- 验收标准（EARS）：
  1. 当导入（覆盖或合并）成功后，系统应确保 `eqpp.questions` 与 `questions` 在核心字段语义一致，并可被现有模块消费。
  2. 当生成或重建 `eqpp.questions` 时，系统应格式化 `tags`（统一为英文逗号分隔，过滤空值）与 `createdAt`（ISO 时间或 `YYYY-MM-DDT00:00:00`）。
  3. 当错误题映射 `eqpp.errorQuestions` 重建时，系统应包含 `errorCount`、`lastErrorTime`、`createdAt` 等所需字段。
  4. 当导入完成时，系统应保持保留键（如 `eqpp.studyIndex`、`eqpp.errorQuestions` 等）不被清理逻辑误删；当触发缓存清理时，系统应保留 `eqpp.studyIndex` 以避免答题历史数据丢失。

## 5. 交互与可用性（UI/UX）
- 用户故事：
  - 作为一名使用者，我希望导出与导入的操作简单直观，并有明确的成功/失败提示与模式选择提示。
- 验收标准（EARS）：
  1. 当用户点击 `全部导入` 时，系统应显示模式选择（例如 `Use MERGE import instead of OVERWRITE?` 的确认对话框）。
  2. 当用户选择不同模式时，系统应执行对应逻辑并给出英文结果提示（成功或失败）。
  3. 当导入失败（解析错误、结构不合法、JSON 无法读取）时，系统应显示英文错误提示（如 `Import failed.`、`Failed to read file.`）。
  4. 当页面存在导航或快捷键时，系统应不被导出/导入操作打断或造成不可恢复的 UI 状态。

## 6. 错误处理与校验（Error Handling & Validation）
- 用户故事：
  - 作为一名使用者，我需要系统在异常情况下进行安全处理，不破坏现有数据，并提示清晰的英文错误信息。
- 验收标准（EARS）：
  1. 当解析 JSON 失败时，系统应中止导入并提示 `Import failed.`。
  2. 当备份结构缺失关键字段（如 `payload`）时，系统应中止导入并提示 `Invalid backup file.`。
  3. 当对象或数组的类型与预期不符时，系统应采用默认值或跳过该键，并继续导入流程（保证鲁棒性）。
  4. 当检测到极端大文件或内存压力时，系统应提示并可中止导入操作以保护运行环境。

## 7. 性能与限制（Performance & Limits）
- 用户故事：
  - 作为一名使用者，我希望导出与导入在合理时间内完成，不显著拖慢页面响应。
- 验收标准（EARS）：
  1. 当题目条数在 2 万级规模以内时，系统应在数秒至十余秒内完成导入/导出（具体与设备性能相关）。
  2. 当进行合并导入时，系统应以线性或近线性复杂度处理数组（按 `id` 建立索引并合并）。
  3. 当下载大文件时，系统应避免阻塞 UI 主线程（使用异步与 Blob 下载）。

## 8. 测试要求（Testing Strategy Hooks）
- 用户故事：
  - 作为一名开发者，我希望具备自动化测试用例，确保导出结构与导入行为（覆盖/合并）符合预期。
- 验收标准（EARS）：
  1. 当实现功能后，系统应在 `src/test/java` 目录下提供测试类，文件名以 `Test` 结尾且测试方法使用 `@Test` 注解。
  2. 当执行“全部导出”时，测试应验证导出的 JSON 结构包含 `meta` 与完整 `payload` 键集合。
  3. 当执行“全部导入（覆盖）”时，测试应验证关键键恢复并触发刷新事件（可用浏览器驱动环境或模拟）。
  4. 当执行“合并导入”时，测试应验证按 `id` 合并、`studyData` 求和、`eqpp.studyIndex` 合并计数与取最新时间、设置浅合并、筛选规则覆盖同名键。

---

## 待澄清与约束（Open Questions & Constraints）
- 合并优先级：是否需要为特定字段定义更细化覆盖策略（例如某些字段以本地优先、某些字段以备份优先）？
- 重复检测策略：当缺失 `id` 时，是否需要基于题干+答案的内容哈希进行重复检测，而不是简单生成新 `id`？
- 文件大小上限：是否需要明确产品级上限（如 50MB）与处理策略（警告+中止或分块）？
- UI 选择模式：是否需要将“合并/覆盖”作为设置项持久化，避免每次弹窗确认？
- 安全与隐私：备份文件是否需要加密或签名校验以避免被篡改（当前不在范围，若需要可扩展）？

---

## 成功标准（Success Criteria）
- 端到端：用户可生成备份、通过覆盖或合并方式导入，操作完成后页面与统计正确刷新。
- 稳健性：异常输入不会破坏现有数据，错误提示清晰（英文）。
- 一致性：`eqpp.*` 映射与主数据一致，筛选规则与设置项在导入后保持预期行为。
- 性能：常见数据规模下导出/导入与合并在可接受时间内完成。
