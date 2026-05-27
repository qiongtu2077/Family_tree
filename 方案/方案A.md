# 🌳 族谱查询系统 - 技术方案文档

## 📋 项目概述

基于 **FastAPI + Vue 3 + SVG + MySQL** 技术栈的族谱查询和显示系统。

### 项目资源
- **数据库**：MySQL（关系型数据库）
- **服务器**：4核16GiB（配置良好）

---

## 🏆 技术栈选型

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端框架 | FastAPI | 高性能异步框架，自动生成API文档 |
| 数据库ORM | SQLAlchemy | Python ORM，支持复杂关系查询 |
| 关系处理 | NetworkX | 图算法库，处理族谱关系 |
| 前端框架 | Vue 3 | 现代化前端框架 |
| 可视化 | 原生 SVG | 完全可控的族谱图绘制 |
| 数据库 | MySQL | 成熟稳定的关系型数据库 |

### 💡 为什么选择 FastAPI？

| 特性 | FastAPI | Django |
|------|---------|--------|
| 性能 | ⚡ 极快（基于 Starlette） | 中等 |
| API 文档 | ✅ 自动生成（Swagger UI） | 需手动配置 |
| 异步支持 | ✅ 原生支持 async/await | 部分支持 |
| 代码简洁度 | ✅ 更简洁，更现代 | 相对复杂 |
| 学习曲线 | ✅ 平缓 | 较陡 |

---

## 📂 项目结构（已实现）

```
Family_tree/
│
├── after/                    # 后端 (FastAPI)
│   ├── venv/                 # Python 虚拟环境
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI 应用入口
│   │   ├── models.py         # 数据库模型 (Person, User, RegistrationRequest)
│   │   ├── schemas.py        # Pydantic 数据验证
│   │   ├── database.py       # 数据库连接配置
│   │   ├── routers/
│   │   │   ├── genealogy.py  # 族谱相关接口
│   │   │   └── auth.py       # 用户认证接口
│   │   └── services/
│   │       ├── family_tree.py    # 族谱关系处理
│   │       └── email_service.py  # 邮件发送服务
│   ├── requirements.txt
│   ├── .env                  # 环境变量配置
│   └── family_tree.db        # SQLite 备用数据库
│
├── front/                    # 前端 (Vue 3)
│   ├── src/
│   │   ├── api/
│   │   │   └── genealogy.js  # API 请求封装
│   │   ├── App.vue           # 主页面（含登录、族谱图、管理面板）
│   │   └── main.js
│   ├── package.json
│   └── vite.config.js
│
├── deploy/                   # 部署配置
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   └── README.md
│
└── 方案/
    └── 方案A.md              # 本文档
```

---

## ✅ 已完成功能

### 阶段一：后端基础设施

| 步骤 | 任务 | 状态 |
|------|------|------|
| 1 | 环境搭建（Python虚拟环境、依赖安装） | ✅ 完成 |
| 2 | 数据库配置（MySQL连接） | ✅ 完成 |
| 3 | Person 数据模型（自引用关系） | ✅ 完成 |
| 4 | Pydantic 数据验证模型 | ✅ 完成 |
| 5 | NetworkX 关系处理服务 | ✅ 完成 |
| 6 | RESTful API 接口 | ✅ 完成 |

### 阶段二：前端开发

| 步骤 | 任务 | 状态 |
|------|------|------|
| 7 | Vue 3 项目初始化 | ✅ 完成 |
| 8 | 族谱可视化（SVG绘制） | ✅ 完成 |
| 9 | 缩放、拖拽交互 | ✅ 完成 |
| 10 | 搜索功能 | ✅ 完成 |
| 11 | 登录/注册系统 | ✅ 完成 |
| 12 | 管理员面板（增删改查） | ✅ 完成 |

### 阶段三：用户系统

