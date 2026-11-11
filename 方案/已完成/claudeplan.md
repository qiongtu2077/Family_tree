# Claude 族谱系统优化总计划

## 0. 写在前面：这份计划要解决什么

这份计划基于当前最新 `main / origin/main`（最新提交 `812cd3e fix(graph): 修复中心上下文和画布遮挡`）以及 `方案/` 目录下已有设计文档整理。它不是单纯的 bug 清单，而是一次围绕“族谱到底应该怎么设计、怎么投影、怎么显示、怎么验证”的系统优化方案。

当前项目已经从最早的“关系型父母字段 + 前端临时画图”推进到了 `FastAPI + Neo4j + Vue + G6 + Person + FamilyUnit` 的架构，这是正确方向。但现在最核心的问题是：**数据模型已经像图了，前端也能画图了，可五个图的后端投影语义还没有完全做实**。

换句话说，当前系统不是“没有能力画族谱”，而是“每个图到底该返回哪些人、哪些家庭单元、哪些关系、哪些隐藏成胶囊，还没有形成足够稳定的工程边界”。

这会直接导致：

- 本家主线容易越画越宽。
- 姻亲谱系看起来像换了中心人物的本家主线。
- 联姻桥接容易变成两张中心图硬合并。
- 后代分支从某些人物进入时只剩一个孤立节点。
- 分支胶囊目前更多是前端兜底，不是后端有语义的折叠结果。
- 九族范围目前更多是摘要统计，不是所有中心人物视图的统一边界。

所以后续优化的核心不是先调 CSS，也不是换图形库，而是：

```text
先明确每张图的业务目标；
再明确每张图的后端投影范围；
再明确每张图的前端布局不变量；
最后才做视觉、动效和交互打磨。
```

## 1. 当前项目现状

### 1.1 技术现状

当前项目分为前端 `front/` 和后端 `after/`。

后端：

- 框架：FastAPI。
- 核心图数据库：Neo4j。
- 兼容数据库：SQLite / SQLAlchemy，主要用于旧账号、旧接口和迁移兼容。
- 核心数据访问：`after/app/repositories/graph_repository.py`。
- 图谱服务层：`after/app/services/graph_view_service.py`。
- 图谱 DTO：`after/app/graph_schemas.py`。
- 图谱路由：`after/app/routers/graph.py`。
- 管理诊断：`after/app/routers/admin.py`、`GraphRepository.get_graph_issues()`。

前端：

- 框架：Vue 3 + Vite。
- 图渲染：AntV G6。
- 图数据状态：`front/src/composables/useGraphData.js`。
- 图布局：`front/src/composables/useGraphLayout.js`。
- 主视图状态机：`front/src/views/FamilyGraphView.vue`。
- 画布组件：`front/src/components/graph/FamilyGraphCanvas.vue`。
- 工具栏：`front/src/components/graph/GraphToolbar.vue`。
- 中心人物/参数选择器：`front/src/components/graph/CenterPersonModal.vue`。
- 人物详情浮层：`front/src/components/graph/PersonDetailDrawer.vue`。

### 1.2 数据模型现状

当前项目已经使用接近正确的族谱图模型：

```text
(:Person)-[:PARTNER_IN]->(:FamilyUnit)
(:FamilyUnit)-[:HAS_CHILD]->(:Person)
(:Person)-[:PARENT_OF]->(:Person)
(:Person)-[:SPOUSE_OF]-(:Person)
```

其中：

- `Person` 表示人物。
- `FamilyUnit` 表示一次家庭/伴侣/婚姻/单亲/收养单元。
- `PARTNER_IN` 表示某人作为伴侣进入某个家庭单元。
- `HAS_CHILD` 表示家庭单元拥有子女。
- `PARENT_OF` 和 `SPOUSE_OF` 是查询辅助边，可以帮助路径和称谓计算。

这个方向是对的。真实族谱不是严格树，而是图；如果没有 `FamilyUnit`，夫妻到多个孩子会产生大量重复线，很快变成难以阅读的网。

### 1.3 五图现状

前端和后端都已经有五图入口：

```text
mainline  本家主线图
inlaw     姻亲谱系图
bridge    联姻桥接图
branch    后代分支图
overview  家族全景图
```

对应前端 API 在 `front/src/api/graph.js` 中已经存在：

- `getMainlineGraph()`
- `getInlawGraph()`
- `getBridgeGraph()`
- `getBranchGraph()`
- `getBranchGraphByRoot()`
- `getOverviewGraph()`
- `getCenterContext()`
- `getCenterCandidates()`
- `getRelationPath()`
- `getGraphIssues()`

对应后端路由也已存在于 `after/app/routers/graph.py`。

