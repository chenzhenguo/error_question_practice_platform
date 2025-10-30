# Gist 同步（浏览器答题与配置数据，需求文档 v1 精简版）

## 简介
本功能 v1 仅针对**浏览器内的答题数据与配置数据**进行与 GitHub Gist 的**双向手动同步**。不再同步规格文档。强调“先跑通基本功能，避免过度设计”。范围包含：答题历史、错题队列/状态、待移除审查状态、练习进度、用户设置（如模式、乱序、自动下一题等）。

## 需求清单（EARS）

1. 身份认证与配置（单 Gist）
   - 用户故事：作为使用者，我希望配置一个 GitHub 访问令牌与单个目标 Gist，以便手动进行推送/拉取浏览器数据。
   - 验收准则：
     1) When the user provides a GitHub token, the system shall validate token format and minimal scope (`gist`).
     2) Where configuration is saved, the system shall persist it locally in a simple config and redact tokens in logs.
     3) If the Gist ID is invalid, the system shall block sync and show an English error message.

2. 数据集范围与映射（数据级而非文档）
   - 用户故事：作为使用者，我希望明确哪些浏览器数据集参与同步，并映射到 Gist 文件（例如 `answers.json`、`error_queue.json`、`settings.json`）。
   - 验收准则：
     1) When a sync plan is created, the system shall deterministically map in-browser datasets to Gist filenames.
     2) Where dataset keys collide, the system shall apply a stable naming rule and warn the user in English.
     3) If a dataset is outside the configured scope, the system shall ignore it consistently.

3. 同步项选择（数据集级选择）
   - 用户故事：作为使用者，我希望可以在同步前勾选具体数据集（如答题历史、错题队列、设置），仅同步所选项。
   - 验收准则：
     1) When the user selects datasets to sync, the system shall only process the selected items during Push/Pull.
     2) Where a selected dataset has remote divergence, the system shall mark conflict only for that dataset.
     3) If the selection is empty, the system shall abort the sync and show an English error message.
     4) When the selection UI is shown, the system shall pre-select `answers` and `settings` by default.
     5) Where the user completes a sync, the system shall remember the last dataset selection for the next session.

4. 数据模型与兼容性
   - 用户故事：作为使用者，我希望同步的数据采用稳定的 JSON 结构与编码，使不同设备/浏览器都能兼容。
   - 验收准则：
     1) When pushing, the system shall normalize line-endings and UTF-8 encoding and validate JSON.
     2) Where unsupported characters are found, the system shall warn and preserve content safely.
     3) If a dataset exceeds Gist file limits, the system shall block with an English guidance.

5. 拉取（Pull）
   - 用户故事：作为使用者，我希望从 Gist 拉取选定的数据集到本地（浏览器存储）以更新内容。
   - 验收准则：
     1) When Pull is initiated, the system shall fetch the latest dataset files for the configured Gist.
     2) Where local changes exist, the system shall detect divergence and mark conflict status without overwriting.
     3) If a network error occurs, the system shall stop and show an English error message.

6. 推送（Push）
   - 用户故事：作为使用者，我希望将选定的本地数据集推送至 Gist，以保持远端更新。
   - 验收准则：
     1) When Push is initiated, the system shall compute a simple diff and only update changed datasets.
     2) Where remote changes exist since last pull, the system shall block unsafe overwrite and mark conflict.
     3) If the push succeeds, the system shall record the remote revision identifier per dataset locally.

7. 冲突检测与解决（简化版）
   - 用户故事：作为使用者，我希望在本地与远端存在差异时得到清晰提示，并在简化选项中选择保留本地或保留远端版本（按数据集）。
   - 验收准则：
     1) When both local and remote changed the same dataset, the system shall mark conflict and show a simple diff summary.
     2) Where the user selects resolution (keep local or keep remote), the system shall apply and persist the choice for that dataset.
     3) The system shall create a single backup snapshot before applying the resolution.
     4) When conflict is presented, the system shall display a simple diff text and timestamps for the dataset.

8. 一致性校验（基础版）
   - 用户故事：作为使用者，我希望在同步完成后进行基本的一致性校验以确保数据可靠。
   - 验收准则：
     1) When a sync completes, the system shall compute content hashes per dataset locally and compare with remote payload hashes when available.
     2) Where mismatch occurs, the system shall abort finalization and restore previous data from the last backup snapshot.
     3) If transactional writes fail mid-way, the system shall show an English error and restore previous data.

