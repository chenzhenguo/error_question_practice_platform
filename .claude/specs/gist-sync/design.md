# Gist 同步（浏览器答题与配置数据）设计文档 v1

## Overview
- 目标：在浏览器内对答题相关数据集（answers、error_queue、settings、可选 progress）与单个 GitHub Gist 进行**双向手动同步**。
- 范围：
  - 数据集级选择（默认勾选 answers 与 settings；记忆上次选择）
  - Push/Pull 仅处理选中数据集；按数据集冲突检测与简易 diff + 时间戳提示
  - 一致性校验（哈希比对）、单快照回滚、最小审计记录
  - 数据规范化与去重（questionId 唯一、时间戳保留最新，全角/半角归一化）
- 非目标：多 Gist、自动/定时同步、复杂合并策略、密钥托管；本版为最小可用实现。

## Architecture
- 模块划分：
  - `GitHubClient`：调用 Gist API（获取、更新文件），使用用户提供的 token 和 gistId
  - `DatasetRepository`：读写浏览器存储的各数据集（localStorage/IndexedDB；v1 优先 localStorage）
  - `DatasetMapper`：数据集 ↔ 远端文件名映射（answers→answers.json 等）
  - `SelectionService`：数据集选择状态管理（默认勾选 answers/settings；记忆上次选择）
  - `SyncService`：Pull/Push 工作流（差异检测、冲突标记、调用 GitHubClient）
  - `HashService`：内容哈希（如 SHA-256）用于一致性校验与审计
  - `ConflictService`：冲突检测与呈现（简易 diff 文本 + 时间戳）
  - `BackupService`：单快照备份与回滚
  - `AuditService`：最小审计记录（时间戳、gistId、数据集、哈希、远端修订 ID）
  - `NormalizationService`：答案/状态归一化（全角转半角、大小写、首字母提取）
  - `SyncPanelUI`：选择数据集 + Push/Pull 入口、进度与结果展示（英文错误提示）

```mermaid
flowchart TD
    subgraph Browser
      A[SelectionService\n(选择 datasets)]
      B[DatasetRepository\n(localStorage)]
      C[SyncService]
      D[ConflictService]
      E[BackupService]
      F[AuditService]
      G[NormalizationService]
      U[SyncPanelUI]
    end

    subgraph GitHub
      H[GitHubClient\n(Gist API)]
      R[(Gist Files\nanswers.json\nerror_queue.json\nsettings.json\nprogress.json)]
    end

    U --> A
    A --> C
    C --> B
    C --> G
    C --> H
    H --> R
    C --> D
    C --> E
    C --> F
    D --> U
    E --> U
    F --> U
```

## Components and Interfaces
- `GitHubClient`
  - `getGistFiles(gistId: string): Promise<Record<string,string>>`
    - 拉取 Gist 文件名与内容（文本）
    - 401/403/404 时返回英文错误（"Unauthorized", "Forbidden", "Not Found"）
  - `updateGistFiles(gistId: string, files: Record<string,{content:string}>): Promise<{revisionId:string}>`
    - 以 PATCH 更新指定文件内容；仅传变更项
    - 返回远端修订 ID（用于审计）
  - Header：`Authorization: Bearer <token>`；`Accept: application/vnd.github+json`

- `DatasetRepository`
  - `load(dataset: 'answers'|'error_queue'|'settings'|'progress'): any`
  - `save(dataset: ... , value: any): void`
  - 存储介质：`localStorage`（键如 `eqpp.answers`、`eqpp.errorQueue`、`eqpp.settings`、`eqpp.progress`）

- `DatasetMapper`
  - `toFilename(dataset) → 'answers.json'|'error_queue.json'|'settings.json'|'progress.json'`
  - `fromFilename(name) → dataset`

- `SelectionService`
  - `getDefaultSelection(): Set<dataset>`（包含 `answers` 与 `settings`）
  - `loadLastSelection(): Set<dataset>`
  - `saveSelection(sel: Set<dataset>): void`

- `SyncService`
  - `pullSelected(sel: Set<dataset>): SyncResult`
    - 拉取远端 → 与本地对比 → 标记冲突或更新到本地（无覆盖冲突）
  - `pushSelected(sel: Set<dataset>): SyncResult`
    - 从本地选中数据集构建更新文件 → 与远端对比 → 标记冲突或更新远端
  - `computeDiff(local, remote) → DiffSummary`（键级差异，变更计数，更新时间戳）

- `HashService`
  - `hash(jsonText: string): string`（如 SHA-256）

- `ConflictService`
  - `detect(local, remote) → boolean`
  - `present(dataset, local, remote) → {diffText, timestamps}`（简易 diff 文本 + 时间戳）

- `BackupService`
  - `snapshot(sel: Set<dataset>, data: Record<dataset, any>): SnapshotId`
  - `restore(snapshotId: string): void`