这说明工程骨架已经具备，后续不需要推倒重来。真正要补的是：五个接口背后的投影逻辑、前端布局函数的语义差异、分支胶囊和九族边界。

### 1.4 最新提交已经修复的内容

最新提交 `812cd3e` 主要修复了：

- `center-context` 查询中的 Neo4j 聚合排序问题。
- 中心人物上下文失败时的前端兜底显示。
- 人物详情栏从三列布局改为覆盖式浮层，避免压缩 G6 画布。
- `DEBUG=release` 等环境值兼容。
- 增加中心上下文和画布状态相关回归测试。

这些修复是必要的，并且方向正确。它们让界面更稳定，但没有完全解决“五图投影语义不够独立”的根问题。

## 2. 总体问题判断

### 2.1 最大问题不是 UI，而是投影边界

当前很多视觉问题，本质不是 CSS 问题，也不是 G6 问题，而是后端给前端的数据切片不够精确。

如果后端把“本家主线 + 姻亲 + 旁支 + 远端联姻 + 辅助边”都混在一份返回里，前端再聪明也只能做两件事：

1. 尽量把能摆的节点摆出来。
2. 把摆不出来的节点折叠成兜底胶囊。

这会让图谱看似能跑，但用户会不清楚：

- 为什么这个人出现在这张图？
- 为什么这个旁支被折叠？
- 为什么姻亲图和主线图差别不明显？
- 为什么桥接图有很多跟“桥接”无关的人？

所以真正的优化方向是：**后端先按视图裁剪，前端只布局当前视图应该表达的关系。**

### 2.2 第二个问题是“五图名义独立，实际复用过多”

当前实现里有几个明显复用点：

- `get_mainline_graph()` 仍然调用 `get_focus_graph()`。
- `get_inlaw_graph()` 校验配偶后直接调用 `get_focus_graph(spouse_id)`。
- `get_bridge_graph()` 是 `get_focus_graph(person_id)` 和 `get_focus_graph(spouse_id)` 的 merge。
- `layoutInlaw()` 直接返回 `layoutMainline()`。
- `layoutBridge()` 虽有独立布局，但 central family 是前端从返回数据里猜出来的。

这说明五图目前更像是“同一套图谱能力的五个入口”，还不是“产品语义清晰的五张图”。

### 2.3 第三个问题是折叠逻辑还没有业务语义

设计文档中 `BranchCapsule` 的目标很清楚：它应该告诉用户“这里隐藏了哪一支、多少人、几代、点击去哪张图”。

当前情况：

- DTO 有 `GraphBranchCapsule`。
- 服务层支持把 `raw_graph.branch_capsules` 转成前端节点。
- 前端支持渲染胶囊。
- 但后端 repository 基本没有主动生成胶囊。
- 前端 `layoutFormalCapsules()` 会把没放置的人物兜底变成“已折叠旁支”。

这会导致胶囊没有足够语义。用户看到“已折叠旁支 · 8 人”，但不知道这是配偶原生家庭、兄弟姐妹后代、祖辈旁支还是超出九族范围的人。

### 2.4 第四个问题是“九族”还没有成为统一边界

已有设计中定义了现代产品意义上的九族范围：

```text
中心人物九族范围 =
  上行四代直系祖先
  + 中心人物本人
  + 下行四代直系后代
  + 这些直系家庭单元内必要的配偶、兄弟姐妹和子女入口
```

当前 `_get_nine_kinship_summary()` 只是做了轻量统计，尚未真正成为 mainline、inlaw、bridge 的统一候选边界。

如果九族不落地，系统就会继续依赖“深度参数 + 家庭扩展”的组合逻辑，图谱范围仍然不稳定。

## 3. 优化总方向

### 3.1 数据层目标

数据层继续坚持完整图模型，不为显示方便破坏事实。

目标：

- Neo4j 保存完整人物、家庭单元、亲子、配偶、收养、顺序、可信度等关系。
- `FamilyUnit` 继续作为正式家谱图的主要语义源。
- `PARENT_OF` 和 `SPOUSE_OF` 保留为路径查询和称谓计算辅助关系。
- 不把前端坐标写入数据库作为亲缘事实。

不做：

- 不退回 SQL 自关联父母字段。
- 不在前端根据姓名、性别、出生年份猜关系。
- 不把 G6 拖拽位置当作家族结构。

### 3.2 后端投影层目标

后端必须从“返回关系图”升级为“返回某个视图需要的二维投影”。

每个视图都应该有独立投影函数：

```text
get_mainline_graph        -> _get_mainline_projection
get_inlaw_graph           -> _get_inlaw_projection
get_bridge_graph          -> _get_bridge_projection
get_branch_graph          -> _get_branch_projection
get_overview_graph        -> _get_overview_projection
get_relation_path         -> _get_relation_path_projection
```

每个投影函数都要明确：