9. 版本管理与审计（最小可用）
   - 用户故事：作为使用者，我希望查看每次同步的简要版本记录，以便回溯历史（按数据集）。
   - 验收准则：
     1) When a sync is executed, the system shall persist a minimal local audit record (timestamp, gist id, datasets changed, hashes).
     2) Where remote revision IDs are available, the system shall store them in the audit trail.
     3) If rollback is requested, the system shall restore datasets to the last successful sync snapshot.

10. 速率限制与错误处理（简化版）
    - 用户故事：作为使用者，我希望在速率限制或 API 错误时得到明确提示。
    - 验收准则：
      1) When a rate limit response is received, the system shall stop and show an English error message with guidance.
      2) Where retry is requested, the system shall support a single manual retry for the last operation.
      3) If partial success occurs, the system shall report which datasets synced and which failed.

11. 安全与隐私（基础）
    - 用户故事：作为使用者，我希望令牌与日志处理安全、简洁且不复杂。
    - 验收准则：
      1) When saving secrets, the system shall avoid logging tokens and support clearing tokens.
      2) Where logs are produced, the system shall redact tokens and personal data.
      3) If a secret is missing or expired, the system shall block sync and show an English error.

12. 可观察性与可用性（最小提示）
    - 用户故事：作为使用者，我希望同步过程的状态与结果清晰可见。
    - 验收准则：
      1) When syncing, the system shall show a simple progress indicator and the current dataset being processed.
      2) Where the sync completes, the system shall display a summary (added/updated/conflicts) in English.
      3) If an error occurs, the system shall provide actionable hints and a link to retry.

13. 离线与恢复（基础）
    - 用户故事：作为使用者，我希望在网络不稳定时不丢失操作意图。
    - 验收准则：
      1) When network is unavailable, the system shall queue the intended operation metadata locally.
      2) Where connectivity returns, the system shall offer to resume the last queued sync.
      3) If the queued operation is obsolete (conflict), the system shall revalidate and prompt resolution first.

14. 同步策略（仅手动）
    - 用户故事：作为使用者，我希望在 v1 中仅手动进行推送/拉取，以保持简单可控。
    - 验收准则：
      1) When manual sync is initiated, the system shall process push or pull explicitly.
      2) The system shall not perform background syncing in this version.
      3) Options for auto or scheduled sync are out of scope for v1.

15. 数据规范化与去重
    - 用户故事：作为使用者，我希望同步的答题数据在合并后不会重复或损坏，保持正确性（如同题不同时间的记录）。
    - 验收准则：
      1) When merging answer histories, the system shall preserve latest timestamps and prevent duplicate records based on question IDs.
      2) Where normalized formats differ (e.g., full-width vs half-width answers), the system shall normalize before hashing.
      3) If dataset integrity checks fail, the system shall abort and show an English error.

16. 回滚与备份（单快照）
    - 用户故事：作为使用者，我希望在操作失误后可以快速回滚到最近一次成功版本。
    - 验收准则：
      1) When rollback is requested, the system shall restore datasets to the last successful sync snapshot.
      2) Where the snapshot exists, the system shall validate integrity before restore.
      3) If the snapshot is corrupted, the system shall skip it and warn in English.

## 边界与假设
- 仅支持**单 Gist**；仅同步**浏览器数据集**（答题历史、错题/状态、设置、进度）。
- 不支持自动/定时同步；仅手动 Push/Pull。
- 合并策略**不支持内容级自动合并**，仅提供“保留本地/保留远端”两选项（按数据集）。
- v1 的“同步项选择”仅支持**数据集级**（不支持题目子项或行级选择）。

## 待澄清项（建议）
- 具体数据集的命名与字段：如 `answers`（questionId, isCorrect, timestamp）、`errorQueue`（questionId, status, pendingRemoval）、`settings`（shuffle, mode, autoNext, accuracyWindow）。
- 练习进度是否需要同步：如当前题目索引、最近练习时间。

## 成功标准（v1）
- 手动 Push/Pull 可在典型网络下数秒内完成，提供清晰的结果摘要。
- 发生冲突时，能可靠提示并允许选择保留本地或保留远端，并生成单快照备份（按数据集）。
- 连续推送/拉取后，哈希校验一致，无数据丢失或覆盖；答题历史无重复、错题状态不混乱。
- 可在数据集级进行同步项选择，并确保未选数据集不会被触碰。
