# 拆分页面与视图容器重构（需求说明）

本特性旨在将当前单页面重构为路由驱动的多视图结构，以统一视图容器生命周期、持久化策略与导入/导出协议，确保功能等价迁移、数据兼容、性能不退化，并具备完善的自动化测试覆盖与可维护性。

## 需求列表（EARS）

1. 路由架构
   - 用户故事：作为用户，我希望通过地址栏分路由访问不同页面，以便快速定位练习、每日一练、错题本等功能。
   - 验收（EARS）：
     1) When 用户访问 `#/home|practice|daily|wrong|export|settings`，Then 正确显示对应视图。
     2) When 路由无效，Then 回退到 `#/home` 并显示英文错误文案 `Invalid route, redirected to home.`。
     3) When 路由变化，Then 触发容器 `destroy→init→render→afterRender` 链路。

2. 视图容器生命周期
   - 用户故事：作为开发者，我希望统一 `init/render/destroy/afterRender` 生命周期，以便稳定挂载与释放资源。
   - 验收：
     1) When 视图首次进入，Then 执行 `init→render→afterRender`；When 离开，Then 执行 `destroy`。
     2) Where 需要事件绑定的视图，Then 仅在 `afterRender` 执行 DOM 绑定。

3. 命名空间与键规范
   - 用户故事：作为维护者，我希望所有持久化键采用 `eqpp.*` 命名，以便统一管理与迁移。
   - 验收：
     1) When 新增或迁移键，Then 使用 `eqpp.settings|filters|questions|daily|wrong|import.meta` 等前缀。
     2) If 旧键存在，Then 读取并迁移到对应新键，迁移后保留一版兼容读取。

4. 统一持久化层
   - 用户故事：作为系统，我希望统一通过 `StorageUtil` 访问存储，必要时回退 `localStorage`。
   - 验收：
     1) When `StorageUtil` 可用，Then 所有读写通过其封装完成。
     2) If `StorageUtil` 不可用，Then 自动回退到 `localStorage` 并记录英文警告。

5. 练习与筛选等价迁移
   - 用户故事：作为用户，我希望练习功能与筛选逻辑在新架构下行为等价。
   - 验收：
     1) When 应用筛选（难度/标签/日期），Then 呈现结果与旧实现一致。
     2) If 筛选为空，Then 使用默认全集并具备分页/滚动性能不退化。

6. 每日一练
   - 用户故事：作为用户，我希望每日生成稳定题集并可重试。
   - 验收：
     1) When 生成当日题集，Then 使用固定种子 `YYYY-MM-DD`（UTC）或 `YYYY-MM-DD + seedSalt`（若设置存在）并存储于 `eqpp.daily`。
     2) If 用户重试，Then 在当日保持一致结果并记录历史（`eqpp.daily.history`）。

7. 错题本
   - 用户故事：作为用户，我希望错题自动收集与移出规则可配置。
   - 验收：
     1) When 题目答错，Then 写入 `eqpp.wrong` 并去重。
     2) If 连续正确 N 次，Then 自动移出错题本；Where 默认 `N=3`，Then 可在 `eqpp.settings.wrongRemoveThreshold` 配置。

8. 导入/导出协议
   - 用户故事：作为用户，我希望导入/导出具备清晰字段映射与 ISO8601 时间格式。
   - 验收：
     1) When 导出，Then 采用 `ISO8601` 时间与完整字段；空值保持空字符串。
     2) If 导入遇到冲突，Then 支持覆盖/合并/跳过选项并输出英文日志。
     3) When 导入未指定冲突策略，Then 默认 `merge`；Where 合并，Then 题目 `id` 去重、`tags/explanation` 合并保留，并记录英文日志。
     4) Where 字段最小集，Then 包含 `id, question, options, answer, explanation, tags, difficulty, createdAt, updatedAt`；时间采用 `UTC ISO8601`；空值为空字符串。

9. 数据兼容与迁移
   - 用户故事：作为用户，我希望旧数据无缝兼容，不丢失内容。
   - 验收：
     1) When 首次运行新架构，Then 自动读取旧键并迁移到新命名空间。
     2) Where 迁移失败，Then 提示英文错误并保留原数据。

10. 性能与可维护性
   - 用户故事：作为用户，我希望交互性能不低于原实现。
   - 验收：
     1) When 大数据量（≥5k 条），Then 列表渲染不卡顿（<100ms 首屏）。
     2) Where 图表统计，Then 支持延迟加载与聚合策略。

11. 错误处理与体验
   - 用户故事：作为用户，我希望错误提示清晰且不影响主要流程。
   - 验收：
     1) When 发生错误，Then 显示英文提示并允许重试；日志区分 warn/error。
     2) Where 异常路由或存储故障，Then 保持页面可用并回退安全状态。

12. 可测试性与自动化测试
   - 用户故事：作为维护者，我希望关键路径具备自动化测试与统一选择器。
   - 验收：
     1) When 编写测试，Then 端到端采用 Java + WebDriver；关键元素具备 `data-testid`。
     2) Where 单元测试，Then 使用 `src/test/java`、类名以 `Test` 结尾，`@Test` 注解标记方法。
     3) When 命名选择器，Then `data-testid` 采用 `eqpp-<view>-<element>` 前缀规范（如 `eqpp-practice-start-btn`）。

13. 开发运行方式
   - 用户故事：作为开发者，我希望本地无需复杂依赖即可验证。
   - 验收：
     1) When 运行 `http-server`，Then 可访问 `src/rror_question_practice_platform.html` 并通过 `hash` 路由导航。
     2) Where UI 变更，Then 预览链接可打开并验证变更。

14. 代码与文档规范
   - 用户故事：作为维护者，我希望代码注释统一中文、文案与错误提示统一英文。
   - 验收：
     1) When 提交代码，Then 注释为中文；用户可见文案与错误信息为英文。
     2) Where 新增模块，Then 补充最小 README 与关键参数说明。