- 输入参数是什么。
- 必须返回哪些人物。
- 必须返回哪些家庭单元。
- 必须返回哪些边。
- 哪些人必须折叠成胶囊。
- 哪些关系只进入 warning 或关系路径，不在当前图画线。
- `hidden_relation_count` 如何计算。

### 3.3 前端布局层目标

前端布局层只处理后端已经裁剪好的数据，不承担业务猜测。

目标：

- `layoutMainline()` 只布局本家主线。
- `layoutInlaw()` 只布局配偶原生家族。
- `layoutBridge()` 只布局两家桥接。
- `layoutBranch()` 只布局单根后代分支。
- `layoutOverview()` 只布局全景索引。

正式图必须满足：

```text
同代 y 相同。
父母在子女上方。
配偶同层水平连接。
FamilyUnit 不显示成可见人物节点。
单子女家庭不画多余兄弟横线。
正式图不使用 polyline 自动寻路。
```

### 3.4 产品交互目标

普通用户的默认任务是“看懂关系”，不是“管理全数据库”。

目标流程：

1. 进入系统。
2. 如果账号绑定人物，自动以本人为中心。
3. 如果没有绑定人物，先弹中心人物选择器。
4. 默认进入本家主线。
5. 点击配偶可进入姻亲谱系或联姻桥接。
6. 点击分支胶囊可进入后代分支。
7. 查询两人关系时打开关系路径面板。
8. 管理员才主要使用全景和异常诊断。

## 4. 各视图现状、问题、方向、目标

## 4.1 本家主线图 mainline

### 现状

当前后端：

- `get_mainline_graph()` 直接复用 `get_focus_graph()`。
- `get_focus_graph()` 会取中心人物、祖先、后代、祖先链兄弟姐妹，再扩展家庭单元里的伴侣和子女。

当前前端：

- `layoutMainline()` 已经存在。
- 会以 `center_person_id` 作为中心。
- 会向上布局父母家庭，向下布局子女家庭。
- 未摆放人物会由 `layoutFormalCapsules()` 兜底折叠。

### 问题

- 后端返回范围不够像“主线”，而更像“中心人物周边扩展图”。
- 祖辈旁支、兄弟姐妹后代、配偶相关人物可能进入主图。
- 前端兜底折叠无法说明隐藏内容的业务含义。
- `hidden_relation_count` 不准确或缺失。

### 方向

本家主线应该只回答：

```text
中心人物在本家血缘主线中的位置在哪里？
他的父母、祖辈、子女、孙辈在哪里？
他的同胞和配偶在哪里？
```

它不应该回答：

```text
配偶完整原生家庭是什么？
祖先兄弟姐妹所有后代是谁？
整个数据库有哪些人？
远端联姻家族怎么连接？
```

### 目标

后端目标：

- 独立实现 `_get_mainline_projection(person_id, ancestor_depth, descendant_depth)`。
- 只返回：
  - 中心人物。
  - 上行直系祖先。
  - 下行直系后代。
  - 中心人物同胞。
  - 中心人物配偶。
  - 祖先链必要配偶。
  - 中心人物和后代的子女家庭单元。
- 折叠：
  - 配偶原生家庭。
  - 兄弟姐妹深层后代。
  - 祖辈旁支。
  - 远端联姻。

前端目标：

- 中心人物视觉上明确。
- 主线人物优先居中。
- 胶囊文案能说明隐藏内容。
- 正式家谱线全部横平竖直。

验收标准：

- 配偶父母默认不出现在本家主线。
- 兄弟姐妹的孙辈默认不直接展开。
- 如果隐藏旁支，后端返回明确 `branch_capsules`。
- 单子女家庭不出现无意义横向 bus。
- 主线图不使用全景布局。

## 4.2 姻亲谱系图 inlaw

### 现状

当前后端：

- `get_inlaw_graph(person_id, spouse_id, depth)` 只校验配偶关系，然后调用 `get_focus_graph(spouse_id, depth)`。

当前前端：

- `layoutInlaw()` 直接返回 `layoutMainline(model)`。

### 问题

- 姻亲谱系没有独立数据投影。
- 当前人物没有被明确表达成“联姻入口”。
- 当前人物本家没有折叠成入口，而可能随 focus graph 逻辑混入。
- 配偶兄弟姐妹后代、配偶远端联姻没有明确裁剪规则。

### 方向

姻亲谱系应该回答：

```text
配偶来自哪个家庭？
配偶的父母、祖辈、兄弟姐妹是谁？
当前人物如何与这个家庭连接？
```

它不应该回答：

```text
当前人物完整本家是什么？
配偶兄弟姐妹配偶的原生家庭是什么？
两边所有亲戚如何互联？
```

### 目标

后端目标：

