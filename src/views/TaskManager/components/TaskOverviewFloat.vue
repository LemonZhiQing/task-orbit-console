<template>
  <div class="task-overview-float">
    <button class="overview-trigger" :class="{ active: isPanelOpen }" @click="togglePanel" title="任务总览 / 高级筛选">
      <span class="trigger-icon">☷</span>
      <span class="trigger-text">总览</span>
      <span class="trigger-count">{{ store.normalizedTaskList.length }}</span>
    </button>

    <Teleport to="body">
      <Transition name="overview-pop">
        <div v-if="isPanelOpen" class="overview-backdrop" @click="isPanelOpen = false">
          <div class="overview-panel" @click.stop>
        <div class="panel-header">
          <div>
            <div class="panel-title">全任务表格</div>
            <div class="panel-subtitle">{{ filteredTasks.length }} / {{ store.normalizedTaskList.length }} 个任务</div>
          </div>
          <button class="panel-close" @click="isPanelOpen = false">✕</button>
        </div>

        <div class="search-row">
          <el-input
            v-model="filters.keyword"
            clearable
            size="large"
            class="keyword-input"
            placeholder="搜索标题 / 备注 / 标签 / 智能体 / ID"
          >
            <template #prefix>⌕</template>
          </el-input>
          <button class="reset-btn" @click="resetFilters">重置</button>
        </div>

        <div class="quick-filters">
          <button
            v-for="item in quickStatusOptions"
            :key="item.value"
            class="chip-btn"
            :class="{ active: filters.quickStatus === item.value }"
            @click="filters.quickStatus = item.value"
          >
            {{ item.label }}
          </button>
        </div>

        <details class="advanced-box">
          <summary>高级筛选</summary>
          <div class="advanced-grid">
            <label class="field">
              <span>层级</span>
              <el-select v-model="filters.period" size="small" class="field-control">
                <el-option label="全部层级" value="all" />
                <el-option label="今日任务" value="daily" />
                <el-option label="短期目标" value="short_term" />
                <el-option label="长期宏图" value="long_term" />
                <el-option label="常驻习惯" value="routine" />
              </el-select>
            </label>

            <label class="field">
              <span>看板状态</span>
              <el-select v-model="filters.column" size="small" class="field-control">
                <el-option label="全部状态" value="all" />
                <el-option label="待办" value="todo" />
                <el-option label="进行中" value="in_progress" />
                <el-option label="已完成" value="done" />
              </el-select>
            </label>

            <label class="field">
              <span>优先级</span>
              <el-select v-model="filters.priority" size="small" class="field-control">
                <el-option label="全部优先级" value="all" />
                <el-option label="P0 紧急" value="p0" />
                <el-option label="P1 高" value="p1" />
                <el-option label="P2 中" value="p2" />
                <el-option label="P3 低" value="p3" />
              </el-select>
            </label>

            <label class="field">
              <span>智能体</span>
              <el-select v-model="filters.creator" clearable filterable size="small" class="field-control" placeholder="全部智能体">
                <el-option v-for="agent in creatorOptions" :key="agent" :label="agent" :value="agent" />
              </el-select>
            </label>

            <label class="field">
              <span>日期字段</span>
              <el-select v-model="filters.dateField" size="small" class="field-control">
                <el-option label="计划日" value="plan_date" />
                <el-option label="截止日" value="due_date" />
                <el-option label="更新时间" value="updated_at" />
                <el-option label="创建时间" value="created_at" />
              </el-select>
            </label>

            <label class="field wide-field">
              <span>日期范围</span>
              <el-date-picker
                v-model="filters.dateRange"
                type="daterange"
                unlink-panels
                size="small"
                range-separator="至"
                start-placeholder="开始"
                end-placeholder="结束"
                value-format="x"
                class="date-range"
              />
            </label>

            <label class="field">
              <span>标签包含</span>
              <el-input v-model="filters.tag" clearable size="small" class="field-control" placeholder="普通/知识标签" />
            </label>

            <label class="field">
              <span>排序</span>
              <el-select v-model="filters.sortBy" size="small" class="field-control">
                <el-option label="最近更新" value="updated_desc" />
                <el-option label="创建时间" value="created_desc" />
                <el-option label="截止日近→远" value="due_asc" />
                <el-option label="优先级高→低" value="priority_asc" />
                <el-option label="番茄进度低→高" value="progress_asc" />
              </el-select>
            </label>
          </div>
        </details>

        <div class="stats-strip">
          <span>待办 {{ stats.todo }}</span>
          <span>进行中 {{ stats.inProgress }}</span>
          <span>已完成 {{ stats.done }}</span>
          <span>逾期 {{ stats.overdue }}</span>
          <span>复习 {{ stats.review }}</span>
        </div>

        <div class="table-shell">
          <table class="task-table">
            <thead>
              <tr>
                <th>任务</th>
                <th>层级</th>
                <th>状态</th>
                <th>优先</th>
                <th>进度</th>
                <th>计划 / 截止</th>
                <th>标签</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in visibleTasks" :key="task.id" @click="openDetail(task.id)">
                <td class="title-cell">
                  <div class="task-title">
                    <span v-if="task.is_focused" class="focus-dot">●</span>
                    {{ task.title || '未命名任务' }}
                  </div>
                  <div class="task-meta">{{ task.creator_agent || '手动创建' }} · {{ task.id }}</div>
                </td>
                <td><span class="soft-badge">{{ periodName(task.period) }}</span></td>
                <td><span class="status-badge" :class="`status-${task.kanban_col}`">{{ columnName(task.kanban_col) }}</span></td>
                <td><span class="priority-badge" :class="`priority-${task.priority}`">{{ task.priority.toUpperCase() }}</span></td>
                <td>
                  <div class="progress-cell">
                    <div class="mini-bar"><i :style="{ width: `${progressPercent(task)}%` }"></i></div>
                    <span>{{ progressText(task) }}</span>
                  </div>
                </td>
                <td class="date-cell">
                  <div>{{ formatDate(task.plan_date) }}</div>
                  <div :class="{ overdue: isOverdue(task) }">{{ formatDate(task.due_date) }}</div>
                </td>
                <td class="tag-cell">
                  <span v-for="tag in compactTags(task)" :key="tag" class="mini-tag">{{ tag }}</span>
                </td>
                <td class="date-cell">{{ formatDate(task.updated_at) }}</td>
              </tr>
              <tr v-if="visibleTasks.length === 0">
                <td colspan="8" class="empty-cell">没有匹配的任务</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="panel-footer">
          <span>显示前 {{ visibleTasks.length }} 条，继续筛选可缩小范围</span>
          <button class="sync-btn" @click="refreshFromServer">刷新数据</button>
        </div>
          </div>
        </div>
      </Transition>

      <DetailDrawer :visible="isDrawerOpen" :task-id="selectedTaskId" @close="isDrawerOpen = false" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import DetailDrawer from './DetailDrawer.vue'
