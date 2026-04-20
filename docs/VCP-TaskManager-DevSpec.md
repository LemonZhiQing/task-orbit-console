# TaskOrbit 任务中枢 开发规格白皮书 V3.0

> **项目路径**: `当前前端仓库根目录`
> **技术栈**: Vue 3 + Vite + Element Plus + Pinia + TypeScript
> **日期**: 2026-03-22
> **目标**: 在 TaskOrbit 管理后台中集成一套类 Notion 的个人任务管理系统，融合番茄钟工作流、艾宾浩斯复习机制，以及 VCP AI 主动协同催办能力。

---

## 一、项目架构愿景

本系统包含三个协同维度：

| 维度 | 角色 | 说明 |
|------|------|------|
| **VCPToolBox 后端** | 大本营 (数据仓库) | 存储任务数据 (SQLite)，运行定时扫描，提供 RESTful API |
| **TaskOrbit 前端** | 视觉控制台 | 多视图渲染 (表格/看板)、仪表盘统计、拖拽交互 |
| **VChat 客户端** | 随身 AI 秘书 | 自然语言创建/修改任务，女仆主动催办与复习提醒 |

---

## 二、后端数据存储方案

### 2.1 存储位置

在 VCPToolBox 后端项目中新建专属目录：

```
F:\vcp\VCPToolBox-main\
└── VCPTaskData\
    └── tasks.db          // SQLite 数据库文件
```

### 2.2 核心数据模型 (TypeScript Interface)

```typescript
// @/types/task.ts

export interface ITaskItem {
  id: string;                     // 唯一标识 (格式: YYYYMMDD-任务名, 如: 20250423-高考数学-直播课)
  title: string;                  // 任务/笔记名称

  properties: {
    status: 'todo' | 'in_progress' | 'done';
    plan_date: string;            // 计划执行日 (YYYY-MM-DD)
    project: string;              // 长期任务归属 (如: 高考, 剪辑, 小说)
    priority: 'P1' | 'P2' | 'P3'; // 优先级 (前端据此渲染对应数量的火焰图标)
    task_nature: string;          // 任务性质 (如: 学习, 创作, 运维)
    metrics: {
      plan_amount: number;        // 计划量
      unit: string;               // 单位 (如 '番茄', '页', '小时')
      estimated_days: number;     // 预计用时(天)
    };
  };

  ai_meta: {
    progress: number;             // 整体进度 (0-100)
    agent_in_charge: string;      // 负责跟进的 VCP AI (如: 晴天)
    pomodoro_spent: number;       // 实际已消耗的番茄钟数量 (用于效率仪表盘统计)
    reminder_rule: 'daily' | 'before_due' | 'none'; // 催办规则
    review_info?: {               // 艾宾浩斯复习机制 (针对笔记类任务, 可选)
      is_reviewable: boolean;
      current_level: number;      // 当前复习级别 (第 N 次)
      target_level: number;       // 目标复习总次数
      next_review_date: string;   // 算法算出的下次复习日期 (YYYY-MM-DD)
    };
  };

  // 知识映射系统 (替代传统的 Markdown 长文本详情)
  // 任务不存内容正文, 只存指向 VCP 记忆网的"指针"
  knowledge_refs: {
    tags: string[];               // 关联的日记 Tag (如: ['七步法总结', '网文架构'])
    diary_ids: string[];          // 关联的具体日记条目 UUID
    external_urls: string[];      // 外部参考链接 (B站视频、网页等)
  };

  memo: string;                   // 轻量短备注 / Checklist (纯文本, 非富文本)
  created_at: string;             // ISO 8601 格式
  updated_at: string;
}
```

### 2.3 后端 API 设计

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取任务列表 | GET | `/api/tasks` | 返回所有任务的轻量数据 (不含 memo) |
| 获取单个任务详情 | GET | `/api/tasks/:id` | 返回完整数据 (含 memo, knowledge_refs) |
| 创建任务 | POST | `/api/tasks` | 接收 ITaskItem 结构 |
| 更新任务 | PATCH | `/api/tasks/:id` | 支持局部更新 (如只改 status, 只改 progress) |
| 删除任务 | DELETE | `/api/tasks/:id` | 软删除或硬删除 |
| 获取仪表盘统计 | GET | `/api/tasks/stats` | 返回聚合数据 (本周番茄总数, 待复习数量等) |