- 独立实现 `_get_inlaw_projection(person_id, spouse_id, depth)`。
- 返回：
  - 配偶本人。
  - 配偶父母家庭。
  - 配偶祖先。
  - 配偶同胞。
  - 配偶与当前人物形成的家庭单元。
  - 当前人物。
  - 共同子女一层。
- 折叠：
  - 当前人物本家。
  - 配偶兄弟姐妹后代。
  - 配偶远端联姻支系。

前端目标：

- `layoutInlaw()` 独立实现。
- 配偶作为视觉中心。
- 当前人物与配偶同层，水平连接。
- 当前人物旁边显示“本家入口”或胶囊。
- 配偶原生家庭展开在主层。

验收标准：

- `view_mode === inlaw`。
- 当前人物完整祖先不直接返回。
- 当前人物与配偶 y 相同。
- 共同子女在夫妻线下方。
- 图谱能明显看出“这是配偶家族”。

## 4.3 联姻桥接图 bridge

### 现状

当前后端：

- `get_bridge_graph()` 校验配偶关系后，调用两次 `get_focus_graph()` 并合并。

当前前端：

- `layoutBridge()` 已经有独立布局思路。
- 但中心婚姻家庭由 `findBridgeFamily()` 从返回数据中猜测。

### 问题

- 后端返回内容太宽，容易把两边 focus graph 的旁支都带入。
- 桥接图应该是“有限双家族连接图”，当前更像“两张中心图合并”。
- 多家庭单元、再婚、共同祖先时，前端猜 central family 容易错。
- 左右两边的裁剪边界不够清晰。

### 方向

联姻桥接应该回答：

```text
本家和姻亲家是如何通过这段婚姻连接的？
两边近亲结构是什么？
共同子女在哪里？
```

它不应该回答：

```text
两边所有祖先旁支分别有哪些人？
双方远亲婚配形成了哪些回环？
配偶兄弟姐妹的完整家族是什么？
```

### 目标

后端目标：

- 独立实现 `_get_bridge_projection(person_id, spouse_id, family_unit_id, depth)`。
- 返回：
  - 当前人物。
  - 配偶。
  - 指定桥接家庭单元。
  - 共同子女。
  - 当前人物父母、祖父母、同胞。
  - 配偶父母、祖父母、同胞。
- 折叠：
  - 双方兄弟姐妹后代。
  - 双方远祖旁支。
  - 跨支联姻回环。
- 如果两人有多个家庭单元，必须使用前端传入的 `family_unit_id`，不静默猜测。

前端目标：

- 当前人物固定左侧。
- 配偶固定右侧。
- 中间婚姻线水平。
- 共同子女从中间桥向下。
- 左右原生家庭不跨越中间桥。

验收标准：

- 当前人物 x 小于配偶 x。
- 当前人物与配偶 y 相同。
- 桥接线水平。
- 左侧家庭线不跑到右侧。
- 右侧家庭线不跑到左侧。
- 共同子女在桥下方。

## 4.4 后代分支图 branch

### 现状

当前后端：

- `get_branch_graph(family_unit_id, depth)` 已经按 `FamilyUnit -> HAS_CHILD -> Person -> PARTNER_IN -> FamilyUnit` 分层展开。
- `get_branch_graph_by_root(root_type='person')` 只找人物作为伴侣且有子女的家庭单元。
- 找不到时返回单个人物和“该人物暂未录入后代分支”。

当前前端：

- `loadBranchView()` 从中心人物上下文中取 `available_family_units`。
- 如果有多个家庭单元会弹选择器。
- 如果没有家庭单元，会以 `person` root 调接口。
- `layoutBranch()` 目前复用 `layoutGenealogy()`。

### 问题

- 从未婚人物、孩子、无后代人物进入 branch 时，容易只显示一个人。
- 没有实现“回退到父母家庭 / 祖先家庭”的设计要求。
- 分支图缺少“当前展示的是哪一支”的上下文说明。
- 超深、重复人物、远亲联姻的处理还不完整。

### 方向

后代分支应该回答：

```text
从某个祖先或家庭单元开始，往下传了哪些后代？
如果当前人物没有个人后代，能否展示他所在的家族分支？
```

它不应该回答：

```text
这个人物所有亲戚是谁？
配偶原生家族完整结构是什么？
全数据库有哪些人？
```

### 目标

后端目标：

- 新增 `_resolve_branch_root_for_person(person_id)`。
- 解析顺序：
  1. 本人作为伴侣且有子女的家庭单元。
  2. 本人作为子女所属的父母家庭。
  3. 能覆盖本人的上层祖先家庭。
  4. 都没有才返回单人图。
- 返回 warning：
  - “已从本人家庭展开”。
  - “该人物暂无个人后代，已回退到父母家庭分支”。
  - “未找到可展开家庭单元，仅显示本人”。

