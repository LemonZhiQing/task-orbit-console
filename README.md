# 🌌 TaskOrbit V4.0

> 为 VCP 深度定制的「极致个人敏捷心流系统」。融合认知负荷理论 (CLT) 与艾宾浩斯记忆曲线，打造 0 延迟、沉浸式、打通「做完即沉淀」闭环的第二大脑工作站。

---

## 🎯 核心设计哲学

| 原则 | 说明 |
|------|------|
| **去色化降噪 (Desaturation)** | 遵循 CLT 认知负荷理论，摒弃彩虹色块，采用高级灰白 + 微阴影的 Linear/Notion 级审美，将视觉精力 100% 留给任务本身。 |
| **Local-First (本地优先)** | Pinia Store 采用乐观更新 (Optimistic UI) 与防抖队列，看板拖拽、状态切换实现真正的 **0 延迟**，消除网络带来的认知断层。 |
| **做完即沉淀 (PARA 融合)** | 打破传统 Todo-list「做完即消失」的黑洞。完成卡片后开启 `is_review`，系统自动提炼知识标签，无缝流转至「复习池」。 |

---

## ✨ 核心特性

### 1. 三境一球拓扑架构
抛弃传统左侧菜单，采用顶部三大平级视图 + 右下角全局悬浮 Inbox 碎片球的设计：
- **☀️ 今日无垠 (TodayBoard)**：Kanban 三列看板（待办 / 进行中 / 已完成），支持丝滑拖拽。
- **🎯 目标排期 (PlanningCenter)**：短期目标池、长期宏图池、常驻习惯池，集成 Sparkline 趋势线与 Heatmap 热力图。
- **🧠 复习仪式 (ReviewRitual)**：沉浸式卡片翻转复习，基于艾宾浩斯间隔算法自动调度。

### 2. 智能父子任务嵌套 (Epic → Story → Task)
- 任务周期分为：`daily` (日常)、`short_term` (短期)、`long_term` (长期)、`routine` (常驻)。
- **活期过滤引擎**：底层 Node.js 接口实时计算，自动屏蔽已完成或已过期的父节点，为子任务提供精准的动态「所属项目」下拉联想。

### 3. 🧠 艾宾浩斯复习引擎
- 数据库底层引入高度弹性的 `review_meta_json`，记录 `next_review_date` 与 `stage`。
- 结合 VCP 后端 Agent，实现从「自然语言构建复习任务」到「前端卡片式记忆检验」的端到端闭环。

### 4. 📊 双轨效能图谱
- **Sparkline 无轴趋势线**：直观展示番茄钟消耗趋势。
- **Opacity 映射 Heatmap**：纯色热力块展示连续打卡与专注时间分布。

### 5. 智能时空调度
- 极速新建任务 (`quickAdd`) 搭载智能时间推算：晚上 9 点后创建的任务，系统自动将「计划日」和「截止日」推延至明日，拒绝当下的焦虑。

---

## ⚙️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端框架** | Vue 3 (Composition API) + Vite | 响应式驱动，极速 HMR |
| **UI 库** | Element Plus | 深度定制无边框表单组件 |
| **状态管理** | Pinia + VueUse | Local-First 持久化拦截，乐观更新 |
| **交互组件** | VueDraggable | 丝滑拖拽，看板核心体验 |
| **图表** | ECharts + vue-echarts | 效能洞察数据可视化 |
| **后端服务** | Node.js + Express | 本地轻量级中间层 API |
| **数据库** | SQLite (better-sqlite3) | WAL 模式单文件强存储 |
| **构建工具** | Vite 8 | 现代前端工程化 |
| **样式** | SCSS + CSS Variables | 支持深浅色主题切换 |

---

## 📁 项目目录结构