### 2.4 后端定时扫描与 AI 催办

- **Cron Job**: 每日 0 点扫描 SQLite 数据库
  - 提取逾期任务: `status !== 'done' && plan_date < today`
  - 提取需复习笔记: `review_info.next_review_date == today`
- **AI 消息下发**: 将扫描结果封装为系统 Prompt, 通过 WebSocket/IPC 唤醒 VChat 客户端中对应的 `agent_in_charge`, 实现女仆主动催办

### 2.5 艾宾浩斯复习算法

当用户在前端点击"复习完成"时, 后端自动执行:
1. `current_level` += 1
2. 根据间隔天数表 `[1, 2, 4, 7, 15, 30]` 计算 `next_review_date`
3. 当 `current_level >= target_level` 时, 设置 `is_reviewable = false`

---

## 三、前端组件架构

### 3.1 目录结构

```
src/
├── types/
│   └── task.ts                  // ITaskItem 接口定义
├── api/
│   └── task.ts                  // Axios 封装的后端 API 调用
├── store/
│   └── taskStore.ts             // Pinia 状态管理 (核心引擎)
├── views/
│   └── TaskManager/
│       ├── index.vue            // 页面入口 (大框架, 负责组合所有子组件)
│       ├── components/
│       │   ├── Dashboard.vue          // 顶部仪表盘 (时间进度、效率统计)
│       │   ├── ToolBar.vue            // 操作栏 (新建、搜索、视图切换)
│       │   ├── TaskCreateDialog.vue   // 新建任务弹窗 (el-dialog + el-form)
│       │   ├── views/
│       │   │   ├── TableView.vue      // 表格视图 (el-table)
│       │   │   └── KanbanView.vue     // 看板视图 (vuedraggable)
│       │   └── shared/
│       │       ├── TaskCard.vue       // 看板卡片组件
│       │       └── DetailDrawer.vue   // 右侧详情抽屉 (el-drawer)
```

### 3.2 Pinia 状态管理 (taskStore.ts) 核心骨架

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ITaskItem } from '@/types/task';

