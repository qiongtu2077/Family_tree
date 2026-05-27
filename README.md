# 族谱查询系统

基于 FastAPI + Vue 3 + MySQL 的族谱查询和可视化系统。

## 功能特点

- 🌳 **交互式族谱可视化** - 支持缩放、拖拽、弹性回弹
- 🔍 **智能搜索** - 按姓名搜索并定位到目标人物
- 👤 **人物详情** - 查看照片、生平、成就等信息
- 🔗 **关系查询** - 查询任意两人之间的亲属关系
- 👑 **权限管理** - 管理员审批注册、管理人员

## 技术栈

### 后端
- **FastAPI**: 高性能 Python Web 框架
- **SQLAlchemy**: ORM 数据库操作
- **NetworkX**: 图关系处理
- **MySQL**: 关系型数据库

### 前端
- **Vue 3**: 渐进式 JavaScript 框架
- **原生 SVG**: 族谱可视化渲染
- **Vite**: 前端构建工具

## 项目结构

```
Family_tree/
├── after/              # 后端 (FastAPI)
│   ├── app/
│   │   ├── main.py     # 应用入口
│   │   ├── models.py   # 数据模型
│   │   ├── schemas.py  # 数据验证
│   │   ├── database.py # 数据库配置
│   │   ├── routers/    # API 路由
│   │   └── services/   # 业务逻辑
│   ├── uploads/        # 上传文件目录
│   ├── requirements.txt
│   └── .env
├── front/              # 前端 (Vue 3)
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── api/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 快速开始

### 1. 环境要求

- Python 3.9+
- Node.js 18+ 或 20+
- MySQL 5.7+ 或 8.0+

### 2. 数据库准备

```sql
-- 登录 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE familytree CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 退出
exit;
```

### 3. 后端设置

```bash
# 进入后端目录
cd after

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境 (Windows)
venv\Scripts\activate

# 激活虚拟环境 (Mac/Linux)
# source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（编辑 .env 文件）
# DATABASE_URL=mysql+pymysql://用户名:密码@localhost:3306/familytree?charset=utf8mb4
```

**.env 文件示例：**
```
DATABASE_URL=<ROTATED_DATABASE_URL>
APP_NAME=族谱查询系统
DEBUG=True
HOST=0.0.0.0
PORT=8000
```

```bash
# 启动后端服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 初始化管理员账号

后端启动后，访问以下地址初始化管理员：

```
POST http://localhost:8000/api/auth/init-admin
```

或使用 curl：
```bash
curl -X POST http://localhost:8000/api/auth/init-admin
```

**默认管理员账号：**
- 用户名: `admin`
- 密码: `<ROTATED_ADMIN_PASSWORD>`

### 5. 前端设置

```bash
# 进入前端目录
cd front

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 6. 访问系统

- 前端: http://localhost:3000
- 后端 API 文档: http://localhost:8000/docs

## 常见问题

### 登录失败？

1. **检查 MySQL 是否启动**

2. **测试数据库连接**
   ```bash
   cd after
   venv\Scripts\activate
   python test_db.py
   ```

3. **检查 .env 配置**
   ```
   DATABASE_URL=<ROTATED_DATABASE_URL>
   ```

4. **初始化管理员账号**（后端启动后执行）
   ```bash
   curl -X POST http://localhost:8000/api/auth/init-admin
   ```
   
   或在浏览器访问 http://localhost:8000/docs，找到 `/api/auth/init-admin` 接口点击 "Try it out" 执行。

5. **默认管理员账号**
   - 用户名: `admin`
   - 密码: `<ROTATED_ADMIN_PASSWORD>`

### 数据库连接错误？

检查 `.env` 文件中的 `DATABASE_URL` 格式：
```
mysql+pymysql://用户名:密码@主机:端口/数据库名?charset=utf8mb4
```

示例：
```
DATABASE_URL=<ROTATED_DATABASE_URL>
```

## API 接口

### 认证
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 注册申请
- `POST /api/auth/init-admin` - 初始化管理员

### 人员管理
- `GET /api/genealogy/persons` - 获取人员列表
- `POST /api/genealogy/persons` - 创建人员
- `GET /api/genealogy/persons/search?name=xxx` - 搜索人员

### 族谱
- `GET /api/genealogy/family-tree/{person_id}` - 获取族谱数据

## 族谱交互功能

- **缩放查看**: 滚轮缩放，拉远看全貌（圆点），拉近看详情（照片+名称）
- **拖拽节点**: 按住人物卡片可拖动，松开后弹性回位
- **点击查看**: 点击人物卡片查看详细信息
- **搜索定位**: 搜索后自动缩放并定位到目标人物

## 部署

### Docker 部署
参考 `deploy/` 目录下的配置文件。

### 手动部署

**后端：**
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**前端：**
```bash
npm run build
# 将 dist/ 目录部署到 Nginx
```

## 许可证

MIT
