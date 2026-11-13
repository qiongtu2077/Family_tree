# 族谱系统

基于 FastAPI、PostgreSQL、Vue 3 与 AntV G6 的族谱管理与可视化系统。账号、人物、家庭单元及亲缘关系统一保存在 PostgreSQL；通过关系表和图查询服务提供家谱视图、亲缘路径与异常诊断。

## 核心能力

- 登录与角色权限：使用服务端会话和 HttpOnly Cookie，刷新页面后恢复登录，区分普通用户与管理员权限。
- 人物、家庭单元与关系管理：管理员维护人物档案、家庭成员、伴侣和生养关系，普通用户编辑本人资料并上传头像与照片。
- 五种家谱视图：本家主线、姻亲谱系、联姻桥接、后代分支和家族全景，支持中心人物导航与折叠分支入口。
- 姓名检索：人物搜索、中心选择、家庭与关系管理支持中文、完整拼音和首拼，例如“张明远”可输入 `zmy`、`ZMY` 或 `zhangmingyuan`，忽略空白。
- 关系路径查询：查询两人之间的亲缘路径并生成中文解释。
- 管理员诊断：检测孤立人物、多重生父/生母、祖先循环等异常关系。
- 旧数据迁移：保留原 SQLite 文件和 Neo4j 数据卷，导入 PostgreSQL 后核对。

## 图谱浏览与资料维护

| 视图 | 浏览范围 |
| --- | --- |
| 本家主线 | 以中心人物展开本家祖先、后代及相关家庭。 |
| 姻亲谱系 | 选择配偶，查看配偶原生家庭及与中心人物的连接。 |
| 联姻桥接 | 以所选婚姻连接双方原生家庭。 |
| 后代分支 | 从人物或家庭单元展开后代，按代数控制范围。 |
| 家族全景 | 独立计算真实关系连通分量并排列，保留各支系的关系线；支持全部家族和中心九族范围。 |

人物卡片只显示姓名，年份、生平和照片放在详情栏。同一人物在一张图中只出现一次；家庭单元用于组织关系，不渲染成可见的中间人物。布局按代际分层、排列伴侣与子女，关系线使用明确的水平和垂直线段，保留多次婚姻、生育与收养、共同祖先等关系。缩放到低于 45% 时收起姓名，放大后恢复；悬停和选中仅突出当前人物边框。

画布支持拖动、滚轮缩放、放大/缩小、恢复 100%、适应视图、回到中心和缩略图导航。缩放范围为 8%–250%；画布获得焦点后可用 `+` / `-` 缩放、`0` 适应视图、方向键平移。窗口尺寸变化会保持当前倍率和观察位置；切换视图时适配新图，较大的正式家谱优先定位到可读的中心人物。

登录状态由服务端校验，浏览器本地保存的用户信息不能充当凭据。普通用户可浏览族谱、查询关系，并编辑账号已绑定人物的职业、居住地、名言、成就、生平、头像和照片。管理员可编辑任意人物资料，维护人物、家庭与亲缘关系，审批注册申请并查看图谱诊断。未绑定人物的账号会显示提示。

删除家庭或成员身份会保留人物资料、独立录入的亲缘事实和没有来源标记的历史事实，只清除失去全部家庭来源的明确派生关系。家庭仍支持的亲子或配偶关系需要通过家庭成员资料纠错；生育和收养事实分别维护。

## 技术栈

- 后端：FastAPI、SQLAlchemy、Psycopg 3。
- 数据库：PostgreSQL 18，统一存储账号与族谱数据。
- 前端：Vue 3、Vite、AntV G6、自定义家谱投影布局。
- 测试：pytest、Vitest coverage。
- 部署：Docker Compose、Nginx。

## 目录结构

```text
Family_tree/
├── after/
│   ├── app/
│   │   ├── repositories/     # PostgreSQL 数据访问层
│   │   ├── routers/          # API 路由
│   │   ├── services/         # 图谱、路径查询、校验与迁移服务
│   │   └── tests/            # 后端测试
│   ├── uploads/              # 头像与照片，独立持久化
│   ├── .env.example
│   └── requirements.txt
├── front/
│   ├── src/
│   └── package.json
├── deploy/
│   ├── docker-compose.postgres.yml  # 只启动本地 PostgreSQL
│   ├── docker-compose.yml           # 完整应用部署
│   ├── docker-compose.neo4j.yml     # 仅保留为历史迁移源
│   └── README.md
└── 方案/
```

## 本地开发

无需另外安装 PostgreSQL 桌面程序；已有 Docker Desktop 时可直接运行官方 PostgreSQL 镜像。没有 Docker 时也可安装 PostgreSQL 18，再按相同连接参数配置。

在 `deploy/.env` 中设置自选密码（文件已被 Git 忽略，不要提交凭据）：

```dotenv
POSTGRES_PASSWORD=<set-a-local-password>
```

在项目根目录启动数据库：

```powershell
docker compose --env-file deploy/.env -f deploy/docker-compose.postgres.yml up -d
```

数据库只监听 `127.0.0.1:5432`，默认数据库与用户名均为 `familytree`。复制 `after/.env.example` 为 `after/.env`，将 `POSTGRES_PASSWORD` 改为同一密码，并设置本地账号密码。连接参数分项配置，密码无需自行做 URL 转义。