| 步骤 | 任务 | 状态 |
|------|------|------|
| 13 | User 用户表（含真实姓名、关联Person） | ✅ 完成 |
| 14 | RegistrationRequest 注册申请表 | ✅ 完成 |
| 15 | 登录认证 API | ✅ 完成 |
| 16 | 邮件审批注册 | ✅ 完成 |
| 17 | 权限控制（管理员/普通用户/游客） | ✅ 完成 |

### 阶段四：人物详情功能

| 步骤 | 任务 | 状态 |
|------|------|------|
| 18 | Person 扩展字段（职业、地址、名言、成就） | ✅ 完成 |
| 19 | 左侧人物详情弹窗 | ✅ 完成 |
| 20 | 点击卡片显示详情 | ✅ 完成 |
| 21 | 可编辑名言和成就（本人/管理员） | ✅ 完成 |
| 22 | 注册时填写真实姓名关联族谱 | ✅ 完成 |

---

## 🗄️ 数据库设计

### persons 表（家族成员）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| name | VARCHAR(100) | 姓名 |
| gender | CHAR(1) | 性别：M/F |
| avatar | VARCHAR(255) | 头像路径 |
| birth_date | DATE | 出生日期 |
| death_date | DATE | 逝世日期 |
| is_alive | BOOLEAN | 是否健在 |
| occupation | VARCHAR(100) | 职业 |
| address | VARCHAR(255) | 地址 |
| motto | TEXT | 个人名言（本人/管理员可编辑） |
| achievements | TEXT | 个人成就（本人/管理员可编辑） |
| father_id | INT | 父亲ID（自引用外键） |
| mother_id | INT | 母亲ID（自引用外键） |
| biography | TEXT | 生平简介 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### users 表（用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| username | VARCHAR(50) | 用户名（唯一） |
| password | VARCHAR(255) | 密码（SHA256哈希） |
| email | VARCHAR(100) | 邮箱（唯一） |
| real_name | VARCHAR(100) | 真实姓名（用于关联族谱人员） |
| person_id | INT | 关联的族谱人员ID（外键） |
| is_admin | BOOLEAN | 是否管理员 |
| is_active | BOOLEAN | 是否激活 |
| created_at | DATETIME | 创建时间 |

### registration_requests 表（注册申请）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| username | VARCHAR(50) | 申请用户名 |
| password | VARCHAR(255) | 密码（哈希） |
| email | VARCHAR(100) | 邮箱 |
| real_name | VARCHAR(100) | 真实姓名 |
| status | VARCHAR(20) | 状态：pending/approved/rejected |
| token | VARCHAR(100) | 审批令牌（唯一） |
| created_at | DATETIME | 申请时间 |

---

## 🔐 用户权限系统

### 账号类型

| 类型 | 权限 | 说明 |
|------|------|------|
| 👑 管理员 | 增删改查人员、审批注册 | 默认账号：admin / <ROTATED_ADMIN_PASSWORD> |
| 👤 普通用户 | 查看族谱、搜索 | 需注册并通过审批 |
| 🚶 游客 | 查看族谱、搜索 | 无需登录 |

### 注册审批流程

```
用户提交注册 → 系统发送邮件给管理员 → 管理员点击审批链接 → 用户收到结果通知
```

---

## 🌐 API 接口

### 认证接口 `/api/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /login | 用户登录 |
| POST | /register | 提交注册申请 |
| GET | /approve/{token} | 同意注册（管理员） |
| GET | /reject/{token} | 拒绝注册（管理员） |
| POST | /init-admin | 初始化管理员账号 |

### 族谱接口 `/api/genealogy`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /persons | 获取人员列表 |
| GET | /persons/{id} | 获取单个人员 |
| GET | /persons/{id}/detail | 获取人员详细信息（含编辑权限） |
| GET | /persons/search | 搜索人员 |
| POST | /persons | 创建人员 |
| PUT | /persons/{id} | 更新人员 |
| PUT | /persons/{id}/profile | 更新个人资料（名言/成就） |
| DELETE | /persons/{id} | 删除人员 |
| GET | /family-tree/{id} | 获取族谱树数据 |

---

## 🖼️ 族谱可视化

