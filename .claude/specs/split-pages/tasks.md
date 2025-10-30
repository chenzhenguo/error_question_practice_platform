# 拆分页面实现计划（编码任务清单）

以下任务基于 `requirements.md` 与 `design.md`，采用增量与测试驱动方式实现。所有代码须使用中文注释；测试类位于 `src/test/java`，类名以 `Test` 结尾，测试方法使用 `@Test` 注解标记。

1. [ ] 路由与导航栏基础搭建（Hash 路由）
   - 1.1 [ ] 新建 `src/assets/js/router.js`，实现 `initRouter()`、`navigateTo(route)`、`getCurrentRoute()`，监听 `hashchange` 并在 `DOMContentLoaded` 初始化。
     - 引用：Req 1-AC1, Req 1-AC2, Req 1-AC3；Req 7-AC3
     - 说明：解析 `#overview|#manage|#practice|#errors|#stats`，未知路由显示 404 占位（英文）。
   - 1.2 [ ] 在 `src/rror_question_practice_platform.html` 添加顶部导航 DOM（五个入口），并按当前路由高亮。
     - 引用：Req 1-AC1, Req 1-AC2
     - 说明：使用语义化 `<nav>` 与数据属性标记激活项。
   - 1.3 [ ] 测试类 `src/test/java/NavigationTest.java`：验证导航切换与高亮、刷新后路由保持。
     - 引用：Req 1-AC2, Req 1-AC3
     - 要点：Selenium 加载页面、点击导航、断言激活项与 URL `hash`。

2. [ ] 存储工具封装与白名单保留策略
   - 2.1 [ ] 新建 `src/assets/js/storage.js` 安全读写：`get(key, defaultValue)`、`set(key, value)`、`remove(key)`、`clearCachePreserveData()`、`migrate()`。
     - 引用：Req 7-AC1, Req 7-AC2, Req 10-AC1
     - 说明：本地存储 JSON 解析错误时返回默认值；清理遵循白名单（`questions`、`errorQuestions`、`studyData`、`practiceSettings`、`dailyPracticeSettings`、`eqpp.questions`、`eqpp.errorQuestions`）。
   - 2.2 [ ] 在现有页面中替换直接 `localStorage.*` 调用为 `storage.js` 的封装（逐步迁移）。
     - 引用：Req 7-AC4, Req 10-AC1
     - 说明：保持行为一致，增加错误处理（英文提示）。
   - 2.3 [ ] 测试类 `src/test/java/StoragePreserveTest.java`：执行缓存清理后验证白名单键仍存在、非保留键被移除。
     - 引用：Req 7-AC2
     - 要点：模拟写入多键、调用清理、断言剩余键集合。

3. [ ] 视图容器与渲染框架
   - 3.1 [ ] 新建 `src/assets/js/view_host.js`，管理五个视图的挂载与卸载：`mount(viewId)`、`unmount()`、`render(viewId, payload)`。
     - 引用：Req 1-AC2, Req 7-AC3
     - 说明：在 `DOMContentLoaded` 后初始化；容器内做空引用检查。
   - 3.2 [ ] 在 `src/rror_question_practice_platform.html` 中为五个视图添加独立 `<section id="view-*>">` 容器与占位模板。
     - 引用：Req 1-AC1
     - 说明：默认展示 `#overview`，其他视图按需渲染。
   - 3.3 [ ] 测试类 `src/test/java/ViewHostTest.java`：切换不同路由时可见容器变化与内容占位存在性。
     - 引用：Req 1-AC2
     - 要点：断言 `#view-overview` 显示、其他视图切换后显示。

4. [ ] 数据概览视图（OverviewView）
   - 4.1 [ ] 新建 `src/assets/js/views/overview.js`：读取摘要（总题数、错题数、已练题数、今日统计），渲染卡片与趋势占位。
     - 引用：Req 2-AC1, Req 2-AC2, Req 2-AC3, Req 2-AC5
     - 说明：无数据显示英文空态与“前往开始练习”按钮，触发路由到 `#practice`。
   - 4.2 [ ] 测试类 `src/test/java/OverviewViewTest.java`：有/无 `studyData` 时的渲染差异与按钮路由跳转。
     - 引用：Req 2-AC1, Req 2-AC3, Req 2-AC5
     - 要点：Mock 本地数据、断言文案与导航行为。