```
vcp-admin-vue/
├── .env                          # 环境变量配置
├── package.json                  # 项目依赖与脚本
├── vite.config.js                # Vite 构建配置（含 API 代理）
├── ecosystem.config.cjs          # PM2 部署配置
│
├── server/                       # 🖥️ 后端服务层
│   ├── index.cjs                 # Express 入口（CORS、路由挂载、错误处理）
│   ├── taskApi.cjs               # RESTful API 路由（/api/tasks/*）
│   └── taskDb.cjs                # SQLite 数据库封装（Schema、CRUD、序列化）
│
├── src/
│   ├── api/
│   │   ├── index.js              # Axios 实例（拦截器、错误处理）
│   │   └── task.js               # 任务相关 API 封装
│   ├── assets/                   # 静态资源（Logo、壁纸、全局样式）
│   ├── components/
│   │   ├── layout/               # 布局组件（AppLayout、TopBar、Sidebar）
│   │   └── GlobalChatSandbox.vue # 全局 AI 聊天沙盒
│   ├── composables/
│   │   └── useTheme.js           # 深浅色主题组合式函数
│   ├── router/
│   │   └── index.js              # Vue Router 配置（Hash 模式）
│   ├── stores/
│   │   ├── app.js                # 应用级状态
│   │   ├── task.ts               # 任务状态（旧）
│   │   └── taskStore.ts          # 任务状态（核心引擎，Local-First）
│   ├── types/
│   │   └── task.ts               # TypeScript 类型定义
│   ├── views/
│   │   └── TaskManager/          # 任务管理核心视图
│   │       ├── index.vue         # 三境布局入口（极光背景 + 视图切换）
│       ├── TodayBoard.vue        # 今日无垠（Kanban 看板）
│       ├── PlanningCenter.vue    # 目标排期（效能洞察 + 目标池）
│       ├── ReviewRitual.vue      # 复习仪式（卡片翻转复习）
│       └── components/           # 子组件
│           ├── TaskCard.vue      # 任务卡片
│           ├── DetailDrawer.vue  # 右侧详情抽屉
│           ├── InboxFab.vue      # 全局悬浮 Inbox 球
│           ├── TaskCreateDialog.vue
│           ├── Dashboard.vue
│           ├── StatsChartsPanel.vue
│           ├── LongTermPanel.vue
│           ├── shared/           # 共享组件
│           │   ├── TaskCard.vue
│           │   └── DetailDrawer.vue
│           └── views/            # 子视图
│               ├── TableView.vue
│               └── KanbanView.vue
│   ├── App.vue                   # 根组件
│   └── main.js                   # 应用入口
│
├── docs/
│   └── VCP-TaskManager-DevSpec.md # 开发规格白皮书
└── public/                       # 静态公共资源
```

---

## 🏗️ 前后端架构与数据流

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (Vue 3)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ TodayBoard  │  │PlanningCenter│  │   ReviewRitual      │  │
│  │  (Kanban)   │  │ (Insights)   │  │  (Card Flip)        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         └─────────────────┴────────────────────┘              │
│                           │                                  │
│                    ┌──────┴──────┐                          │
│                    │  taskStore  │  ← Pinia + VueUse        │
│                    │(Local-First)│    乐观更新 / 防抖同步    │
│                    └──────┬──────┘                          │
│                           │ Axios                            │
└───────────────────────────┼─────────────────────────────────┘
                            │ Proxy (/api)