import { useTaskStore } from '@/stores/taskStore'
import type { ITaskItem, KanbanColumn, TaskPeriod, TaskPriority } from '@/types/task'

const store = useTaskStore()
const isPanelOpen = ref(false)
const isDrawerOpen = ref(false)
const selectedTaskId = ref<string | null>(null)

const quickStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '进行中', value: 'active' },
  { label: '已完成', value: 'done' },
  { label: '逾期', value: 'overdue' },
  { label: '复习', value: 'review' },
  { label: '专注', value: 'focused' }
] as const

type QuickStatus = typeof quickStatusOptions[number]['value']
type DateField = 'plan_date' | 'due_date' | 'updated_at' | 'created_at'
type SortBy = 'updated_desc' | 'created_desc' | 'due_asc' | 'priority_asc' | 'progress_asc'

const filters = reactive<{
  keyword: string
  quickStatus: QuickStatus
  period: 'all' | TaskPeriod
  column: 'all' | KanbanColumn
  priority: 'all' | TaskPriority
  creator: string
  dateField: DateField
  dateRange: [string, string] | null
  tag: string
  sortBy: SortBy
}>({
  keyword: '',
  quickStatus: 'all',
  period: 'all',
  column: 'all',
  priority: 'all',
  creator: '',
  dateField: 'due_date',
  dateRange: null,
  tag: '',
  sortBy: 'updated_desc'
})

const creatorOptions = computed(() => Array.from(new Set(
  store.normalizedTaskList.map(task => task.creator_agent).filter(Boolean) as string[]
)).sort((a, b) => a.localeCompare(b, 'zh-CN')))