export const useTaskStore = defineStore('taskStore', () => {
  // ========== State ==========
  const taskList = ref<ITaskItem[]>([]);
  const isLoading = ref(false);
  const currentView = ref<'table' | 'kanban'>('kanban');
  const searchQuery = ref('');

  // ========== Getters (派生计算, 零延迟) ==========
  
  // 基础过滤
  const filteredTasks = computed(() => {
    if (!searchQuery.value) return taskList.value;
    return taskList.value.filter(task =>
      task.title.includes(searchQuery.value) ||
      task.properties.project.includes(searchQuery.value)
    );
  });

  // 看板三列数据
  const todoTasks = computed(() => filteredTasks.value.filter(t => t.properties.status === 'todo'));
  const inProgressTasks = computed(() => filteredTasks.value.filter(t => t.properties.status === 'in_progress'));
  const doneTasks = computed(() => filteredTasks.value.filter(t => t.properties.status === 'done'));

  // 仪表盘: 今日待复习列表
  const todayReviewTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return taskList.value.filter(t =>
      t.ai_meta.review_info?.is_reviewable &&
      t.ai_meta.review_info?.next_review_date === today
    );
  });

  // 仪表盘: 本周番茄钟消耗
  const weeklyPomodoroSpent = computed(() => {
    return taskList.value.reduce((total, task) => total + (task.ai_meta.pomodoro_spent || 0), 0);
  });

  // 仪表盘: 逾期任务数量
  const overdueTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return taskList.value.filter(t =>
      t.properties.status !== 'done' &&
      t.properties.plan_date < today
    );
  });

  // ========== Actions ==========
  
  const loadTasks = async () => {
    isLoading.value = true;
    try {
      // const res = await fetchTasksApi();
      // taskList.value = res.data;
    } finally {
      isLoading.value = false;
    }
  };

  // 拖拽改变状态 (乐观更新机制)
  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    const task = taskList.value.find(t => t.id === taskId);
    if (!task) return;
    const oldStatus = task.properties.status;
    task.properties.status = newStatus; // 乐观更新, 先改前端
    try {
      // await updateTaskApi(taskId, { 'properties.status': newStatus });
    } catch (error) {
      task.properties.status = oldStatus; // 失败回滚
      console.error('状态更新失败，已回滚', error);
    }
  };

  return {
    taskList, isLoading, currentView, searchQuery,
    filteredTasks, todoTasks, inProgressTasks, doneTasks,
    todayReviewTasks, weeklyPomodoroSpent, overdueTasks,
    loadTasks, updateTaskStatus
  };
});
```

### 3.3 看板视图核心逻辑 (KanbanView.vue)

```vue
<template>
  <div class="kanban-board" style="display: flex; gap: 20px; align-items: flex-start;">
    <div class="kanban-column" v-for="col in columns" :key="col.status"
         style="background: #F1F5F9; border-radius: 8px; width: 33%; padding: 15px;">
      <div class="column-header" style="font-weight: bold; margin-bottom: 15px;">
        {{ col.icon }} {{ col.label }} ({{ col.list.length }})
      </div>
      <draggable
        v-model="col.list"
        group="tasks"
        item-key="id"
        animation="200"
        ghost-class="ghost-card"
        @change="(evt) => handleDragChange(evt, col.status)"
      >
        <template #item="{ element }">
          <div style="margin-bottom: 12px; cursor: grab;">
            <TaskCard :task="element" @click="openDetailDrawer(element)" />
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import draggable from 'vuedraggable';
import { useTaskStore } from '@/store/taskStore';
import TaskCard from '../shared/TaskCard.vue';

const store = useTaskStore();

// 核心避坑: 建立本地 Ref 副本, 避免直接修改 computed 只读属性
const localTodo = ref([...store.todoTasks]);
const localInProgress = ref([...store.inProgressTasks]);
const localDone = ref([...store.doneTasks]);

watch(() => store.todoTasks, (v) => { localTodo.value = [...v]; }, { deep: true });
watch(() => store.inProgressTasks, (v) => { localInProgress.value = [...v]; }, { deep: true });
watch(() => store.doneTasks, (v) => { localDone.value = [...v]; }, { deep: true });

const columns = reactive([
  { status: 'todo', label: '待办', icon: '🕒', list: localTodo },
  { status: 'in_progress', label: '进行中', icon: '🔥', list: localInProgress },
  { status: 'done', label: '已完成', icon: '✅', list: localDone },
]);

const handleDragChange = (evt: any, newStatus: string) => {
  if (evt.added) {
    store.updateTaskStatus(evt.added.element.id, newStatus as any);
  }
};

const openDetailDrawer = (task: any) => {
  // 通过 emit 或全局事件总线打开 DetailDrawer
};
</script>

