# 🌌 TaskOrbit / VCP Admin Vue

> 面向 VCP 生态的本地优先任务中枢与个人敏捷心流控制台。项目基于 Vue 3、Vite、Pinia、Element Plus、Express 与 SQLite 构建，围绕「今日执行」「目标排期」「复习仪式」三条主线，把任务管理、效能洞察、知识复习和 AI Agent 协同沉淀到同一套轻量工作站中。

---

## 目录

- [项目定位](#项目定位)
- [核心特性](#核心特性)
- [产品视图](#产品视图)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [架构与数据流](#架构与数据流)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [常用脚本](#常用脚本)
- [API 说明](#api-说明)
- [数据模型与数据库](#数据模型与数据库)
- [前端状态管理](#前端状态管理)
- [开发规范与约定](#开发规范与约定)
- [测试数据](#测试数据)
- [部署与运行](#部署与运行)
- [相关文档](#相关文档)

---

## 项目定位

TaskOrbit 是 VCP 生态中的任务管理前端与本地任务服务，主要解决以下问题：

1. **降低任务系统的操作摩擦**：支持看板拖拽、极速新建、详情抽屉内编辑、收集箱暂存，尽量让任务操作不打断当前心流。
2. **本地优先的数据体验**：前端 Pinia + localStorage 先完成 UI 更新，再通过防抖同步到本地 Express + SQLite 服务，避免网络抖动带来的停顿。
3. **从 Todo 到目标体系**：通过 `daily`、`short_term`、`long_term`、`routine` 四类周期任务，把每日行动、短期故事、长期 Epic 与常驻习惯组织成层级结构。
4. **做完即沉淀**：任务完成后可以保留备注、知识标签、外链与复习状态，不让已完成任务变成信息黑洞。
5. **连接 VCP AI Agent**：数据模型保留 `creator_agent`、`ai_meta_json`、知识标签与本地文件打开能力，方便后续由 Agent 创建、催办、复习和整理任务。

---

## 核心特性

### 1. 三境工作台

项目当前提供三个主入口：

| 入口 | 路由 | 说明 |
|------|------|------|
| 今日无垠 | `#/task-manager/today` | 今日任务 Kanban，看板列为待办、进行中、已完成，支持拖拽变更状态。 |
| 目标排期 | `#/task-manager/planning` | 展示短期目标、长期宏图、常驻习惯，并提供专注时长、连续达成、Sparkline 与 Heatmap 效能洞察。 |
| 复习仪式 | `#/task-manager/review` | 展示今日到期复习卡片，支持先主动回忆再显示答案，并用「记住 / 忘记」推进艾宾浩斯复习阶段。 |

### 2. Local-First 任务体验

- 任务数据通过 Pinia Store 驱动，并持久化到浏览器 localStorage。
- 新建、编辑、拖拽、聚焦、删除等操作会先更新本地 UI。
- 单任务同步使用 600ms 防抖的 upsert 接口。
- 批量同步使用 1000ms 防抖的 batch 接口。
- 同步失败时保留本地数据，并通过 Element Plus 消息提示。

### 3. 任务层级与目标拆解

任务周期分为：

| 周期 | 含义 | 常见用途 |
|------|------|----------|
| `daily` | 今日任务 | 当天要执行的具体动作。 |
| `short_term` | 短期目标 | 一周或一个迭代内要完成的 Story。 |
| `long_term` | 长期宏图 | 跨月目标、项目 Epic、长期能力建设。 |
| `routine` | 常驻习惯 | 重复打卡、长期保持的习惯项。 |

父子关系通过 `parent_id` 表达。为了兼容旧数据，`project` 字段也会参与父级推断。短期/长期目标会聚合子任务的实际番茄钟和完成量，方便在目标层级查看真实投入。

### 4. 艾宾浩斯复习闭环

- 任务可设置 `is_review` 进入复习池。
- 复习元数据包含 `knowledge_tags`、`external_urls`、`review_info` 与 `review_history`。
- 复习阶段间隔为 `[1, 2, 4, 7, 15, 30, 90, 180, 365, 1095]` 天。
- 「记住」会进入下一阶段，「忘记」会回到阶段 0。
- 复习历史会记录每次复习时间、是否记住、阶段变化与下次复习日期。

### 5. 效能洞察

目标排期页会根据任务完成时间和番茄钟数据生成：

- 累计专注小时数。
- 连续达成天数。
- 按小时 / 天 / 周 / 月聚合的活跃热力图。
- Sparkline 趋势线。
- 完成率、任务总数、已完成数等全局统计。

### 6. 软删除、备份与恢复

- 删除任务默认写入 `deleted_at`，属于软删除。
- 后端支持 `PATCH /api/tasks/:id/restore` 恢复任务。
- 后端支持 `POST /api/tasks/backup` 复制 SQLite 数据库文件到备份目录。
- 执行批量替换前，默认会自动创建一次数据库备份。

### 7. 本地文件打开能力

后端提供 `POST /api/tasks/open-local`，可在允许目录范围内调用系统默认程序打开本地文件。该能力默认受以下环境变量控制：

- `TASK_ENABLE_OPEN_LOCAL=false` 可禁用本地打开。
- `TASK_ALLOWED_OPEN_DIRS` 可配置允许打开的目录列表，Windows 下用分号分隔。

---

## 产品视图

### 今日无垠

今日无垠是执行态视图，主要关注当天可行动任务。

- 三列 Kanban：待办、进行中、已完成。
- 使用 `vuedraggable` 实现任务拖拽。
- 点击任务卡片打开详情抽屉。
- 每列顶部提供极速新建按钮。
- 晚上 21 点后极速新建任务时，默认计划日和截止日顺延到明天，减少深夜焦虑。

### 目标排期

目标排期是计划态视图，主要关注目标拆解与节奏判断。

- 短期目标池：承接今日任务上层 Story。
- 长期宏图池：承接更长周期的 Epic。
- 常驻习惯池：承接持续性任务。
- 效能洞察面板：展示专注、连续达成、趋势线和热力图。
- 可将目标任务快速推进到今日执行。

### 复习仪式

复习仪式是沉淀态视图，主要关注知识复现。

- 自动筛选今日到期复习任务。
- 卡片式主动回忆流程：先回忆，再显示备注 / 答案。
- 支持键盘快捷键：`Space` 显示答案，`←` 标记忘记，`→` 标记记住。
- 显示知识标签、来源周期、创建 Agent 与历史复习次数。

### 全局浮层

任务管理布局中还包含多个全局浮层：

- Inbox 悬浮球：临时收集灵感，可提升为任务。
- 全局时间线浮层：用于展示时间和排期线索。
- 任务总览浮层：用于快速查看整体任务概况。
- 左右占位浮层：为后续扩展全局辅助工具预留空间。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 + Composition API | 组件化 UI 与响应式状态。 |
| 构建工具 | Vite 8 | 开发服务器、HMR 与生产构建。 |
| 路由 | Vue Router 4 | Hash 模式路由。 |
| 状态管理 | Pinia 3 + VueUse | Store、localStorage 持久化、防抖同步。 |
| UI 组件 | Element Plus | 表单、消息提示、下拉菜单等基础组件。 |
| 拖拽 | vuedraggable | 今日看板拖拽。 |
| 图表 | ECharts / vue-echarts + SVG | 项目引入 ECharts，同时部分趋势图使用 SVG 手绘。 |
| 后端 | Node.js + Express 5 | 本地 REST API 服务。 |
| 数据库 | SQLite + better-sqlite3 | 单文件本地存储，启用 WAL。 |
| 样式 | CSS Variables + SCSS | 全局变量、深浅色主题、局部 scoped 样式。 |
| 进程管理 | PM2 ecosystem | 可同时管理后端服务和 Vite 前端服务。 |

---

## 项目结构

```text
vcp-admin-vue/
├── .env                         # 本地环境变量，未提交时可自行创建
├── ecosystem.config.cjs         # PM2 进程配置
├── index.html                   # Vite HTML 入口
├── jsconfig.json                # JS 路径提示配置
├── package.json                 # 脚本与依赖声明
├── package-lock.json            # 依赖锁定文件
├── README.md                    # 项目说明文档
├── vite.config.js               # Vite 配置，包含 /api 代理
│
├── docs/
│   └── VCP-TaskManager-DevSpec.md # 任务中枢开发规格白皮书
│
├── public/
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── icons.svg
│   └── VCPLogo2.png
│
├── server/
│   ├── index.cjs                # Express 服务入口、CORS、健康检查、路由挂载
│   ├── taskApi.cjs              # 任务 REST API 路由
│   ├── taskDb.cjs               # SQLite 初始化、迁移、CRUD、备份、序列化
│   └── seedTestData.cjs         # 覆盖测试数据种子脚本
│
└── src/
    ├── App.vue                  # Vue 根组件
    ├── main.js                  # 应用入口，挂载 Pinia、Router、Element Plus
    │
    ├── api/
    │   ├── index.js             # Axios 实例与拦截器
    │   └── task.js              # 任务 API 封装
    │
    ├── assets/
    │   ├── logo.png
    │   ├── styles/
    │   │   ├── global.css       # 全局样式
    │   │   └── variables.css    # CSS 变量与主题变量
    │   └── wallpaper/           # 深浅色背景素材
    │
    ├── components/
    │   ├── GanttChart.vue       # 甘特图组件
    │   └── layout/
    │       ├── AppLayout.vue    # 应用布局容器
    │       ├── Sidebar.vue      # 侧边栏组件
    │       └── TopBar.vue       # 顶栏导航
    │
    ├── composables/
    │   └── useTheme.js          # 深浅色主题切换
    │
    ├── router/
    │   └── index.js             # 路由表与标题更新
    │
    ├── stores/
    │   ├── app.js               # 应用级状态
    │   └── taskStore.ts         # 任务 Store，Local-First 核心逻辑
    │
    ├── types/
    │   └── task.ts              # 任务类型定义
    │
    └── views/
        └── TaskManager/
            ├── index.vue        # 任务中枢布局，挂载三大子视图与全局浮层
            ├── TodayBoard.vue   # 今日无垠 Kanban
            ├── PlanningCenter.vue # 目标排期与效能洞察
            ├── ReviewRitual.vue # 复习仪式
            └── components/
                ├── DetailDrawer.vue
                ├── GlobalTimelineFloat.vue
                ├── InboxFab.vue
                ├── LeftPlaceholderFloat.vue
                ├── MiniTimelineWidget.vue
                ├── RightPlaceholderFloat.vue
                ├── TaskCard.vue
                └── TaskOverviewFloat.vue
```

---

## 架构与数据流

```text
┌────────────────────────────────────────────────────────────────────┐
│                              Browser                               │
│                                                                    │
│  Vue Router                                                        │
│    ├─ TodayBoard        Kanban 执行态                               │
│    ├─ PlanningCenter    目标排期 / 效能洞察                          │
│    └─ ReviewRitual      艾宾浩斯复习仪式                             │
│                                                                    │
│  Pinia taskStore                                                   │
│    ├─ useStorage 持久化到 localStorage                              │
│    ├─ computed 派生今日任务、目标池、复习池、统计指标                  │
│    ├─ optimistic update 本地优先更新 UI                              │
│    └─ useDebounceFn 防抖同步后端                                     │
└───────────────────────────────┬────────────────────────────────────┘
                                │ Axios
                                │ Vite proxy: /api → 127.0.0.1:TASK_SERVER_PORT
┌───────────────────────────────▼────────────────────────────────────┐
│                         Express Task Server                         │
│                                                                    │
│  server/index.cjs                                                  │
│    ├─ .env 加载                                                     │
│    ├─ CORS 白名单                                                   │
│    ├─ /health                                                       │
│    └─ /api/tasks                                                    │
│                                                                    │
│  server/taskApi.cjs                                                │
│    ├─ 参数校验                                                      │
│    ├─ REST API 路由                                                  │
│    └─ 本地文件打开保护                                                │
└───────────────────────────────┬────────────────────────────────────┘
                                │ better-sqlite3
┌───────────────────────────────▼────────────────────────────────────┐
│                              SQLite                                │
│                                                                    │
│  tasks.db                                                          │
│    ├─ WAL 模式                                                      │
│    ├─ 自动建表                                                      │
│    ├─ 缺失字段自动迁移                                                │
│    ├─ JSON 字段序列化 / 反序列化                                      │
│    └─ backups/ 数据库备份                                            │
└────────────────────────────────────────────────────────────────────┘
```

### 典型操作流程

#### 首次加载

1. 进入任务页。
2. 视图组件调用 `hydrateFromServer()`。
3. 前端请求 `GET /api/tasks`。
4. 后端从 SQLite 读取并反序列化任务。
5. Store 将任务规范化并写入 localStorage。

#### 创建任务

1. 用户点击极速新建或从 Inbox 提升任务。
2. Store 立即创建任务并插入本地任务列表。
3. UI 立刻显示新任务。
4. Store 通过防抖 upsert 调用 `POST /api/tasks/upsert`。
5. 后端规范化字段，写入 SQLite。

#### 拖拽任务

1. 用户拖动卡片到其他看板列。
2. `vuedraggable` 触发列数据变更。
3. Store 调用 `setColumnTasks()` 更新列、排序和更新时间。
4. 每个变更任务通过 upsert 同步到后端。
5. 若任务进入 `done`，系统会自动补齐 `completed_at`、`actual_pomodoros`、`completed_amount`。

#### 复习任务

1. Store 根据 `is_review` 和 `review_info.next_review_date` 计算今日到期复习任务。
2. 用户在复习仪式中显示答案。
3. 用户标记「记住」或「忘记」。
4. Store 计算下一阶段、下次复习日期，并追加 `review_history`。
5. 更新后的任务同步到 SQLite。

---

## 快速开始

### 环境要求

建议使用：

- Node.js 20 或更高版本。
- npm 10 或更高版本。
- Windows 11 环境下体验最佳，因为默认数据库路径和本地文件打开命令以 Windows 为主要目标。

### 安装依赖

```bash
npm install
```

### 配置环境变量

项目根目录可以创建 `.env` 文件。最小配置示例：

```env
TASK_DB_DIR=F:/vcp/VCPToolBox/VCPTaskData
TASK_SERVER_PORT=6105
VITE_API_BASE_URL=/api
```

> 注意：`vite.config.js` 中代理端口默认值为 `6005`，而后端服务默认端口为 `6105`。建议显式配置 `TASK_SERVER_PORT=6105`，确保前端代理和后端服务端口一致。

### 启动开发环境

```bash
npm run dev
```

该命令会同时启动：

- `npm run dev:server`：启动 Express 后端服务。
- `npm run dev:web`：启动 Vite 前端服务。

默认访问地址：

```text
http://127.0.0.1:5173/#/task-manager/today
```

### 单独启动前端或后端

```bash
npm run dev:server
npm run dev:web
```

### 构建生产产物

```bash
npm run build
```

构建输出目录为 `dist/`。

### 本地预览构建产物

```bash
npm run preview
```

---

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `TASK_DB_DIR` | `F:/vcp/VCPToolBox/VCPTaskData` | SQLite 数据目录。后端会在该目录下创建 `tasks.db` 和 `backups/`。 |
| `TASK_SERVER_PORT` | 后端默认为 `6105`，Vite 代理默认回退为 `6005` | Express 服务端口。建议在 `.env` 中显式设置。 |
| `VITE_API_BASE_URL` | `/api` | 前端 Axios 基础路径。开发时通常配合 Vite 代理使用。 |
| `TASK_ALLOWED_ORIGINS` | `http://127.0.0.1:5173,http://localhost:5173` | 后端 CORS 允许来源，多个来源用逗号分隔。 |
| `TASK_ENABLE_OPEN_LOCAL` | 未设置时允许 | 设置为 `false` 时禁用打开本地文件。 |
| `TASK_ALLOWED_OPEN_DIRS` | `TASK_DB_DIR` | 允许打开本地文件的目录列表，Windows 下用分号分隔。 |

---

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 使用 concurrently 同时启动前端和后端。 |
| `npm run dev:web` | 只启动 Vite 前端服务。 |
| `npm run dev:server` | 只启动 Express 后端服务。 |
| `npm run build` | 执行生产构建。 |
| `npm run preview` | 本地预览 Vite 构建产物。 |
| `npm run start:server` | 以普通 Node 方式启动后端服务。 |
| `npm run seed:test-data` | 写入覆盖场景测试数据。注意该脚本会通过 `replaceAllTasks()` 替换当前任务表内容。 |

---

## API 说明

后端服务入口为 `/api/tasks`，统一返回结构通常为：

```json
{
  "success": true,
  "data": {},
  "message": "Task retrieved successfully"
}
```

### 任务接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/tasks` | 获取未软删除任务列表。可传 `includeDeleted=true` 获取全部任务。 |
| `GET` | `/api/tasks/stats` | 获取任务聚合统计。 |
| `GET` | `/api/tasks/parent-candidates?period=daily` | 获取当前周期可选父任务。`daily` 对应短期目标，`short_term` 对应长期目标。 |
| `GET` | `/api/tasks/:id` | 获取单个任务。可传 `includeDeleted=true`。 |
| `POST` | `/api/tasks` | 创建任务，要求 `id` 和 `title`。 |
| `POST` | `/api/tasks/upsert` | 创建或更新任务，前端 Local-First 同步主要使用该接口。 |
| `POST` | `/api/tasks/batch` | 批量替换任务表，主要用于全量同步。 |
| `POST` | `/api/tasks/backup` | 创建数据库备份。请求体可传 `{ "reason": "manual" }`。 |
| `PATCH` | `/api/tasks/:id` | 局部更新任务。 |
| `PATCH` | `/api/tasks/:id/restore` | 恢复软删除任务。 |
| `DELETE` | `/api/tasks/:id` | 软删除任务。传 `hard=true` 时硬删除。 |
| `POST` | `/api/tasks/open-local` | 打开允许目录内的本地文件。 |

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 返回服务状态、数据目录、数据库路径和端口。 |

### 字段校验

后端会校验：

- `period` 必须是 `daily`、`short_term`、`long_term`、`routine` 之一。
- `kanban_col` 必须是 `todo`、`in_progress`、`done` 之一。
- `priority` 必须是 `p0`、`p1`、`p2`、`p3` 之一。
- `planned_pomodoros`、`actual_pomodoros`、`planned_amount`、`completed_amount`、`sort_order` 必须是非负数字。

---

## 数据模型与数据库

### 存储位置

默认数据库路径：

```text
F:/vcp/VCPToolBox/VCPTaskData/tasks.db
```

备份目录：

```text
F:/vcp/VCPToolBox/VCPTaskData/backups/
```

### SQLite 表字段

`tasks` 表当前字段如下：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `id` | `TEXT PRIMARY KEY` | 无 | 任务唯一 ID。 |
| `title` | `TEXT NOT NULL` | 无 | 任务标题。 |
| `period` | `TEXT` | `daily` | 任务周期。 |
| `kanban_col` | `TEXT` | `todo` | 看板列。 |
| `priority` | `TEXT` | `p2` | 优先级。 |
| `is_focused` | `INTEGER` | `0` | 是否为当前专注任务。 |
| `memo` | `TEXT` | `NULL` | 备注、答案、Checklist 或轻量说明。 |
| `is_review` | `INTEGER` | `0` | 是否进入复习池。 |
| `project` | `TEXT` | `NULL` | 兼容旧数据的项目 / 父级引用。 |
| `parent_id` | `TEXT` | `NULL` | 父级任务 ID。 |
| `plan_date` | `INTEGER` | `NULL` | 计划日期，毫秒时间戳。 |
| `due_date` | `INTEGER` | `NULL` | 截止日期，毫秒时间戳。 |
| `completed_at` | `INTEGER` | `NULL` | 完成时间，毫秒时间戳。 |
| `deleted_at` | `INTEGER` | `NULL` | 软删除时间，毫秒时间戳。 |
| `sort_order` | `INTEGER` | `0` | 排序权重。 |
| `version` | `INTEGER` | `1` | 版本号，每次更新递增。 |
| `planned_pomodoros` | `INTEGER` | `0` | 计划番茄钟。 |
| `actual_pomodoros` | `INTEGER` | `0` | 实际番茄钟。 |
| `planned_amount` | `REAL` | `0` | 计划工作量。 |
| `completed_amount` | `REAL` | `0` | 已完成工作量。 |
| `unit` | `TEXT` | `NULL` | 工作量单位。 |
| `tags_json` | `TEXT` | `[]` | 标签数组 JSON。 |
| `creator_agent` | `TEXT` | `NULL` | 创建任务的 Agent 名称。 |
| `review_meta_json` | `TEXT` | `{}` | 复习元数据 JSON。 |
| `review_history_json` | `TEXT` | `[]` | 复习历史 JSON。 |
| `knowledge_refs_json` | `TEXT` | `NULL` | 旧版知识引用兼容字段。 |
| `ai_meta_json` | `TEXT` | `NULL` | AI 扩展元数据 JSON。 |
| `color` | `TEXT` | `NULL` | 任务颜色。 |
| `created_at` | `INTEGER` | `NULL` | 创建时间，毫秒时间戳。 |
| `updated_at` | `INTEGER` | `NULL` | 更新时间，毫秒时间戳。 |

### 前端 TypeScript 类型

核心类型定义在 `src/types/task.ts`：

```ts
export type TaskPeriod = 'daily' | 'short_term' | 'long_term' | 'routine'
export type KanbanColumn = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'p0' | 'p1' | 'p2' | 'p3'

export interface ITaskItem {
  id: string
  title: string
  period: TaskPeriod
  kanban_col: KanbanColumn
  priority: TaskPriority
  creator_agent?: string
  created_at: number
  updated_at: number
  version?: number
  plan_date?: number | null
  due_date?: number | null
  completed_at?: number | null
  deleted_at?: number | null
  sort_order?: number
  planned_pomodoros?: number
  actual_pomodoros?: number
  planned_amount?: number
  completed_amount?: number
  unit?: string | null
  effective_actual_pomodoros?: number
  effective_completed_amount?: number
  aggregated_children_count?: number
  has_aggregated_metrics?: boolean
  project?: string | null
  parent_id?: string | null
  memo?: string
  tags?: string[]
  color?: string | null
  is_review: boolean
  knowledge_tags?: string[]
  external_urls?: string[]
  review_info?: ReviewInfo | null
  review_history?: ReviewHistoryItem[]
  is_focused: boolean
  ai_meta_json?: string | null
}
```

### JSON 序列化策略

SQLite 不直接存储数组或对象，因此后端会执行自动转换：

- `tags` ⇄ `tags_json`
- `knowledge_tags`、`external_urls`、`review_info`、`review_history` ⇄ `review_meta_json`
- `review_history` ⇄ `review_history_json`
- 布尔值 ⇄ `0 / 1`
- 日期字符串、数字、Date 对象 ⇄ 毫秒时间戳

### 自动迁移

后端启动时会：

1. 执行 `CREATE TABLE IF NOT EXISTS tasks`。
2. 使用 `PRAGMA table_info(tasks)` 检查已有列。
3. 对缺失列执行 `ALTER TABLE ADD COLUMN`。

因此旧版数据库可以在启动时自动补齐字段。

---

## 前端状态管理

核心 Store 位于 `src/stores/taskStore.ts`。

### 持久化键

| Key | 说明 |
|-----|------|
| `vcp_tasks` | 任务列表缓存。 |
| `vcp_inbox` | Inbox 灵感收集列表。 |
| `vcp_tasks_hydrated` | 是否已经从服务端水合。 |
| `vcp_tasks_syncing` | 是否正在同步。 |
| `vcp_current_view` | 当前任务视图。 |

### 主要派生数据

| Getter | 说明 |
|--------|------|
| `normalizedTaskList` | 规范化后的未删除任务，并补充聚合指标。 |
| `deletedTasks` | 软删除任务列表。 |
| `todayTasks` | `period = daily` 的任务。 |
| `shortTermTasks` | `period = short_term` 的任务。 |
| `longTermTasks` | `period = long_term` 的任务。 |
| `routineTasks` | `period = routine` 的任务。 |
| `reviewTasks` | 所有未完成复习闭环的任务。 |
| `todayReviewTasks` | 今日到期复习任务。 |
| `focusedTask` | 当前专注任务。 |
| `tasksByColumn` | 今日任务按 Kanban 列分组。 |
| `tasksByPeriod` | 按周期分组。 |
| `insights` | 任务总数、完成率、专注小时数、连续达成等统计。 |

### 主要动作

| Action | 说明 |
|--------|------|
| `hydrateFromServer(force)` | 从后端拉取任务并写入本地缓存。 |
| `clearLocalCache()` | 清空任务和 Inbox 本地缓存。 |
| `createBackup(reason)` | 请求后端创建数据库备份。 |
| `createTask(payload)` | 本地创建任务并 upsert 同步。 |
| `updateTask(taskId, updates)` | 更新任务，自动维护完成时间、实际量和版本号。 |
| `removeTask(taskId)` | 软删除任务。 |
| `restoreTask(taskId)` | 恢复软删除任务。 |
| `moveTaskColumn(taskId, newCol)` | 将任务移动到指定看板列。 |
| `setColumnTasks(column, nextTasks)` | 更新某列任务列表和排序。 |
| `setFocusedTask(taskId)` | 设置当前专注任务。 |
| `moveTaskToPeriod(taskId, period)` | 将任务移动到指定周期。 |
| `addInboxItem(content)` | 添加 Inbox 条目。 |
| `promoteInboxToTask(inboxId)` | 将 Inbox 条目转为今日任务。 |
| `markReviewTask(taskId, isRemembered)` | 标记复习结果并计算下一次复习。 |
| `syncToServer()` | 批量同步当前任务列表。 |

---

## 开发规范与约定

### 路径别名

Vite 配置了 `@` 指向 `src`：

```js
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src')
  }
}
```

推荐在前端代码中使用 `@/stores/taskStore`、`@/api/task` 这类路径。

### 时间字段

- 前端和后端统一以毫秒时间戳存储 `plan_date`、`due_date`、`completed_at`、`deleted_at`、`created_at`、`updated_at`。
- 复习的 `next_review_date` 使用 `YYYY-MM-DD` 字符串，便于按天比较。

### 任务完成规则

当任务移动到 `done`：

- 如果没有 `completed_at`，自动补为当前时间。
- `actual_pomodoros` 默认取计划番茄钟，若计划为空则补 `1`。
- `completed_amount` 默认取计划工作量，若计划为空则补 `1`。

当任务移出 `done`：

- `completed_at` 会被清空。
- `actual_pomodoros` 与 `completed_amount` 会归零。

### 父子聚合规则

- `short_term` 和 `long_term` 任务如果存在子任务，会显示聚合后的实际番茄钟和完成量。
- 聚合递归计算，支持 Epic → Story → Daily 多层结构。
- 为避免循环引用，Store 内部用 `visiting` 集合做简单保护。

### 软删除约定

- 默认删除写入 `deleted_at`。
- 普通列表不展示软删除数据。
- 后端支持 `includeDeleted=true` 查询软删除数据。
- 只有 `DELETE /api/tasks/:id?hard=true` 会硬删除。

### 本地文件安全约定

- 只允许打开绝对路径或 UNC 路径。
- 只允许打开 `TASK_ALLOWED_OPEN_DIRS` 范围内的文件。
- 可以通过 `TASK_ENABLE_OPEN_LOCAL=false` 完全禁用该能力。

---

## 测试数据

项目提供测试种子脚本：

```bash
npm run seed:test-data
```

覆盖场景包括：

- 长期目标、短期目标、今日任务、常驻习惯。
- Epic → Story → Daily 父子层级。
- 已完成、进行中、待办、逾期、未排期任务。
- 今日到期复习、未来复习、已闭环复习。
- 软删除任务与恢复场景。
- 标题兜底、趋势统计、实际量自动统计。

> 注意：该脚本会调用 `replaceAllTasks()` 替换当前任务表内容。执行前建议先通过 `POST /api/tasks/backup` 或手动复制 `tasks.db` 做备份。

---

## 部署与运行

### 使用 PM2

项目提供 `ecosystem.config.cjs`：

```bash
pm2 start ecosystem.config.cjs
```

包含两个应用：

| 应用名 | 说明 |
|--------|------|
| `task-orbit-server` | 执行 `node server/index.cjs` 启动后端。 |
| `task-orbit-web` | 执行 `npx.cmd vite --host` 启动前端开发服务。 |

### 生产部署建议

当前项目的 PM2 配置更偏向本地常驻开发服务。如果要做正式生产部署，建议：

1. 执行 `npm run build` 生成 `dist/`。
2. 使用 Nginx、Caddy 或其他静态服务托管 `dist/`。
3. 使用 PM2 只托管 `server/index.cjs`。
4. 反向代理 `/api` 到 Express 服务端口。
5. 明确配置 `TASK_ALLOWED_ORIGINS` 和 `TASK_ALLOWED_OPEN_DIRS`。
6. 定期备份 `TASK_DB_DIR/tasks.db` 和 `TASK_DB_DIR/backups/`。

---

## 故障排查

### 前端请求失败

检查：

1. 后端是否启动：访问 `/health`。
2. `.env` 中 `TASK_SERVER_PORT` 是否与 Vite 代理端口一致。
3. `VITE_API_BASE_URL` 是否为 `/api`。
4. 浏览器控制台是否存在 CORS 错误。

### 数据没有刷新

可以尝试：

1. 刷新页面。
2. 在控制台或临时入口调用 Store 的 `hydrateFromServer(true)` 强制水合。
3. 清理 localStorage 中 `vcp_tasks_hydrated`。
4. 确认后端 `GET /api/tasks` 返回数据正常。

### better-sqlite3 安装失败

常见原因是 Node 版本或本地编译环境不兼容。建议：

1. 使用较新的 LTS Node.js。
2. 删除 `node_modules` 与 `package-lock.json` 后重新安装。
3. 在 Windows 环境确认已安装必要的 C++ 构建工具。

### 端口不一致

后端默认端口是 `6105`，Vite 代理配置在未读取到环境变量时回退到 `6005`。为了避免代理错误，建议始终在 `.env` 中写入：

```env
TASK_SERVER_PORT=6105
```

---

## 相关文档

- `docs/VCP-TaskManager-DevSpec.md`：任务中枢开发规格白皮书，包含早期架构愿景、数据模型、组件规划与 VCP 插件规划。
- `server/taskApi.cjs`：后端 REST API 实现。
- `server/taskDb.cjs`：SQLite Schema、迁移、序列化与备份逻辑。
- `src/stores/taskStore.ts`：前端 Local-First 状态管理核心。
- `src/types/task.ts`：任务数据类型定义。

---

## 项目当前状态

当前仓库已经具备可运行的本地任务中枢能力：

- Vue 3 前端三大主视图已接入路由。
- 本地 Express 服务提供任务 CRUD、批量同步、备份、恢复、统计和父级候选接口。
- SQLite 数据库支持自动建表、字段迁移、WAL、软删除和备份。
- Pinia Store 已实现本地优先、乐观更新、防抖同步、父子聚合和复习调度。
- 测试种子脚本覆盖了主要业务场景。

后续可以继续增强：

- 与 VCPToolBox / VChat 的 Agent 工具调用深度整合。
- 更完整的回收站 UI。
- 更细粒度的冲突解决和增量同步。
- 甘特图排期、全局时间线和任务总览浮层的进一步产品化。
- 生产环境静态资源托管与反向代理配置。

---

*Created with ❤️ by Lemon & Sunshiny. Updated for the current TaskOrbit codebase.*