const stats = computed(() => {
  const now = Date.now()
  return store.normalizedTaskList.reduce((acc, task) => {
    if (task.kanban_col === 'todo') acc.todo += 1
    if (task.kanban_col === 'in_progress') acc.inProgress += 1
    if (task.kanban_col === 'done') acc.done += 1
    if (task.due_date && task.due_date < now && task.kanban_col !== 'done') acc.overdue += 1
    if (task.is_review) acc.review += 1
    return acc
  }, { todo: 0, inProgress: 0, done: 0, overdue: 0, review: 0 })
})

const filteredTasks = computed(() => {
  const now = Date.now()
  const keyword = filters.keyword.trim().toLowerCase()
  const tagKeyword = filters.tag.trim().toLowerCase()
  const [rangeStart, rangeEnd] = filters.dateRange || []
  const startTime = rangeStart ? Number(rangeStart) : null
  const endTime = rangeEnd ? Number(rangeEnd) + 24 * 60 * 60 * 1000 - 1 : null

  const result = store.normalizedTaskList.filter(task => {
    if (filters.period !== 'all' && task.period !== filters.period) return false
    if (filters.column !== 'all' && task.kanban_col !== filters.column) return false
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    if (filters.creator && task.creator_agent !== filters.creator) return false

    if (filters.quickStatus === 'active' && task.kanban_col === 'done') return false
    if (filters.quickStatus === 'done' && task.kanban_col !== 'done') return false
    if (filters.quickStatus === 'overdue' && !isOverdue(task, now)) return false
    if (filters.quickStatus === 'review' && !task.is_review) return false
    if (filters.quickStatus === 'focused' && !task.is_focused) return false

    if (keyword) {
      const haystack = [
        task.id,
        task.title,
        task.memo,
        task.creator_agent,
        ...(task.tags || []),
        ...(task.knowledge_tags || [])
      ].join(' ').toLowerCase()
      if (!haystack.includes(keyword)) return false
    }

    if (tagKeyword) {
      const tags = [...(task.tags || []), ...(task.knowledge_tags || [])].join(' ').toLowerCase()
      if (!tags.includes(tagKeyword)) return false
    }

    if (startTime && endTime) {
      const timestamp = Number(task[filters.dateField] || 0)
      if (!timestamp || timestamp < startTime || timestamp > endTime) return false
    }

    return true
  })

  return result.sort((a, b) => {
    if (filters.sortBy === 'created_desc') return (b.created_at || 0) - (a.created_at || 0)
    if (filters.sortBy === 'due_asc') return (a.due_date || Number.MAX_SAFE_INTEGER) - (b.due_date || Number.MAX_SAFE_INTEGER)
    if (filters.sortBy === 'priority_asc') return priorityWeight(a.priority) - priorityWeight(b.priority)
    if (filters.sortBy === 'progress_asc') return progressPercent(a) - progressPercent(b)
    return (b.updated_at || 0) - (a.updated_at || 0)
  })
})

const visibleTasks = computed(() => filteredTasks.value.slice(0, 300))

onMounted(() => {
  store.hydrateFromServer().catch(() => {})
})

const togglePanel = () => {
  isPanelOpen.value = !isPanelOpen.value
}

const openDetail = (taskId: string) => {
  selectedTaskId.value = null
  isPanelOpen.value = false
  requestAnimationFrame(() => {
    selectedTaskId.value = taskId
    isDrawerOpen.value = true
  })
}

const refreshFromServer = () => {
  store.hydrateFromServer(true).catch(() => {})
}

const resetFilters = () => {
  filters.keyword = ''
  filters.quickStatus = 'all'
  filters.period = 'all'
  filters.column = 'all'
  filters.priority = 'all'
  filters.creator = ''
  filters.dateField = 'due_date'
  filters.dateRange = null
  filters.tag = ''
  filters.sortBy = 'updated_desc'
}

const periodName = (period: TaskPeriod) => ({
  daily: '今日',
  short_term: '短期',
  long_term: '长期',
  routine: '常驻'
}[period] || period)

const columnName = (column: KanbanColumn) => ({
  todo: '待办',
  in_progress: '进行中',
  done: '已完成'
}[column] || column)

const priorityWeight = (priority: TaskPriority) => ({ p0: 0, p1: 1, p2: 2, p3: 3 }[priority] ?? 9)

