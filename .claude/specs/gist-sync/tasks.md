# Gist 同步 v1（浏览器答题与配置数据）实现任务清单

以下任务将按照测试驱动的方式逐步实现，每一步仅包含编码可执行内容，并引用需求文档的具体条款编号（requirements.md）。测试采用纯前端 JS 测试方案（不使用 Java）。

- [ ] 1. 基础模块与目录结构初始化（引用：1, 2, 14）
  - 1.1 创建 `src/assets/js/sync/` 目录与模块入口 `sync/index.js`，暴露 `initSyncPanel()` 与核心服务实例。
    - 额外信息：采用 ES 模块结构，后续 UI 将从此入口挂载。
    - Prompt：编写 `index.js` 初始化骨架，导出空实现的服务占位。
  - 1.2 在 `src/rror_question_practice_platform.html` 中添加同步面板挂载节点与基础按钮（Push/Pull）。
    - 额外信息：尽量不影响现有页面逻辑，按钮文案与错误提示使用英文。
    - Prompt：在页面添加隐藏的 `#sync-panel` 容器与两个按钮 `#btn-push`, `#btn-pull`。

- [ ] 2. GitHubClient 实现（引用：1, 5-6, 10, 11）
  - 2.1 编写 `src/assets/js/sync/githubClient.js`，实现 `getGistFiles(gistId)` 与 `updateGistFiles(gistId, files)`。
    - 额外信息：Header 使用 `Authorization: Bearer <token>`；处理 401/403/404，返回英文错误。
    - Prompt：实现 fetch 包装与错误分支；返回 `{filename: content}` 映射与 `{revisionId}`。
  - 2.2 编写配置管理 `src/assets/js/sync/config.js`，持久化 token 与 gistId 到 `localStorage`（键：`eqpp.sync.token`, `eqpp.sync.gistId`）。
    - 额外信息：提供 `getToken()`, `setToken()`, `getGistId()`, `setGistId()`；日志脱敏。
    - Prompt：实现基础读写与校验（最小 scope `gist` 仅在调用时检查）。
  - 2.3 前端测试 `src/assets/js/sync/tests/githubClient.test.js`：模拟成功、401/403/404、rate limit 响应（使用自定义 mock fetch）。
    - 额外信息：断言英文错误消息与分支行为；控制台输出摘要。
    - Prompt：编写模块级测试函数并在测试页加载执行。

- [ ] 3. 数据集映射与本地仓库（引用：2, 4, 15）
  - 3.1 编写 `src/assets/js/sync/datasetMapper.js`：`toFilename(dataset)` 与 `fromFilename(name)`；固定映射。
    - 额外信息：`answers → answers.json`, `error_queue → error_queue.json`, `settings → settings.json`, `progress → progress.json`。
    - Prompt：实现双向映射与非法名处理（警告英文）。
  - 3.2 编写 `src/assets/js/sync/repository.js`：`load(dataset)`, `save(dataset, value)` 使用 `localStorage` 键：`eqpp.answers`, `eqpp.errorQueue`, `eqpp.settings`, `eqpp.progress`。
    - 额外信息：读写 JSON 串，失败时返回英文错误。
    - Prompt：实现安全 JSON 解析与回退默认值。
  - 3.3 前端测试 `src/assets/js/sync/tests/datasetMapper.test.js`：验证映射双向一致与非法输入。

- [ ] 4. 选择服务（默认勾选与记忆）（引用：3）
  - 4.1 编写 `src/assets/js/sync/selectionService.js`：`getDefaultSelection()`, `loadLastSelection()`, `saveSelection(sel)`。
    - 额外信息：默认包含 `answers`, `settings`；持久化键 `eqpp.sync.selection`。
    - Prompt：集合序列化为数组，空选择时后续中止。
  - 4.2 前端测试 `src/assets/js/sync/tests/selectionService.test.js`：默认值、保存与读取一致性。

- [ ] 5. 归一化与哈希服务（引用：4, 8, 15）
  - 5.1 编写 `src/assets/js/sync/normalizationService.js`：`normalizeAnswer(raw)`, `normalizeStatus(raw)`。
    - 额外信息：全角→半角、去标点、大小写；状态机安全值映射。
    - Prompt：实现常见字符集处理与单元函数。
  - 5.2 编写 `src/assets/js/sync/hashService.js`：`hash(jsonText)`（如 SHA-256，若需可用 SubtleCrypto）。
    - 额外信息：提供异步 API；失败抛英文错误。
    - Prompt：实现最小哈希包装；返回 hex 字符串。
  - 5.3 前端测试 `src/assets/js/sync/tests/normalizationService.test.js` 与 `src/assets/js/sync/tests/hashService.test.js`。

- [ ] 6. 冲突服务与简易 diff（引用：7）
  - 6.1 编写 `src/assets/js/sync/conflictService.js`：`detect(local, remote)`, `present(dataset, local, remote)`。
    - 额外信息：键级差异统计与时间戳汇总；输出“simple diff text + timestamps”。
    - Prompt：生成简易字符串摘要，包含变更计数与最近时间。
  - 6.2 前端测试 `src/assets/js/sync/tests/conflictService.test.js`：构造本地/远端差异并断言展示文本包含时间戳。