5. [ ] 题库管理视图（ManageView）
   - 5.1 [ ] 新建 `src/assets/js/views/manage.js`：题目表格渲染、搜索与筛选控件（标签/来源/难度）。
     - 引用：Req 3-AC1
     - 说明：分页/虚拟化预留；初版可分页。
   - 5.2 [ ] 双击编辑模态：对列 1/5/6/7 打开编辑框，保存写回文本、`data-*` 与 `title`；事件延迟绑定避免空引用。
     - 引用：Req 3-AC2
     - 说明：沿用已实现逻辑，抽离到模块函数，中文注释，键盘与遮罩关闭。
   - 5.3 [ ] 批量编辑：行多选后应用统一修改并持久化到本地存储。
     - 引用：Req 3-AC3, Req 7-AC4
     - 说明：提供批量修改接口 `bulkUpdate(items, payload)`。
   - 5.4 [ ] 导入/导出：解析 JSON/CSV 并去重合并；导出当前筛选或全量。
     - 引用：Req 3-AC4, Req 3-AC5
     - 说明：格式错误显示英文提示；唯一键策略：`id` 或组合键（如 `title+source`）。
   - 5.5 [ ] 测试类 `src/test/java/ManageViewTest.java`：筛选、双击编辑保存、批量编辑与导入/导出流程。
     - 引用：Req 3-AC1~AC5, Req 10-AC2
     - 要点：构造样例题库、操作 UI、断言本地存储与渲染更新。

6. [ ] 开始练习视图（PracticeView）
   - 6.1 [ ] 新建 `src/assets/js/views/practice.js`：读取 `practiceSettings` 与可选 `practiceFilter:*`，生成待练队列。
     - 引用：Req 4-AC1
     - 说明：支持跳过与下一题，维护当前索引。
   - 6.2 [ ] 答案提交与反馈：即时显示正确/错误，记录到 `studyData` 与必要时 `errorQuestions`。
     - 引用：Req 4-AC2
     - 说明：英文反馈文案；写入后触发 `storage:updated`。
   - 6.3 [ ] 结束练习摘要：展示本次练习统计并写入 `studyData`。
     - 引用：Req 4-AC4
     - 说明：聚合正确率、用时、题量等指标。
   - 6.4 [ ] 测试类 `src/test/java/PracticeFlowTest.java`：队列生成、提交反馈、结束写入与摘要渲染。
     - 引用：Req 4-AC1~AC4
     - 要点：Mock 设置与题库、断言 `studyData` 增量。

7. [ ] 错题本视图（ErrorsView）
   - 7.1 [ ] 新建 `src/assets/js/views/errors.js`：加载 `errorQuestions` 列表与筛选。
     - 引用：Req 5-AC1
     - 说明：空态显示英文引导。
   - 7.2 [ ] 复习模式：按配置呈现练习流（可重用 `PracticeView` 的提交逻辑）。
     - 引用：Req 5-AC2
     - 说明：支持间隔复习占位。
   - 7.3 [ ] 纠正与移出：保存修订并可选移出错题本。
     - 引用：Req 5-AC3
     - 说明：`correct(item)` 更新后移除或标记。
   - 7.4 [ ] 测试类 `src/test/java/ErrorsViewTest.java`：加载与筛选、复习模式、纠正后移除逻辑。
     - 引用：Req 5-AC1~AC3
     - 要点：构造错题集、操作 UI、断言存储与 UI 状态。