const isOverdue = (task: ITaskItem, now = Date.now()) => Boolean(task.due_date && task.due_date < now && task.kanban_col !== 'done')

const formatDate = (timestamp?: number | null) => {
  if (!timestamp) return '未设置'
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const progressPercent = (task: ITaskItem) => {
  if (task.kanban_col === 'done') return 100
  if (task.planned_amount && task.planned_amount > 0) return Math.min(100, Math.round(((task.completed_amount || 0) / task.planned_amount) * 100))
  if (task.planned_pomodoros && task.planned_pomodoros > 0) return Math.min(100, Math.round(((task.actual_pomodoros || 0) / task.planned_pomodoros) * 100))
  if (task.kanban_col === 'in_progress') return 50
  return 0
}

const progressText = (task: ITaskItem) => {
  if (task.planned_amount && task.planned_amount > 0) return `${task.completed_amount || 0}/${task.planned_amount}${task.unit || ''}`
  if (task.planned_pomodoros && task.planned_pomodoros > 0) return `🍅 ${task.actual_pomodoros || 0}/${task.planned_pomodoros}`
  return `${progressPercent(task)}%`
}

const compactTags = (task: ITaskItem) => [...(task.tags || []), ...(task.knowledge_tags || [])].slice(0, 3)
</script>

<style scoped>
.task-overview-float {
  position: fixed;
  top: 72px;
  right: 36px;
  z-index: 1200;
  pointer-events: none;
}

.overview-trigger {
  pointer-events: auto;
  height: 44px;
  min-width: 126px;
  border: 1px solid rgba(74, 157, 154, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--vcp-text-main, #3E3A36);
  box-shadow: 0 12px 28px rgba(62, 58, 54, 0.08);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.overview-trigger:hover,
.overview-trigger.active {
  transform: translateY(-1px);
  background: rgba(74, 157, 154, 0.95);
  color: #fff;
  box-shadow: 0 18px 36px rgba(74, 157, 154, 0.22);
}

.trigger-icon { font-size: 18px; line-height: 1; }
.trigger-text { font-size: 13px; }
.trigger-count {
  min-width: 24px;
  height: 22px;
  padding: 0 7px;
  border-radius: 12px;
  background: rgba(62, 58, 54, 0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.overview-trigger.active .trigger-count,
.overview-trigger:hover .trigger-count { background: rgba(255,255,255,0.24); }

.overview-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10001;
  pointer-events: auto;
  background: transparent;
}

.overview-panel {
  pointer-events: auto;
  position: fixed;
  top: 24px;
  left: 50%;
  width: min(1180px, calc(100vw - 96px));
  height: calc(100vh - 48px);
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 26px;
  box-shadow: 0 28px 70px rgba(62, 58, 54, 0.16);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 22px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-header,
.search-row,
.stats-strip,
.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}

.panel-title { font-size: 20px; font-weight: 800; color: var(--vcp-text-main, #3E3A36); }
.panel-subtitle { margin-top: 4px; font-size: 12px; color: var(--vcp-text-sub, #8C847A); font-weight: 600; }
.panel-close,
.reset-btn,
.sync-btn {
  border: none;
  border-radius: 12px;
  background: var(--vcp-bg-column, #F5F4EE);
  color: var(--vcp-text-sub, #8C847A);
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s ease;
}
.panel-close { width: 36px; height: 36px; font-size: 16px; }
.reset-btn,
.sync-btn { height: 38px; padding: 0 16px; }
.panel-close:hover,
.reset-btn:hover,
.sync-btn:hover { background: #4A9D9A; color: #fff; }
.keyword-input { flex: 1; }
:deep(.keyword-input .el-input__wrapper) { border-radius: 16px; box-shadow: none; background: rgba(245, 244, 238, 0.78); }

.quick-filters { display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
.chip-btn {
  border: none;
  border-radius: 999px;
  padding: 7px 13px;
  background: rgba(62, 58, 54, 0.06);
  color: var(--vcp-text-sub, #8C847A);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}
.chip-btn.active,
.chip-btn:hover { background: rgba(74, 157, 154, 0.14); color: #2f8582; }

.advanced-box {
  flex-shrink: 0;
  background: rgba(245, 244, 238, 0.62);
  border-radius: 18px;
  padding: 12px 14px 14px;
}
.advanced-box summary {
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 800;
  color: var(--vcp-text-main, #3E3A36);
  margin-bottom: 12px;
}
.advanced-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 12px;
}
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field span { font-size: 11px; color: var(--vcp-text-sub, #8C847A); font-weight: 800; }
.field-control { width: 100%; }
.wide-field { grid-column: span 2; }
.date-range { width: 100%; }
:deep(.advanced-grid .el-input__wrapper),
:deep(.advanced-grid .el-select__wrapper) { box-shadow: none !important; background: rgba(255,255,255,0.72) !important; border-radius: 10px; }

.stats-strip {
  justify-content: flex-start;
  flex-wrap: wrap;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 12px;
  font-weight: 800;
}
.stats-strip span { background: rgba(255,255,255,0.72); padding: 6px 10px; border-radius: 999px; }

.table-shell {
  flex: 1;
  overflow: auto;
  border-radius: 18px;
  border: 1px solid rgba(62, 58, 54, 0.06);
  background: rgba(255, 255, 255, 0.66);
}
.table-shell::-webkit-scrollbar { width: 8px; height: 8px; }
.table-shell::-webkit-scrollbar-thumb { background: rgba(62, 58, 54, 0.12); border-radius: 999px; }
.task-table { width: 100%; border-collapse: collapse; min-width: 980px; }
th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(248, 247, 242, 0.96);
  color: var(--vcp-text-sub, #8C847A);
  font-size: 12px;
  text-align: left;
  padding: 12px 14px;
  white-space: nowrap;
}
td {
  padding: 13px 14px;
  border-top: 1px solid rgba(62, 58, 54, 0.06);
  color: var(--vcp-text-main, #3E3A36);
  font-size: 13px;
  vertical-align: middle;
}
tbody tr { cursor: pointer; transition: background 0.16s ease; }
tbody tr:hover { background: rgba(74, 157, 154, 0.06); }
.title-cell { min-width: 280px; max-width: 420px; }
.task-title { font-weight: 800; line-height: 1.35; word-break: break-all; display: flex; align-items: center; gap: 6px; }
.task-meta { margin-top: 5px; color: var(--vcp-text-sub, #8C847A); font-size: 11px; opacity: 0.72; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 360px; }
.focus-dot { color: #4A9D9A; font-size: 10px; }
.soft-badge,
.status-badge,
.priority-badge,
.mini-tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.soft-badge { background: rgba(62, 58, 54, 0.06); color: var(--vcp-text-sub, #8C847A); }
.status-todo { background: #FFF1F2; color: #E11D48; }
.status-in_progress { background: #EFF6FF; color: #2563EB; }
.status-done { background: #ECFDF5; color: #059669; }
.priority-p0 { background: #FEE2E2; color: #DC2626; }
.priority-p1 { background: #FEF3C7; color: #D97706; }
.priority-p2 { background: #DBEAFE; color: #2563EB; }
.priority-p3 { background: #F1F5F9; color: #64748B; }
.progress-cell { min-width: 120px; display: flex; align-items: center; gap: 8px; color: var(--vcp-text-sub, #8C847A); font-weight: 700; }
.mini-bar { width: 54px; height: 7px; border-radius: 999px; background: rgba(62, 58, 54, 0.08); overflow: hidden; }
.mini-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #4A9D9A, #81C784); }
.date-cell { color: var(--vcp-text-sub, #8C847A); font-size: 12px; white-space: nowrap; line-height: 1.6; }
.overdue { color: #EF4444; font-weight: 800; }
.tag-cell { max-width: 180px; }
.mini-tag { margin: 2px; background: rgba(139, 92, 246, 0.09); color: #7C3AED; }
.empty-cell { text-align: center; padding: 48px; color: var(--vcp-text-sub, #8C847A); }
.panel-footer { color: var(--vcp-text-sub, #8C847A); font-size: 12px; font-weight: 700; }

:deep(.drawer-overlay) { pointer-events: auto; z-index: 11000; }

.overview-pop-enter-active,
.overview-pop-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.overview-pop-enter-from,
.overview-pop-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.98); }

@media (max-width: 1280px) {
  .task-overview-float { top: 76px; right: 20px; }
  .overview-panel { width: calc(100vw - 56px); }
  .advanced-grid { grid-template-columns: repeat(2, minmax(150px, 1fr)); }
}
</style>
