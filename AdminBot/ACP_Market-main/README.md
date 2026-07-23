# ACP Market

[English](./README.en.md)

**ACP Market** 是 [AdminChat Panel](https://github.com/fxxkrlab) 的官方插件市场。开发者可以发布、分发和变现插件，用户可以一键发现和安装。

## 功能特性

- **插件注册中心** — 发布、版本管理，支持语义化版本
- **插件详情页** — 完整的插件信息、版本历史、定价、下载统计
- **审核工作流** — 多阶段审核流水线（待审核 → 通过 / 拒绝 / 需修改）
- **Ed25519 包签名** — 上传时自动签名，下载时附带签名+哈希，Panel 端可验证完整性
- **Stripe 计费** — 一次性付费和订阅制，自动生成许可证，70/30 收入分成
- **角色权限控制** — 用户、开发者、审核员、管理员、超级管理员
- **HttpOnly Cookie 认证** — 安全 JWT 认证，刷新令牌轮换，记住我功能
- **密码重置** — SMTP + SendGrid 邮件，基于令牌的重置流程
- **管理后台** — 用户管理（编辑用户名/邮箱/角色/状态）、平台统计、插件审核
- **开发者仪表盘** — 插件统计、收入追踪、CSV 导出，正确显示审核状态
- **插件市场 UI** — 搜索、分类筛选、排序、分页
- **文档站** — 11 页完整文档（用户指南 + 开发者指南），包含 API 参考、SDK 文档、设计系统规范等

## 界面预览

### 插件市场（公开页面）
![插件市场](docs/designs/01-public-marketplace.png)

### 登录 / 注册
![登录注册](docs/designs/02-login-register.png)

### 开发者仪表盘
![开发者仪表盘](docs/designs/03-developer-dashboard.png)

### 插件提交
![插件提交](docs/designs/04-plugin-submission.png)

### 收入与 Stripe 对接
![收入页面](docs/designs/05-revenue-stripe.png)

### 审核队列（审核员视角）
![审核队列](docs/designs/06-review-queue.png)

### 管理面板
![管理面板](docs/designs/07-admin-panel.png)

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│                   前端 (React)                        │
│  Vite + React 19 + Tailwind CSS v4 + Zustand          │
│  页面: 市场、登录、仪表盘、收入、审核队列、管理面板       │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (Cookie + JSON)
┌──────────────────────▼──────────────────────────────┐
│                  后端 (FastAPI)                        │
│  异步 Python 3.12 + SQLAlchemy 2.0 + asyncpg           │
│  接口: /auth, /plugins, /billing, /review, /admin      │
└──────┬───────────────┬──────────────────────────────┘
       │               │
  ┌────▼────┐   ┌──────▼──────┐
  │PostgreSQL│   │    Redis    │
  │   16     │   │     7       │
  └─────────┘   └─────────────┘
```

## 认证流程

```
┌────────┐    POST /auth/login       ┌─────────┐
│ 浏览器  │ ──────────────────────►  │  后端    │
│         │ ◄──────────────────────  │         │
│         │  Set-Cookie: acp_session  │         │
│         │  Set-Cookie: refresh      │         │
└────┬───┘                           └────┬────┘
     │                                     │
     │  GET /auth/me (Cookie 自动发送)      │
     │ ──────────────────────────────────► │
     │ ◄────────────────────────────────── │
     │        { 用户对象 }                  │
     │                                     │
     │  401 → POST /auth/refresh (Cookie)  │
     │ ──────────────────────────────────► │
     │ ◄────────────────────────────────── │
     │   刷新 Cookie                        │
```

## 插件生命周期

```
开发者                   审核员                   系统
  │                       │                       │
  │  POST /plugins        │                       │
  │  (zip + 元数据)        │                       │
  │──────────────────────►│                       │
  │                       │                       │
  │              GET /review/queue                 │
  │                       │──────────────────────►│
  │                       │                       │
  │             POST /review/:id/approve           │
  │                       │──────────────────────►│
  │                       │                 is_published=true
  │                       │                       │
  │                  插件在市场可见                  │
```

## 计费流程

```
买家            前端            后端             Stripe
  │  点击购买    │               │               │
  │────────────►│ POST /billing/checkout         │
  │             │──────────────►│               │
  │             │               │  创建会话      │
  │             │               │──────────────►│
  │             │  checkout_url  │               │
  │◄────────────│◄──────────────│               │
  │             │               │               │
  │  在 Stripe 支付              │               │
  │───────────────────────────────────────────►│
  │             │               │  Webhook 回调  │
  │             │               │◄──────────────│
  │             │               │               │
  │             │          创建许可证             │
  │             │          创建购买记录           │
  │             │          (70/30 分成)           │
```

## 快速开始

### Docker（推荐）

```bash
git clone https://github.com/fxxkrlab/ACP_Market.git
cd ACP_Market
docker compose up --build
```

| 服务       | 地址                    |
|-----------|-------------------------|
| 前端       | http://localhost:5173   |
| 后端 API   | http://localhost:8001   |
| PostgreSQL | localhost:5433          |
| Redis      | localhost:6380          |

默认管理员账号: `admin@novahelix.org` / `changeme`

### 手动部署

**前置要求:** Python 3.12+, Node.js 20+, PostgreSQL 16+, Redis 7+

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端 (另一个终端)
cd frontend
npm install
npm run dev
```

## 环境变量

复制 `.env.example` 为 `.env` 并修改：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql+asyncpg://postgres:postgres@localhost:5432/acp_market` |
| `REDIS_URL` | Redis 连接字符串 | `redis://localhost:6379/1` |
| `JWT_SECRET_KEY` | JWT 签名密钥 | `CHANGE-ME-IN-PRODUCTION` |
| `STRIPE_SECRET_KEY` | Stripe API 密钥 | (空) |
| `SMTP_HOST` | SMTP 服务器 | (空) |
| `SENDGRID_API_KEY` | SendGrid 备用 | (空) |
| `INIT_ADMIN_EMAIL` | 初始管理员邮箱 | `admin@novahelix.org` |
| `INIT_ADMIN_PASSWORD` | 初始管理员密码 | `changeme` |
| `COOKIE_SECURE` | 本地 HTTP 开发设为 `false` | `true` |
| `ED25519_PRIVATE_KEY` | Ed25519 PEM 私钥（包签名） | (空，禁用签名) |

## 项目结构

```
ACP_Market/
├── backend/
│   └── app/
│       ├── api/          # 路由处理 (auth, plugins, billing, review, admin, signing)
│       ├── models/       # SQLAlchemy ORM 模型
│       ├── schemas/      # Pydantic 请求/响应模式
│       ├── utils/        # 安全、邮件、签名、初始化工具
│       ├── config.py     # 配置管理
│       ├── database.py   # 异步数据库引擎
│       └── main.py       # FastAPI 应用入口
├── frontend/
│   └── src/
│       ├── api/          # Axios 客户端 (Cookie 认证)
│       ├── components/   # Modal, Sidebar, PluginCard, StatusBadge
│       ├── constants/    # 角色、版本号
│       ├── pages/        # 所有页面组件 (含 /docs 文档站)
│       ├── stores/       # Zustand 状态管理
│       └── utils/        # 格式化工具函数
├── docker-compose.yml
├── Dockerfile
└── docs/
```

## 版本管理

从 `v0.1.0` 开始：
- 补丁版本 (`+0.0.1`)：Bug 修复、小调整
- 次版本 (`+0.1.0`)：新功能、重大变更
- 不允许重复版本标签

## 许可证

MIT License. 详见 [LICENSE](./LICENSE)。

---

**Powered by ACP Market** | &copy; 2026 NovaHelix