启动后端前，必须激活项目专用 Conda 环境 `familytree`；不存在该环境时先创建，禁止在默认环境执行项目 Python 命令：

```powershell
conda create -n familytree python=3.11
conda activate familytree
cd after
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

已有环境可跳过 `conda create`。另开终端启动前端：

```powershell
cd front
npm ci
npm run dev
```

打开 [本地前端](http://localhost:3000) 或 [API 文档](http://localhost:8000/docs)。完整 Docker 部署、备份与旧数据处理见 [部署指南](deploy/README.md)。

## 初始化与旧数据

新建空库时可初始化本地演示账号与族谱，需先设置 `FAMILYTREE_ADMIN_PASSWORD`、`FAMILYTREE_TEST_PASSWORD`：

```powershell
conda activate familytree
cd after
python -m app.init_system
```

若只需要管理员账号，设置 `FAMILYTREE_ADMIN_PASSWORD` 后调用 `POST /api/auth/init-admin`；已有管理员时该入口关闭。账号密码依次读取显式进程环境变量、`after/.env`、根目录未跟踪的 `账密.txt`；显式空密码会阻止初始化。注册申请可在管理员的账号审批面板中处理，配置 SMTP 后也可通过邮件确认页审批。

已有真实数据时先做迁移与核对，再决定是否添加演示数据。原 `after/family_tree.db`、Neo4j 数据卷和 `after/uploads/` 都应保留；切换配置不会自动导入旧数据，也不要使用 `docker compose down -v` 清理历史数据。Neo4j 专用 Compose 仅供启动原实例作为迁移源，应用运行不再依赖 Neo4j。

从项目根目录打开终端，迁移 SQLite 账号和旧 Neo4j 图数据：

```powershell
conda activate familytree
cd after
pip install -r requirements-migration.txt
python -m app.migrate_postgres --sqlite-path ./family_tree.db --neo4j-uri bolt://127.0.0.1:7687
```

目标库读取 `after/.env` 的 PostgreSQL 配置，必须为空库。Neo4j 密码通过 `NEO4J_PASSWORD` 环境变量或 `--source-env <旧配置文件>` 提供，不写入命令行。只开放 HTTP 端口的旧实例可使用 `--neo4j-uri http://127.0.0.1:7474`，无需安装迁移专用 Driver。导出快照默认保存在未跟踪的 `.runtime/postgres-migration/snapshot.json`；使用 `--export-only` 仅备份，使用 `--from-snapshot <快照路径>` 离线导入。迁移拒绝覆盖已有目标记录，原文件和数据卷不会被删除。

## 主要 API

迁移后人物 ID 统一为稳定字符串，新图谱 API 路径保持不变。旧 `/api/genealogy` 接口也读取同一人物表；旧人物接口的 `father_id`、`mother_id` 仅允许原值回传，关系变更会返回 409 并指向 `/api/relationships`，避免旧单值字段覆盖多组生养关系。数据库初始化入口改为 `POST /api/admin/init-database`。

- `GET /api/graph/focus/{personId}`：中心人物本家主线图。
- `GET /api/graph/mainline/{personId}`：本家主线图。
- `GET /api/graph/inlaw/{personId}/{spouseId}`：指定配偶的姻亲谱系。
- `GET /api/graph/bridge?person_id={id}&spouse_id={id}`：指定配偶及可选家庭的联姻桥接。
- `GET /api/graph/branch/{familyUnitId}`：后代分支图。
- `GET /api/graph/overview`：全部家族或中心范围全景。
- `GET /api/graph/relation-path?from={id}&to={id}`：两人关系路径。
- `GET /api/auth/me`：恢复并校验 Cookie 会话。
- `POST /api/auth/logout`：注销当前服务端会话。
- `GET /api/persons`：人物列表。
- `POST /api/persons`：创建人物。
- `PATCH /api/persons/{personId}`、`DELETE /api/persons/{personId}`：管理员修改、删除人物。
- `GET /api/family-units`：完整家庭与成员列表。
- `POST /api/family-units`：创建家庭单元。
- `PATCH /api/family-units/{familyUnitId}`、`DELETE /api/family-units/{familyUnitId}`：修改、删除家庭。
- `GET /api/relationships`：家庭成员与直接亲缘事实列表。
- `POST /api/relationships`：创建伴侣、子女、亲子或配偶关系。
- `DELETE /api/relationships/{relationshipId}`：删除成员身份或独立关系。
- `PUT /api/genealogy/persons/{personId}/profile`：本人或管理员更新个人资料。
- `POST /api/genealogy/persons/{personId}/avatar`、`POST /api/genealogy/persons/{personId}/photo`：本人或管理员上传图片。
- `GET /api/admin/graph-issues`：管理员图谱异常诊断。

## 测试

前端测试与构建：

```powershell
cd front
npm run test
npm run build
npm audit
```

后端测试前先激活项目环境，并按测试文档配置独立测试数据库，避免将测试指向真实族谱库：

```powershell
conda activate familytree
cd after
pytest
```

五图几何、会话权限、管理功能和真实浏览器巡检的范围、运行参数与产物见 [测试说明](方案/测试.md)。浏览器巡检使用已有管理员及真实页面，默认只读取现有族谱；需显式设置 `FAMILYTREE_E2E_PREPARE_DATA=1` 才初始化演示数据。