- [ ] 7. Pull 工作流（引用：5, 7, 10, 12, 13, 14, 16）
  - 7.1 编写 `src/assets/js/sync/syncService.js`：`pullSelected(sel)` 流程：获取远端→比对→冲突标记→非冲突写入本地→审计与摘要。
    - 额外信息：网络错误中止；空选择报错；进度提示与英文摘要。
    - Prompt：实现按数据集迭代与结果汇总结构。
  - 7.2 前端测试 `src/assets/js/sync/tests/syncService.pull.test.js`：模拟远端返回、空选择、网络错误、部分成功。

- [ ] 8. Push 工作流（引用：6, 7, 8, 9, 10, 12, 14, 16）
  - 8.1 在 `syncService.js` 中实现 `pushSelected(sel)`：构造变更→与远端比对→冲突则阻止覆盖→PATCH 更新→记录远端 revisionId。
    - 额外信息：仅更新变更数据集；失败触发回滚快照；哈希比对不一致则恢复。
    - Prompt：实现数据集级结果与审计写入。
  - 8.2 前端测试 `src/assets/js/sync/tests/syncService.push.test.js`：远端有变更、成功返回 revisionId、速率限制、部分成功。

- [ ] 9. 备份与回滚（单快照）（引用：7.3, 8.2, 9.3, 16）
  - 9.1 编写 `src/assets/js/sync/backupService.js`：`snapshot(sel, data)`, `restore(snapshotId)`；存储键 `eqpp.sync.snapshot`。
    - 额外信息：校验快照完整性；损坏时英文警告并跳过。
    - Prompt：实现序列化与完整性标识（含哈希）。
  - 9.2 前端测试 `src/assets/js/sync/tests/backupService.test.js`：失败后恢复到上次成功版本，损坏快照跳过。

- [ ] 10. 审计记录（最小）（引用：9）
  - 10.1 编写 `src/assets/js/sync/auditService.js`：`record(entry)`, `list()`；键 `eqpp.sync.audit`。
    - 额外信息：包含 `timestamp, gistId, datasets, hashes, remoteRevisionIds`。
    - Prompt：追加写入与读取列表，限制长度。
  - 10.2 前端测试 `src/assets/js/sync/tests/auditService.test.js`：记录与读取一致性，长度限制生效。

- [ ] 11. 可观察性与离线队列（引用：12, 13）
  - 11.1 在 `syncService.js` 增加简易进度回调与英文摘要输出（added/updated/conflicts）。
    - Prompt：设计 `onProgress(dataset, state)` 钩子并在 UI 使用。
  - 11.2 编写 `src/assets/js/sync/offlineQueue.js`：队列最近一次操作元数据，恢复时再验证冲突。
    - Prompt：实现入队/出队与过期校验。
  - 11.3 前端测试 `src/assets/js/sync/tests/offlineQueue.test.js`：离线入队、恢复提示、冲突重验证。

- [ ] 12. UI 面板与交互（引用：3, 5-6, 7, 12, 14）
  - 12.1 编写 `src/assets/js/sync/panelUI.js`：渲染数据集复选框（默认勾选 answers/settings，记忆选择），Push/Pull 按钮，状态与结果摘要。
    - 额外信息：错误提示使用英文；空选择时报错；显示“simple diff + timestamps”。
    - Prompt：实现初始化渲染与事件绑定，调用 `selectionService` 与 `syncService`。
  - 12.2 在 `index.js` 中集成 `panelUI` 并在页面入口调用 `initSyncPanel()`。
    - Prompt：完整连线，最小样式。

- [ ] 13. 数据模型与去重策略实现（引用：4, 15）
  - 13.1 在 `repository.js` 层实现 `answers` 去重：`questionId` 唯一，保留最新 `timestamp`；`error_queue` 状态流转校验。
    - Prompt：实现合并函数；失败时英文错误。
  - 13.2 前端测试 `src/assets/js/sync/tests/dataModelRules.test.js`：答案去重与状态机正确性。

- [ ] 14. 端到端集成测试（模拟 Gist）（引用：5-10, 12, 14, 16）
  - 14.1 创建测试页 `src/assets/js/sync/tests/index.html`：加载各 `*.test.js` 模块，模拟远端返回与更新，覆盖 Pull → 解决冲突 → Push → 审计与快照 → 一致性校验。
    - 额外信息：错误提示英文；不依赖真实网络；在页面上输出测试摘要。

- [ ] 15. 最终联调与清理（引用：全部）
  - 15.1 在页面启用同步面板，检查默认选择与记忆逻辑，触发 Push/Pull，观察摘要与错误提示。
    - Prompt：修复小问题，确保无未选数据集被触碰。
  - 15.2 代码与测试整理：统一命名与注释（中文注释、英文提示），移除未使用代码。

备注：
- 测试采用纯前端 JS：`src/assets/js/sync/tests/*.test.js` 与测试页 `index.html`。
- 错误提示统一使用英文；源码注释与说明使用中文。
- 每步实现均应以最小可用为目标，避免过度设计；仅手动 Push/Pull（v1）。