┌───────────────────────────┼─────────────────────────────────┐
│                      后端 (Express)                          │
│                    ┌──────┴──────┐                          │
│                    │  taskApi.cjs │  ← RESTful 路由层        │
│                    └──────┬──────┘                          │
│                    ┌──────┴──────┐                          │
│                    │  taskDb.cjs  │  ← SQLite 数据层         │
│                    │(better-sqlite3)│  WAL / 自动迁移        │
│                    └──────┬──────┘                          │
│                           ▼                                  │
│                    F:/vcp/VCPToolBox/VCPTaskData/tasks.db   │
└─────────────────────────────────────────────────────────────┘
```

### 数据流说明

1. **Local-First 写入**：用户操作（拖拽、编辑）立即修改 Pinia Store → 本地 `localStorage` 持久化 → UI 0 延迟响应。
2. **防抖同步**：Store 通过 `useDebounceFn` 将变更批量同步至后端（`/api/tasks/batch`），间隔 1 秒。
3. **服务端水合**：首次加载时，前端从 SQLite 拉取全量数据（`GET /api/tasks`），与本地缓存合并。
4. **复习调度**：后端可扩展 Cron Job 扫描 `review_meta_json`，提取到期复习任务，通过 Agent 主动推送。

---

## 🗄️ 数据库设计

### 存储位置

SQLite 数据库文件默认存储于本地专属目录（可通过环境变量 `TASK_DB_DIR` 自定义）：

```
F:\vcp\VCPToolBox\VCPTaskData\
└── tasks.db          // SQLite 数据库文件
```

### 数据表结构 (`tasks`)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `id` | `TEXT` | `PRIMARY KEY` | — | 任务唯一标识（UUID 或自定义格式） |
| `title` | `TEXT` | `NOT NULL` | — | 任务标题 |
| `period` | `TEXT` | — | `'daily'` | 任务周期：`daily` / `short_term` / `long_term` / `routine` |
| `kanban_col` | `TEXT` | — | `'todo'` | 看板列：`todo` / `in_progress` / `done` |
| `priority` | `TEXT` | — | `'p2'` | 优先级：`p0` (紧急) / `p1` (高) / `p2` (中) / `p3` (低) |
| `is_focused` | `INTEGER` | — | `0` | 是否为当前专注任务（`1` 是 / `0` 否） |
| `memo` | `TEXT` | — | `NULL` | 轻量备注 / Checklist（纯文本） |
| `is_review` | `INTEGER` | — | `0` | 是否开启艾宾浩斯复习闭环 |
| `project` | `TEXT` | — | `NULL` | 所属长期项目 / 父级任务名称 |
| `plan_date` | `INTEGER` | — | `NULL` | 计划执行日（Unix 时间戳，毫秒） |
| `due_date` | `INTEGER` | — | `NULL` | 截止日期（Unix 时间戳，毫秒） |
| `planned_pomodoros` | `INTEGER` | — | `0` | 计划番茄钟数量 |
| `actual_pomodoros` | `INTEGER` | — | `0` | 实际番茄钟数量 |
| `planned_amount` | `REAL` | — | `0` | 计划工作量 |
| `completed_amount` | `REAL` | — | `0` | 实际完成工作量 |
| `unit` | `TEXT` | — | `NULL` | 工作量单位（页、番茄、字、API 等） |
| `tags_json` | `TEXT` | — | `'[]'` | 任务标签数组的 JSON 序列化 |
| `creator_agent` | `TEXT` | — | `NULL` | 创建该任务的 AI Agent 名称 |
| `review_meta_json` | `TEXT` | — | `'{}'` | 复习元数据（知识标签、外链、复习信息） |
| `knowledge_refs_json` | `TEXT` | — | `NULL` | **(已弃用/兼容)** 旧版知识引用，数据已迁移至 `review_meta_json` |
| `created_at` | `TEXT` | — | `NULL` | 创建时间（ISO 8601） |
| `updated_at` | `TEXT` | — | `NULL` | 最后更新时间（ISO 8601） |

### 核心字段详解

#### 周期与看板列
- `period` 决定任务的生命周期维度，用于三大视图的过滤。
- `kanban_col` 是任务在 Kanban 看板中的实时泳道位置，支持拖拽变更。

#### 复习元数据 (`review_meta_json`)
高度弹性的 JSON 字段，存储艾宾浩斯复习系统的全部信息：

```json
{
  "knowledge_tags": ["Vue3响应式", "核心机制"],
  "external_urls": ["https://github.com/...", "vcp-diary://..."],
  "review_info": {
    "next_review_date": "2026-04-25",
    "stage": 2
  }
}
```

- `knowledge_tags`：任务完成后提炼的知识标签，用于构建个人知识图谱。
- `external_urls`：关联的外部资源链接或 VCP 日记引用。
- `review_info`：艾宾浩斯复习算法核心状态。
  - `next_review_date`：下次复习日期（YYYY-MM-DD）。
  - `stage`：当前复习阶段（对应间隔天数表 `[1, 2, 4, 7, 15, 30]` 的索引）。

#### 时间戳设计
- `plan_date` / `due_date` 采用 `INTEGER` 存储 Unix 时间戳（毫秒），便于数值比较和极速排序。
- `created_at` / `updated_at` 采用 ISO 8601 文本，便于人类可读展示。

#### 效能度量
双轨制追踪：时间维度（番茄钟）+ 产出维度（工作量），支持 Dashboard 计算「本周效率」「任务完成率」等指标。

### 数据序列化与迁移

由于 SQLite 不支持原生数组/对象，[`server/taskDb.cjs`](server/taskDb.cjs) 实现了自动序列化层：

- **写入时 (`serializeTask`)**：布尔值 → `0/1`，数组/对象 → JSON 字符串。
- **读取时 (`deserializeTask`)**：`0/1` → 布尔值，解析 JSON，兼容旧版 `knowledge_refs_json` 迁移。

**自动迁移策略**：启动时通过 `PRAGMA table_info(tasks)` 检测现有列，对缺失列执行 `ALTER TABLE ADD COLUMN`，实现零停机平滑升级。

---

## 🔧 环境变量配置

在项目根目录创建 `.env` 文件：

```env
# SQLite 数据库存储目录（绝对路径）
TASK_DB_DIR=F:/vcp/VCPToolBox/VCPTaskData