前端目标：

- 分支视图状态区显示根家庭/根人物。
- 多家庭单元选择器文案更清楚。
- 胶囊可进入更深分支。

验收标准：

- 从孩子节点进入 branch，不应默认只剩一个人。
- 从无后代但有父母的人进入 branch，应显示父母家庭分支。
- 从完全孤立人物进入 branch，才显示单人提示。
- 分支图中配偶显示为附属节点，不展开配偶原生家庭。

## 4.5 家族全景图 overview

### 现状

当前后端：

- `get_overview_graph(scope='all', max_nodes=300)` 会读取范围内人物和家庭单元。
- 超过上限会 warning。
- `scope=center:<id>` 目前复用 `get_focus_graph(center_person_id, 4)`。

当前前端：

- `layoutOverview()` 独立于主线布局。
- 会按家庭单元分簇布局人物。
- 默认不画全量边，避免毛线团。

### 问题

- `scope=center:<id>` 复用 focus graph，不是真正的“中心九族全景索引”。
- 全景筛选能力还比较弱。
- 家庭簇、孤立人物、异常人物的视觉区分还可以增强。

### 方向

家族全景应该回答：

```text
数据库里有哪些人？
哪些家庭簇互相关联？
哪些人物孤立、重复或异常？
```

它不应该承担：

```text
正式族谱阅读。
无交叉传统家谱排版。
默认解释复杂亲缘路径。
```

### 目标

后端目标：

- `overview all` 返回全部或按上限截断的人物。
- `overview center:<id>` 使用九族候选范围，而不是 focus graph。
- 支持后续参数：
  - `show_edges=all|familyOnly|parentChild|spouse`
  - `cluster_by=familyUnit|surname|component`
  - `show_issues=true|false`

前端目标：

- 返回多少人物，初始 fitView 后可见多少人物。
- 孤立人物放独立簇。
- 管理员异常可突出显示。
- 全景不冒充正式家谱图。

验收标准：

- 演示数据全景能看到全部人物。
- 超过 `max_nodes` 时明确提示。
- `overview` 不调用 `layoutMainline()`。
- FamilyUnit 不作为可见人物节点。

## 4.6 关系路径工具

### 现状

当前后端：

- 使用 `shortestPath((start)-[:PARENT_OF|SPOUSE_OF*..10]-(end))` 查路径。
- 服务层会把路径转为 `RelationPathResponse`。

当前前端：

- 关系路径是全局面板，不是五图 tab。
- 可从人物详情打开。

### 问题

- 最短路径不一定是最符合称谓习惯的路径。
- 候选路径不足。
- 关系称谓规则需要体系化。
- `FamilyUnit` 在路径解释中的语义还不够强。

### 方向

关系路径应该回答：

```text
甲和乙是什么关系？
为什么是这个称谓？
如果存在多条关系路径，还有哪些可能？
```

### 目标

后端目标：

- 从单条 shortestPath 升级为候选路径集。
- 路径评分：
  - 血缘优先。
  - 直系优先。
  - 明确关系优先。
  - 短路径优先。
  - 高可信度优先。
- 输出中文称谓和路径说明。

前端目标：

- 展示主称谓。
- 展示路径节点。
- 如果有多路径，提示 `alternative_count`。

验收标准：

- 父子、母子、祖孙、兄弟姐妹、叔伯姑舅姨、堂表、配偶能返回合理称谓。
- 多路径时不盲目只取最短姻亲路径。

## 5. 推荐实施路线

## 阶段 1：先修后代分支根解析

### 目标

解决用户最容易感知的问题：从某个人进入后代分支时，不应该轻易只显示一个孤立人物。

### 后端任务

修改 `after/app/repositories/graph_repository.py`：

1. 增加 `_get_parent_family_unit_ids(person_id)`。
2. 增加 `_get_parent_family_chain(person_id, max_depth=4)`。
3. 增加 `_resolve_branch_root_for_person(person_id)`。
4. 修改 `get_branch_graph_by_root()`。

建议逻辑：

```text
resolveBranchRoot(person):
  if person has child family:
    return own_child_family, reason=own_descendant_branch

  if person belongs to parent family:
    climb parent family chain until max depth or no parent
    return highest_covering_family, reason=ancestor_family_fallback

  return none, reason=isolated_person
```

### 前端任务

修改 `FamilyGraphView.vue`：

- branch 加载后，如果 response warnings 里说明发生回退，状态卡显示清楚。
- 参数选择器里家庭选项文案更明确，例如：
  - “张三与李四家庭 · 2 子女”
  - “父母家庭 · 张三所在支系”

### 测试

后端：

- 有子女家庭时使用本人家庭。
- 无子女但有父母家庭时回退父母家庭。
- 有祖先家庭时可回退到更上层覆盖家庭。
- 完全孤立时才返回单人图。

