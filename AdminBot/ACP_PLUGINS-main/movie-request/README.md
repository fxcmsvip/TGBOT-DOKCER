# TMDB 求片插件 (Movie Request)

ADMINCHAT Panel 的 TMDB 影视求片管理插件，支持多 Key 轮替、媒体库查重、确认式求片、版本/缺集检测与 Webhook 推送。

> **[English README](README_EN.md)**

## 功能概览

### Telegram Bot 端
- 用户通过 `/req <TMDB链接>` 或群聊 `@bot req <TMDB链接>` 提交求片
- **富文本卡片回复**：海报、标语、时长、国家、导演/创作者、主演 Top3、简介、IMDB/TMDB 链接
- **两步确认流程**：先展示卡片预览 + ✅确认/❌取消 按钮，确认后才入库
- **媒体库查重**：自动查询外部数据库/API 判断是否已有该影视

### 电影补片
- 库里有 1080p 但缺 4K → 提供 "✅ 补片 4K" 按钮
- 库里有 4K 但缺 1080p → 提供 "✅ 补片 1080p" 按钮
- 两种都有 → 纯展示，不提供按钮
- 只检测 1080p / 4K，忽略 720p、DoVi 等

### TV 剧集补集
- **紧凑季度摘要**：`23季在库 | ✓ 20季完整 | ⚠️ 3季缺集`
- **缺集检测**：对比 TMDB 每季总集数 vs 库内实际集数
- **整季补集按钮**：最多 3 个最缺季度的 "✅ 补S21(缺11集)" 按钮
- **单集精确补集**：回复机器人的媒体库卡片消息，输入 `S21E15` 即可精确补单集
- **路径回退查询**：当 tmdb 字段为空时，自动通过 `path LIKE '%[tmdbid=XXX]%'` 捞取文件
- **媒体类型过滤**：防止 tmdb_id 碰撞（如 `/movie/4614` vs `/tv/4614`）

### 管理后台
- 求片列表：海报、标题、TMDB ID、评分、求片人数、库内状态
- 三个操作按钮：✓ 完成（可推送 Webhook）、✗ 拒绝、🗑 删除
- 补片标签：橙色 `补片 4K` / `补片 S21` / `补片 S21E15` 标签
- 分页 + 状态筛选（All / Pending / Fulfilled / Rejected）

### Settings → Request Config
- **TMDB API Keys**：多 Key 管理，支持 v3 API Key 和 v4 Bearer Token
- **Media Library Check**：多数据库/API 连接，卡片式管理，支持编辑
- **Fulfill Webhook**：求片完成后推送到外部系统

---

## 安装

1. 通过 ACP Market 安装，或手动将 `movie-request/` 文件夹放入 Panel 的插件目录
2. 在 Panel → Market → Installed 中激活插件
3. 插件自动运行数据库迁移，创建所需表

## Bot 命令格式

| 场景 | 格式 | 示例 |
|---|---|---|
| 私聊 | `/req <TMDB链接>` | `/req https://www.themoviedb.org/movie/550` |
| 私聊 | `req <TMDB链接>` | `req https://www.themoviedb.org/tv/1396` |
| 群聊 | `@bot名 req <TMDB链接>` | `@HALO_ChatBot req https://www.themoviedb.org/movie/550` |
| 补集 | 回复媒体库卡片 `S21E15` | 精确补单集 |
| 补集 | 回复媒体库卡片 `S21` | 补整季 |

---

## 媒体库配置

在 **Settings → Request Config → Media Library Check** 中配置。支持多个数据库/API 同时连接。

### PostgreSQL / MySQL 模式

| 字段 | 必填 | 示例 | 说明 |
|---|---|---|---|
| Name | ✓ | My Media Server | 配置名称 |
| Connection Type | ✓ | PostgreSQL | 数据库类型 |
| Host | ✓ | 192.168.1.100 | 数据库地址 |
| Port | | 5432 | 端口号，留空用默认值 |
| Database | ✓ | strm | 数据库名 |
| Username | ✓ | postgres | 用户名 |
| Password | ✓ | ••••••• | 密码 |
| Table Name | ✓ | files | 表名 |
| TMDB ID Column | ✓ | tmdb | 存储 tmdb_id 的列 |
| Media Type Column | | | 区分 movie/tv 的列（可选） |

#### 版本详情模式（可选）

填写以下字段后，查重结果会显示具体版本信息（1080p × 1、4K DoVi × 1、S01-S23 集数等）：