<style scoped>
.ghost-card {
  opacity: 0.4;
  background-color: #E2E8F0;
  border: 2px dashed #94A3B8;
  border-radius: 8px;
}
</style>
```

### 3.4 任务卡片组件 (TaskCard.vue) 设计要点

- 顶部: 标题 + 优先级标签 (P1=三把火, P2=两把火, P3=一把火)
- 中部: el-progress 进度条 (根据 ai_meta.progress 渲染, 颜色随逾期状态动态变化)
- 底部: 左侧显示负责人头像+名字 (ai_meta.agent_in_charge), 右侧显示倒计时标签 (根据 plan_date 计算剩余天数)
- 标签区: 使用 el-tag 渲染 properties.project 和 knowledge_refs.tags

### 3.5 仪表盘组件 (Dashboard.vue) 设计要点

仪表盘分为两行:

**第一行: 四宫格时间进度条 (自动计算, 无需后端参与)**
- 本周进度 / 本月进度 / 本季进度 / 本年进度
- 使用 el-progress, 通过 JS 自动算出当前时间在各周期内的百分比
- 进度条颜色: 绿色(充裕) -> 蓝色(正常) -> 橙色(偏紧) -> 红色(告急)

**第二行: 效率统计卡片群 (数据来自 Pinia 的 computed)**
- 本周效率 (番茄/日): weeklyPomodoroSpent / 7
- 待复习笔记: todayReviewTasks.length
- 逾期任务: overdueTasks.length
- 已完成: doneTasks.length
- 每个卡片使用低饱和度渐变背景 (淡蓝/淡绿/淡紫/淡粉)
- 组件选型: el-row + el-col 布局, el-statistic 展示数字

### 3.6 操作栏组件 (ToolBar.vue) 设计要点

- 左侧: "新建任务"按钮 (el-button type="primary"), 点击弹出 TaskCreateDialog
- 中间: 搜索框 (el-input), 双向绑定 store.searchQuery
- 右侧: 视图切换 (el-radio-group), 切换 store.currentView

### 3.7 详情抽屉组件 (DetailDrawer.vue) 设计要点

- 使用 el-drawer 从右侧滑出
- 区块1: AI 互动区 - 展示负责女仆的催办留言和互动记录
- 区块2: 轻量备注区 - 一个 el-input type="textarea" 绑定 task.memo, 支持简单的 Checklist 格式
- 区块3: 知识关联卡片 - 只展示 knowledge_refs.tags 和 diary_ids 的标题索引卡片 (不拉取全文), 点击可跳转

### 3.8 多视图切换 (index.vue) 核心逻辑

```vue
<template>
  <div class="task-manager-page">
    <Dashboard />
    <ToolBar />
    <component :is="viewComponent" />
    <DetailDrawer />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTaskStore } from '@/store/taskStore';
import Dashboard from './components/Dashboard.vue';
import ToolBar from './components/ToolBar.vue';
import TableView from './components/views/TableView.vue';
import KanbanView from './components/views/KanbanView.vue';
import DetailDrawer from './components/shared/DetailDrawer.vue';

const store = useTaskStore();

const viewComponent = computed(() => {
  return store.currentView === 'kanban' ? KanbanView : TableView;
});
</script>
```

### 3.9 表格视图 (TableView.vue) 设计要点

- 基于 el-table 二次封装
- 列配置: 任务名 / 计划日 / 计划量+单位 / 预计用时 / 任务性质 / 优先级 (自定义火焰图标) / 长期任务归属 / 进度条
- 支持 el-table 自带的列排序 (sortable) 和筛选 (filters)
- 行内快捷操作: 点击状态列的下拉菜单可直接切换 status
- 点击整行触发 DetailDrawer 打开

---

## 四、需要安装的依赖

```bash
npm install vuedraggable@next    # Vue 3 拖拽组件
```

其余依赖 (vue, pinia, element-plus, vite, typescript) 项目中应已存在。

---

## 五、开发优先级建议

| 优先级 | 模块 | 说明 |
|--------|------|------|
| P0 | types/task.ts | 先定义好数据接口 |
| P0 | store/taskStore.ts | 搭建 Pinia 数据引擎 (可先用 Mock 数据) |
| P1 | KanbanView.vue + TaskCard.vue | 核心交互体验 |
| P1 | Dashboard.vue | 视觉冲击力最强的模块 |
| P2 | ToolBar.vue + TaskCreateDialog.vue | 新建任务的入口 |
| P2 | TableView.vue | 表格是看板的互补视图 |
| P3 | DetailDrawer.vue | 点击卡片后的详情展示 |
| P3 | api/task.ts | 对接真实后端 API (初期可用 Mock) |

---

## 六、后端 VCP 插件规划 (后续开发)

在 VCPToolBox 的 Plugin 目录下新建 `TaskAssistantPlugin`:
- 提供工具调用接口, 让 Agent 能通过自然语言创建/修改/查询任务
- 接入定时扫描逻辑, 每日触发催办与复习提醒
- 复习完成时自动更新艾宾浩斯算法参数

---

*本文档由 VCP Agent 晴天 与主人 lemon 于 2026-03-22 晚共同设计完成。*