- `AuditService`
  - `record(entry: {ts:number, gistId:string, datasets:string[], hashes:Record<dataset,string>, remoteRevisionIds?:Record<dataset,string>})`
  - `list(): AuditEntry[]`

- `NormalizationService`
  - `normalizeAnswer(raw: string) → string`（全角→半角、去标点、取首字母、转大写）
  - `normalizeStatus(raw: string) → 'error'|'pending_removal_audit'|'removed'`

- `SyncPanelUI`
  - 数据集勾选（默认勾选 answers/settings；记忆上次选择）
  - Push/Pull 按钮、进度条、成功/失败摘要；英文错误信息

## Data Models
- `answers.json`（数组）
  - `[ { "questionId": "string", "isCorrect": true|false, "timestamp": number } ]`
  - 去重策略：以 `questionId` 为键，仅保留最新 `timestamp` 的记录；或保留多条时以时间排序

- `error_queue.json`（数组或映射）
  - `[ { "questionId": "string", "status": "error|pending_removal_audit|removed", "pendingRemoval": boolean, "lastUpdatedAt": number } ]`
  - 状态机：error → pending_removal_audit → removed（正确回答触发移除）

- `settings.json`
  - `{ "shuffle": boolean, "mode": "practice|error", "autoNext": boolean, "accuracyWindow": number }`
  - 不包含 token；token 仅本地保存

- `progress.json`（可选）
  - `{ "currentIndex": number, "lastPracticeAt": number }`

- 远端文件命名：`answers.json`、`error_queue.json`、`settings.json`、`progress.json`

## Error Handling
- 认证错误：401/403 显示英文错误；阻止同步
- 速率限制：显示英文错误（"Rate limited"）并指导稍后重试；v1 不自动退避
- 网络错误：显示英文错误（"Network error"）；不覆盖本地
- JSON 校验失败：显示英文错误（"Invalid JSON"）；中止该数据集
- 部分成功：列出成功/失败数据集；允许单次手动重试
- 冲突：呈现简易 diff 文本 + 时间戳；仅对冲突数据集阻止覆盖；允许用户选择保留本地或保留远端
- 回滚：推送失败或哈希不匹配时触发恢复到快照

## Testing Strategy（前端 JS）
- 测试位置与规范：
  - 目录：`src/assets/js/sync/tests/`
  - 命名：`*.test.js`；每个测试文件导出/执行独立用例函数，使用轻量断言（如自定义 `assert` 或浏览器 `console.assert`）
  - 用例文案与错误提示使用英文；源码注释与说明使用中文
- 单元测试建议：
  - `datasetMapper.test.js`：数据集与文件名映射的双向一致性
  - `selectionService.test.js`：默认勾选与“记忆上次选择”持久化逻辑
  - `normalizationService.test.js`：答案/状态归一化（全角/半角、大小写、标点）
  - `conflictService.test.js`：同一数据集本地/远端差异检测与 diff 文本生成
  - `hashService.test.js`：哈希生成与比对（一致/不一致路径）
  - `syncService.pull.test.js`：选中数据集的 Pull 执行路径与部分成功报告
  - `backupService.test.js`：快照创建与恢复的正确性
- 集成/契约测试（模拟远端）：
  - 创建浏览器测试页 `src/assets/js/sync/tests/index.html`，以 `<script type="module">` 加载各 `*.test.js`，模拟 Gist API 响应（成功/错误/速率限制/部分成功），输出结果到控制台与简单摘要区域

## 关键交互流程
- Pull（选中数据集）：
  1) 读取选择（默认 answers/settings；若有记忆则覆盖默认）
  2) GitHubClient 拉取远端文件 → DatasetMapper 映射到数据集
  3) 与本地数据集比对 → 冲突则呈现 diff；无冲突则写入本地
  4) 计算哈希，写审计记录；展示英文摘要

- Push（选中数据集）：
  1) 读取选择 → 构造更新文件（仅变更数据集）
  2) 与远端比对 → 冲突则呈现 diff；无冲突则 PATCH 更新
  3) 成功后记录远端修订 ID；计算哈希与审计；失败则回滚快照

## 安全与隐私
- Token 仅保存在本地（不进 Gist）；日志脱敏
- 远端文件为公开/私有 Gist 由用户自行选择；本功能遵循用户提供的 Gist ID

## 参考资料（Research & Sources）
- GitHub REST API（Gists）：https://docs.github.com/en/rest/gists/gists?apiVersion=2022-11-28
- 认证与令牌范围（gist）：https://docs.github.com/en/rest/overview/permissions-required-for-gists
- 速率限制说明：https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting

## 设计决策与理由
- 仅手动同步（v1）：降低复杂度与出错面；用户可控
- 数据集级选择：满足“只同步所需数据”，避免误覆盖
- 简易冲突与单快照：快速落地与可恢复性平衡
- localStorage 优先：实现成本低、前端集成快；后续可切换 IndexedDB
- JSON 文件命名固定：降低映射复杂度与认知成本