前端：

- `loadBranchGraph('person', id)` 正确调用。
- warning 显示不覆盖图谱。

### 验收

- 点击示例孩子进入后代分支，不再只剩本人。
- 点击无后代但属于某家庭的人，能看到所在分支。
- warning 能说明“为什么用了这个根”。

## 阶段 2：建立投影上下文 contract

### 目标

在大改 mainline/inlaw/bridge 前，先让响应中能携带视图上下文，避免前端继续猜。

### 后端任务

考虑在 `GraphViewResponse` 增加可选字段：

```text
view_context?: {
  center_person_id?: string
  spouse_id?: string
  family_unit_id?: string
  root_type?: person | familyUnit
  root_id?: string
  projection_reason?: string
}
```

如果暂时不改 schema，也可以先通过 `warnings` 和现有字段过渡。但长期建议加 `view_context`。

### 前端任务

- `useGraphData` 保存 `graph.view_context`。
- `FamilyGraphView` 状态卡显示当前视图上下文。
- `layoutBridge()` 优先使用 `view_context.family_unit_id` 找 central family。

### 测试

- 每个 graph API 返回 `view_mode` 正确。
- 有参数视图返回对应上下文。

## 阶段 3：本家主线投影独立化

### 目标

让 `mainline` 不再直接等于 `focus graph`。

### 后端任务

在 `GraphRepository` 中新增：

```text
_get_mainline_projection(person_id, ancestor_depth, descendant_depth)
```

拆分 helper：

- `_get_direct_ancestor_person_ids(person_id, depth)`
- `_get_direct_descendant_person_ids(person_id, depth)`
- `_get_sibling_person_ids(person_id)`
- `_get_required_family_units_for_mainline(person_ids)`
- `_get_spouses_for_visible_families(family_unit_ids)`
- `_build_mainline_capsules(...)`

投影规则：

- 先确定中心人物。
- 找上行直系祖先。
- 找下行直系后代。
- 加中心人物同胞。
- 加必要配偶和家庭单元。
- 不展开配偶原生家庭。
- 不展开祖辈旁支后代。
- 折叠被裁剪旁支。

### 前端任务

- `layoutMainline()` 继续使用中心人物布局。
- 胶囊不再只是放在右上角，后续可挂靠 owner person 附近。
- 状态区显示 `hidden_relation_count`。

### 测试

- 中心人物、祖先、后代、必要配偶都返回。
- 配偶父母不返回。
- 兄弟姐妹后代不直接返回。
- 有隐藏内容时返回胶囊。

## 阶段 4：姻亲谱系投影和布局独立化

### 目标

让 `inlaw` 真正成为配偶原生家族图。

### 后端任务

新增：

```text
_get_inlaw_projection(person_id, spouse_id, depth)
```

投影规则：

- 校验 person 与 spouse 关系。
- 以 spouse 为谱系中心。
- 返回 spouse 的父母、祖先、同胞。
- 返回 person 与 spouse 的共同家庭单元。
- 返回 person 作为联姻入口。
- 返回共同子女。
- 当前人物本家折叠成胶囊。

### 前端任务

实现独立 `layoutInlaw()`：

- `spouse_id` 作为主视觉中心。
- 当前人物和 spouse 同层。
- 当前人物放在 spouse 旁边，作为联姻入口。
- spouse 原生父母家庭在上方。
- 共同子女在下方。
- 当前人物本家用胶囊表达。

### 测试

- `layoutInlaw()` 不再直接调用 `layoutMainline()`。
- 当前人物与配偶 y 相同。
- 当前人物祖先不在 inlaw 直接展开。
- 共同子女在夫妻线下方。

## 阶段 5：联姻桥接投影和布局收敛

### 目标

让 bridge 成为“中间婚姻桥 + 左右近亲局部树”。

### 后端任务

新增：

```text
_get_bridge_projection(person_id, spouse_id, family_unit_id, depth)
```

投影规则：

- central family 必须确定。
- 如果未传 `family_unit_id` 且两人存在多个共同 family unit，应返回明确错误或要求选择。
- 左侧返回当前人物近亲。
- 右侧返回配偶近亲。
- 中间返回共同家庭和共同子女。
- 不返回双方兄弟姐妹的完整后代。
- 不画共同祖先回环，只返回 warning。

### 前端任务

强化 `layoutBridge()`：

- central family 从后端上下文取得。
- 当前人物固定左侧。
- 配偶固定右侧。
- 中间夫妻线水平。
- 共同子女从中间线下方展开。
- 左右父母线不越界。

### 测试

- 两人不是配偶时失败。
- 多 family unit 时需要指定。
- depth 限制有效。
- 当前人物与配偶同层。
- 左右家族不跨区。