### 布局规则

```
        祖父 ─── 祖母
             │
        父亲 ─── 母亲
             │
        ┌────┴────┐
        │         │
      孩子1     孩子2
```

### 特点

- **夫妻在同一层**：水平连线
- **父子垂直连接**：从夫妻连线中点向下
- **多子女分支**：水平展开后垂直连接
- **性别颜色区分**：男性蓝色、女性黄色
- **交互功能**：缩放、拖拽、点击查看详情

---

## 🚀 待完成功能

### 阶段五：功能增强

| 步骤 | 任务 | 优先级 |
|------|------|--------|
| 23 | 头像上传功能 | 中 |
| 24 | 族谱导出（图片/PDF） | 中 |
| 25 | 批量导入人员（Excel） | 低 |
| 26 | 多族谱支持 | 低 |
| 27 | 移动端适配 | 中 |

### 阶段六：部署上线

| 步骤 | 任务 | 状态 |
|------|------|------|
| 28 | Docker 容器化配置 | ✅ 已准备 |
| 29 | Nginx 反向代理配置 | ✅ 已准备 |
| 30 | 服务器环境部署 | ⏳ 待执行 |
| 31 | 域名配置 | ⏳ 待执行 |
| 32 | SSL 证书（HTTPS） | ⏳ 待执行 |
| 33 | 邮件服务配置 | ⏳ 待配置 |

---

## 📦 部署指南

### Docker 部署（推荐）

```bash
# 1. 上传项目到服务器
scp -r Family_tree user@server:/home/user/

# 2. 配置邮件服务
# 编辑 after/app/services/email_service.py

# 3. 启动服务
cd Family_tree/deploy
docker-compose up -d --build

# 4. 初始化管理员
curl -X POST http://localhost:8000/api/auth/init-admin
```

### 手动部署

```bash
# 后端
cd after
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 前端
cd front
npm install
npm run build
# 将 dist 目录部署到 Nginx
```

---

## 📧 邮件配置

编辑 `after/app/services/email_service.py`：

```python
EMAIL_CONFIG = {
    "smtp_server": "smtp.163.com",
    "smtp_port": 465,
    "sender_email": "your-email@163.com",    # 发送邮箱
    "sender_password": "<MAIL_APP_PASSWORD>",      # 163邮箱授权码
    "admin_email": "<ADMIN_EMAIL>"       # 管理员邮箱
}
```

---

## 🔧 开发环境

### 必需软件

| 软件 | 版本 | 用途 |
|------|------|------|
| Python | 3.9+ | 后端运行环境 |
| Node.js | 18.x+ | 前端运行环境 |
| MySQL | 8.0+ | 数据库 |
| VS Code | 最新 | 代码编辑器 |

### 启动开发服务

```bash
# 后端（端口 8000）
cd after
.\venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000

# 前端（端口 3000）
cd front
npm run dev
```

### 访问地址

- 前端：http://localhost:3000
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

---

## 📝 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2025-11-28 | v1.0 | 完成基础功能：族谱显示、搜索、缩放拖拽 |
| 2025-11-28 | v1.1 | 添加登录注册系统、权限管理 |
| 2025-11-28 | v1.2 | 添加邮件审批注册、部署配置 |
| 2025-11-28 | v1.3 | 添加人物详情弹窗、可编辑名言和成就、真实姓名关联族谱 |

---

## 🎯 总结

本项目已完成核心功能开发，包括：

1. ✅ **族谱可视化**：标准族谱布局，支持缩放拖拽
2. ✅ **人员管理**：增删改查功能
3. ✅ **用户系统**：登录、注册、权限控制
4. ✅ **邮件审批**：注册需管理员审批
5. ✅ **人物详情**：点击卡片显示详细信息弹窗
6. ✅ **个人资料编辑**：本人和管理员可编辑名言、成就
7. ✅ **部署配置**：Docker + Nginx 配置就绪

下一步：
- 配置邮件服务
- 部署到服务器
- 配置域名和 SSL