8. [ ] 学习统计视图（StatsView）
   - 8.1 [ ] 新建 `src/assets/js/views/stats.js`：从 `studyData` 聚合（时间/标签/来源/难度），生成图表配置。
     - 引用：Req 6-AC1
     - 说明：初期使用 Chart.js 绘制折线/柱状；数据空态显示英文提示。
   - 8.2 [ ] 交互筛选：调整时间范围/维度后更新图表与摘要。
     - 引用：Req 6-AC2
     - 说明：提供事件回调与重渲染。
   - 8.3 [ ] 大数据策略：分批/抽样渲染，必要时显示骨架或进度。
     - 引用：Req 6-AC3, Req 8-AC3
     - 说明：避免主线程阻塞，按需使用 `requestAnimationFrame`。
   - 8.4 [ ] 测试类 `src/test/java/StatsViewTest.java`：聚合正确性、筛选交互与图表渲染存在性。
     - 引用：Req 6-AC1~AC3
     - 要点：构造 `studyData` 不同规模，断言摘要与 DOM 变化。

9. [ ] 清除缓存保留数据与错误处理统一
   - 9.1 [ ] 在 `storage.js` 中完善 `clearCachePreserveData()` 与错误提示（英文），并在 UI 添加统一入口按钮。
     - 引用：Req 7-AC2, Req 10-AC1
     - 说明：清理 `practiceFilter:*`、`__AUTO_RESUME__`、非保留 `eqpp.*` 键。
   - 9.2 [ ] 测试类 `src/test/java/ErrorHandlingTest.java`：存储读写失败与导入错误的提示与回退。
     - 引用：Req 10-AC1, Req 10-AC2
     - 要点：模拟异常、断言英文文案与无数据破坏。

10. [ ] 响应式与性能优化（表格列宽 & 虚拟化占位）
   - 10.1 [ ] 为不同列设置不同 `max-width` 并在移动端断点调整；统一写入 `title` 提示完整内容。
     - 引用：Req 8-AC2
     - 说明：例如：题目 120px、错误原因 100px、正确思路 140px、来源 100px；小屏放宽或折行。
   - 10.2 [ ] 大数据列表预研：为题库列表添加分页实现，并预留虚拟列表接口。
     - 引用：Req 8-AC1
     - 说明：避免一次性渲染 10k+ 条导致卡顿。
   - 10.3 [ ] 测试类 `src/test/java/ResponsivePerfTest.java`：断言不同窗口宽度下列宽与分页行为。
     - 引用：Req 8-AC1~AC2
     - 要点：Selenium 调整窗口尺寸、验证 DOM 布局。

11. [ ] 路由未知与 404 处理
   - 11.1 [ ] 在 `router.js` 为未知路由渲染 404 英文提示并提供返回 `#overview` 的链接。
     - 引用：Req 1-AC5, Req 10-AC3
     - 说明：路由解析失败统一进入该视图。
   - 11.2 [ ] 测试类 `src/test/java/NotFoundTest.java`：访问不存在路由时的文案与返回链接工作。
     - 引用：Req 1-AC5
     - 要点：导航至未知 `#abc`，断言文案与返回行为。

12. [ ] 测试框架最小化搭建（JUnit + Selenium）
   - 12.1 [ ] 新增 `pom.xml`（或 Gradle `build.gradle`）引入 JUnit 5 与 Selenium WebDriver 依赖。
     - 引用：Req 11-AC1, Req 11-AC2, Req 11-AC3
     - 说明：统一在 `src/test/java` 下组织测试；确保 `@Test` 方法可运行。
   - 12.2 [ ] `src/test/java/TestBase.java`：浏览器驱动初始化、启动本地服务器、测试清理基类。
     - 引用：Req 11-AC3
     - 要点：指向 `http://127.0.0.1:5501/src/rror_question_practice_platform.html`，封装常用选择器与断言。

13. [ ] 文档同步与注释规范
   - 13.1 [ ] 在关键 JS 文件中加入中文注释，解释路由、视图与存储逻辑；同步更新 README.md 使用方式与核心参数。
     - 引用：Req 9-AC1~AC3
     - 说明：错误与空态文案统一使用英文。

——

执行顺序建议：1 → 2 → 3 → 4/5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13，确保核心导航与数据保留策略先行、随后视图与测试逐步覆盖；每步完成后运行对应测试类，保证不出现“悬空代码”。