## 阶段 6：后端胶囊体系落地

### 目标

把“折叠”变成有业务意义的后端结果。

### 后端任务

新增 helper：

```text
_build_branch_capsule(...)
_count_family_descendants(family_unit_id, max_depth)
_preview_family_descendants(family_unit_id, limit)
_count_spouse_origin_family(spouse_id)
```

胶囊类型建议：

```text
spouse_origin       配偶原生家庭
sibling_descendant  兄弟姐妹后代
ancestor_branch     祖辈旁支
inlaw_branch        姻亲旁支
depth_overflow      深度外后代
duplicate_ref       重复人物引用
```

每个胶囊至少包含：

- `id`
- `title`
- `owner_person_id`
- `root_family_unit_id`
- `relation_to_center`
- `person_count`
- `generation_count`
- `preview_names`
- `target_view`

### 前端任务

- `FamilyGraphCanvas.vue` 增加胶囊点击事件。
- `FamilyGraphView.vue` 根据胶囊 `target_view` 切换图。
- 胶囊显示 preview names 或 tooltip。
- 未放置人物兜底胶囊只作为异常防线。

### 测试

- 后端生成胶囊。
- DTO 正确转换胶囊。
- 前端胶囊不参与亲子线。
- 点击胶囊能进入目标视图。

## 阶段 7：九族边界落地

### 目标

让中心人物相关视图都有统一候选边界。

### 后端任务

新增：

```text
_get_nine_kinship_person_ids(person_id)
_get_nine_kinship_family_unit_ids(person_ids)
```

规则：

- 上行四代直系祖先。
- 下行四代直系后代。
- 中心人物本人。
- 这些家庭单元内必要配偶和子女入口。
- 配偶原生家庭不自动进入本家主线。
- 全景不受九族限制。

### 前端任务

- 工具条显示“中心人物 · 九族内”。
- 全景增加“只看中心九族”。
- warning 显示超出范围的隐藏数量。

### 测试

- 九族外人物不进入 mainline 默认结果。
- inlaw 使用配偶自己的范围，不污染当前人物本家。
- overview all 仍显示全部。
- overview center scope 使用九族候选。

## 阶段 8：关系路径称谓增强

### 目标

让关系路径工具真正解释亲缘关系。

### 后端任务

- 查询多条候选路径。
- 对路径评分。
- 计算中文称谓。
- 返回主路径和备选数量。

优先覆盖称谓：

- 父亲、母亲、儿子、女儿。
- 祖父母、外祖父母、孙辈。
- 兄弟姐妹。
- 伯叔姑、舅姨。
- 堂兄弟姐妹、表兄弟姐妹。
- 配偶、姻亲。

### 前端任务

- 关系面板显示称谓文本。
- 显示路径节点。
- 多路径提示。

### 测试

- 每类称谓有后端单测。
- 多路径时优先血缘路径。

## 阶段 9：视觉和交互收尾

### 目标

在投影语义稳定后，统一视觉和交互。

### 前端任务

- 工具栏显示：当前中心人物、当前配偶、当前家庭单元。
- 增加“适应视图 / 重排”按钮。
- 详情浮层避让画布中心。
- 胶囊样式和人物节点区分更明显。
- overview 增加筛选项。
- 移动端详情抽屉优化。

### 验收

- hover 只高亮当前节点。
- selected 只高亮边框。
- 正式图没有 polyline。
- 家族全景人物全部可见。
- 详情浮层不挤压画布。

## 6. 文件修改地图

### 后端重点文件

`after/app/repositories/graph_repository.py`

- 最大改动文件。
- 增加每个视图独立 projection。
- 增加 branch root 解析。
- 增加 capsule 生成。
- 增加九族候选。

`after/app/services/graph_view_service.py`

- 稳定转换 raw graph 到 DTO。
- 确保 `branch_capsules`、`hidden_relation_count`、warnings 输出正确。

`after/app/graph_schemas.py`

- 可选增加 `view_context`。
- 胶囊字段如不足，在这里补齐。

`after/app/services/relation_path_service.py`

- 增强路径候选和称谓。

`after/app/tests/test_graph_repository.py`

- 每个视图投影边界测试。

`after/app/tests/test_graph_view_service.py`

- DTO 转换、胶囊、warning、hidden count 测试。

### 前端重点文件

`front/src/composables/useGraphLayout.js`

- 拆出真正的 `layoutInlaw()`。
- 强化 `layoutBridge()`。
- 胶囊布局从兜底改成业务节点布局。

`front/src/components/graph/FamilyGraphCanvas.vue`

- 增加胶囊点击。
- 增加 fitView / reset 行为。
- 继续保持人物 hover/selected 克制。

`front/src/views/FamilyGraphView.vue`