# 后端服务端口
TASK_SERVER_PORT=6105

# 前端 API 基础路径（Vite 代理用）
VITE_API_BASE_URL=/api
```

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `TASK_DB_DIR` | 否 | `F:/vcp/VCPToolBox/VCPTaskData` | SQLite 数据库文件存放目录 |
| `TASK_SERVER_PORT` | 否 | `6105` | Express 后端监听端口 |
| `VITE_API_BASE_URL` | 否 | `/api` | 前端请求基础路径 |

---

## 🚀 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境（同时启动前后端）

```bash
npm run dev
```

该命令通过 `concurrently` 同时运行：
- `npm run dev:server` → 启动 Express 后端（默认端口 6105）
- `npm run dev:web` → 启动 Vite 前端（默认端口 5173）

### 3. 单独启动服务

```bash
# 仅启动后端
npm run dev:server

# 仅启动前端
npm run dev:web
```

### 4. 生产构建

```bash
npm run build
```

构建产物输出至 `dist/` 目录。

---

## 📡 API 设计

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取任务列表 | `GET` | `/api/tasks` | 返回所有任务 |
| 获取统计 | `GET` | `/api/tasks/stats` | 返回看板聚合统计 |
| 获取父级候选 | `GET` | `/api/tasks/parent-candidates?period={period}` | 活期过滤引擎，返回可用的父级任务 |
| 获取单个任务 | `GET` | `/api/tasks/:id` | 返回完整任务详情 |
| 创建任务 | `POST` | `/api/tasks` | 接收任务 JSON |
| 批量同步 | `POST` | `/api/tasks/batch` | 全量覆盖同步（Local-First 用） |
| 更新任务 | `PATCH` | `/api/tasks/:id` | 支持局部更新 |
| 删除任务 | `DELETE` | `/api/tasks/:id` | 硬删除 |
| 打开本地文件 | `POST` | `/api/tasks/open-local` | 调起系统默认程序打开本地文件 |
| 健康检查 | `GET` | `/health` | 返回服务状态与数据库路径 |

---

## 🧩 前端类型定义

详见 [`src/types/task.ts`](src/types/task.ts)：

```typescript
export type TaskPeriod = 'daily' | 'short_term' | 'long_term' | 'routine';
export type KanbanColumn = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'p0' | 'p1' | 'p2' | 'p3';

export interface ITaskItem {
  id: string;
  title: string;
  period: TaskPeriod;
  kanban_col: KanbanColumn;
  priority: TaskPriority;
  is_focused: boolean;
  memo?: string;
  is_review: boolean;
  project?: string;
  plan_date?: number;
  due_date?: number;
  planned_pomodoros?: number;
  actual_pomodoros?: number;
  planned_amount?: number;
  completed_amount?: number;
  unit?: string;
  tags?: string[];
  creator_agent?: string;
  knowledge_tags?: string[];
  external_urls?: string[];
  review_info?: { next_review_date: string; stage: number };
  created_at: number;
  updated_at: number;
}
```

---

## 📄 相关文档

- [开发规格白皮书](docs/VCP-TaskManager-DevSpec.md) —— 包含完整的 V3.0 设计规格、Pinia 骨架、组件设计要点。

---

*Created with ❤️ by Lemon & Sunshiny in 2026.*