| 字段 | 示例 | 说明 |
|---|---|---|
| Name Column | name | 文件名列（用于解析分辨率/HDR/季集） |
| Path Column | path | 文件路径列（用于路径回退查询 + 媒体类型过滤） |
| Is-Dir Column | is_dir | 布尔列，过滤掉目录 |
| Trashed Column | trashed | 布尔列，过滤掉已删除文件 |

### HTTP API 模式

| 字段 | 示例 | 说明 |
|---|---|---|
| API URL | `https://api.example.com/check?tmdb_id={tmdb_id}&type={media_type}` | 支持 `{tmdb_id}` 和 `{media_type}` 占位符 |
| Auth Token | Bearer your-token | 发送为 Authorization 头（可选） |
| Response Field | exists | 响应 JSON 中布尔字段的路径（支持点分，如 `data.found`） |

---

## Fulfill Webhook（求片推送）

当管理员在后台点击 ✓ 将求片标记为 fulfilled 时，插件会 POST 求片数据到配置的 Webhook URL。

### 配置

在 **Settings → Request Config → Plugin Config** 中配置：

| 字段 | 示例 | 说明 |
|---|---|---|
| Fulfill Webhook URL | `https://api.example.com/fulfill` | 留空=不推送。可在 URL 里附加 query param |
| Webhook Auth Header Name | `Authorization` / `X-Api-Key` / `X-Token` | 鉴权 Header 名，留空=不发鉴权头 |
| Webhook Auth Header Value | `Bearer eyJhbGci...` / `my-secret-key` | 对应的值 |

### 鉴权方式

| 方式 | Header Name | Header Value |
|---|---|---|
| Bearer Token | `Authorization` | `Bearer eyJhbGci...` |
| API Key | `X-Api-Key` | `my-secret-key` |
| Basic Auth | `Authorization` | `Basic dXNlcjpwYXNz` |
| 自定义 Header | 任意名称 | 任意值 |
| Query Param | （留空） | URL 中附加 `?token=xxx` |
| 无鉴权 | （留空） | （留空） |

### 推送 JSON 格式

```json
{
  "id": 8,
  "tmdb_id": 4614,
  "media_type": "tv",
  "title": "海军罪案调查处",
  "original_title": "NCIS",
  "requested_resolution": "S05E18",
  "request_count": 1,
  "admin_note": null
}
```

`requested_resolution` 字段含义：

| 值 | 含义 |
|---|---|
| `null` | 普通求片（整部影片） |
| `"4K"` | 电影补片 — 求 4K 版本 |
| `"1080p"` | 电影补片 — 求 1080p 版本 |
| `"S21"` | TV 补集 — 求整个第 21 季 |
| `"S05E18"` | TV 补集 — 精确求第 5 季第 18 集 |

### 预览

在 **求片后台** (Movie Requests 页面) 标题旁有 **"ℹ Webhook"** 按钮，点击展开推送示例面板，显示 Headers 和 JSON Body 的完整结构。

---

## 文件名解析规则

解析从媒体库查询到的文件名，提取分辨率、HDR 类型和季集信息。

### 分辨率

| 标记 | 关键词 |
|---|---|
| 4K | `2160p`, `4k`, `uhd` |
| 1080p | `1080p`, `fhd` |
| 1080i | `1080i` |
| 720p | `720p` |
| 480p | `480p` |

### HDR / 杜比视界

| 标记 | 关键词 |
|---|---|
| DoVi+HDR10 | `DoVi`/`.DV.` + `HDR10` 同时出现 |
| DoVi | `DoVi`, `.DV.`（排除 DVD/DVDRip） |
| HDR10+ | `HDR10+`, `HDR10Plus` |
| HDR10 | `HDR10` |
| HDR | `HDR` |

### 季集

| 模式 | 示例 |
|---|---|
| SxxExx | `S01E01`, `S22E20` |
| 多位数 | `S2025E58`（年份式季号） |

---

## 数据库表

所有表使用 `plg_movie_request_` 前缀：

| 表名 | 说明 |
|---|---|
| `plg_movie_request_tmdb_keys` | TMDB API Key 存储 |
| `plg_movie_request_requests` | 求片/补片记录 |
| `plg_movie_request_users` | 求片用户关联（哪个 TG 用户求了哪部片） |
| `plg_movie_request_media_library_configs` | 外部媒体库连接配置 |

## 兼容性

需要 ADMINCHAT Panel >= **1.1.5**

## License

GPL-3.0 — (R) 2026 NovaHelix & SAKAKIBARA