- 管理 view context。
- 管理胶囊跳转。
- 管理当前配偶/家庭单元状态显示。

`front/src/components/graph/GraphToolbar.vue`

- 展示当前上下文。
- 增加重排和适应视图入口。

`front/src/tests/useGraphLayout.test.js`

- 建议拆分：
  - `layoutMainline.test.js`
  - `layoutInlaw.test.js`
  - `layoutBridge.test.js`
  - `layoutBranch.test.js`
  - `layoutOverview.test.js`

## 7. 优先级排序

如果只能先做最重要的，顺序应该是：

1. 后代分支根回退。
2. 本家主线投影收紧。
3. 姻亲谱系独立投影和独立布局。
4. 联姻桥接独立投影。
5. 后端胶囊体系。
6. 九族边界。
7. 关系路径称谓。
8. 视觉和交互收尾。

原因：

- 后代分支问题最容易被用户感知。
- 主线是默认入口，必须最清楚。
- 姻亲和桥接是五图差异的关键。
- 胶囊和九族是范围控制的根基。
- 称谓和视觉可以在结构稳定后逐步增强。

## 8. 每阶段必须验收的命令

后端测试前必须激活 Conda 环境：

```bash
conda activate familytree
cd after
pytest
```

前端：

```bash
cd front
npm run test
npm run build
```

如果改了画布、布局、交互或样式，必须启动前后端人工验收：

```bash
conda activate familytree
cd after
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd front
npm run dev
```

人工验收清单：

1. 未绑定人物时先弹中心人物选择器。
2. 选择中心人物后，本家主线再加载。
3. 本家主线中心人物明确，主线不被旁支淹没。
4. 后代分支从无后代人物进入时能回退到合理家庭分支。
5. 姻亲谱系明显是配偶原生家庭。
6. 联姻桥接明显是左右两家通过婚姻连接。
7. 全景显示返回的全部人物。
8. 胶囊文案说明隐藏了什么。
9. 胶囊点击能进入正确视图。
10. 关系路径能给出中文称谓。
11. hover 不全图高亮。
12. selected 只高亮边框。
13. 正式图没有长斜线和自动 polyline。
14. 详情浮层不挤压画布。

## 9. 风险和边界

### 9.1 最大风险

最大风险是继续试图用一张图解决所有关系。

如果把全量人物、全量关系、配偶原生家庭、旁支后代、远端联姻都塞进本家主线，那么不管用 G6、ELK 还是手写 SVG，都会出现线条交叉、节点拥挤和语义混乱。

### 9.2 技术风险

- Neo4j 查询如果一次性写太复杂，容易出现隐式聚合、性能和排序问题。
- 后端 projection helper 过多时，需要清楚命名和测试，否则后续难维护。
- 前端布局函数继续放在一个大文件里会越来越难测，后续应逐步拆分。

### 9.3 产品风险

- 用户可能以为“全景图更完整，所以应该默认看全景”。这是错误方向。
- 普通用户需要清楚，不需要全量。
- 管理员才需要全景、异常和全库索引。

### 9.4 明确不做

- 不把配偶原生家庭塞进本家主线。
- 不把所有关系都画进正式家谱图。
- 不让前端猜父母、配偶或家庭归属。
- 不保存绝对坐标当作族谱事实。
- 不先大改视觉动效。
- 不用前端兜底胶囊替代后端胶囊投影。

## 10. 最终目标

最终系统应该达到以下状态：

```text
本家主线：
  看中心人物在本家血缘中的位置。

姻亲谱系：
  看配偶原生家庭。

联姻桥接：
  看两家如何通过婚姻连接。

后代分支：
  看某一家庭单元或祖先往下传承。

家族全景：
  看数据库索引、家庭簇和异常。

关系路径：
  回答两个人是什么关系。
```

最终工程标准：

- 每个图都有独立后端投影函数。
- 每个图都有独立前端布局断言。
- 每个图都有明确范围边界。
- 每个折叠胶囊都有业务含义。
- 每个隐藏统计来自后端。
- 每个复杂关系通过路径工具解释，而不是强行画长线。

最终用户体验：

- 普通用户不会被全量关系网吓到。
- 管理员能排查全局异常。
- 图谱线条清楚、层级稳定、语义可解释。
- 当关系复杂到不能在当前图展示时，系统会用胶囊、提示和路径工具告诉用户“去哪里看”，而不是把所有东西挤在一张图上。

## 11. 一句话总结

当前项目的底层方向是正确的：`Neo4j + Person + FamilyUnit + 五图` 是适合族谱系统的架构。接下来最迫切的优化不是继续调样式，而是把每张图的后端投影边界做实，让“本家、姻亲、桥接、分支、全景”真正成为五种不同的信息切片。只有这样，前端线条、布局、交互和视觉才会稳定下来。