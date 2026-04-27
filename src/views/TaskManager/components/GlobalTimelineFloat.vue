<template>
  <div class="global-timeline-float">
    <MiniTimelineWidget @expand="isTimelineDialogOpen = true" />

    <Teleport to="body">
      <Transition name="timeline-pop">
        <div v-if="isTimelineDialogOpen" class="timeline-backdrop" @click="isTimelineDialogOpen = false">
          <div class="timeline-panel" @click.stop>
            <div class="timeline-panel-header">
              <div>
                <div class="timeline-title">全域排期雷达 (Timeline)</div>
                <div class="timeline-subtitle">跨层级任务排期与进度视图</div>
              </div>
              <button class="timeline-close" @click="isTimelineDialogOpen = false">✕</button>
            </div>

            <div class="gantt-dialog-body">
              <div class="gantt-toolbar">
                <div class="gantt-toolbar-main">
                  <div class="toolbar-group left-group">
                    <span class="toolbar-title">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                      缩放：
                    </span>
                    <el-radio-group v-model="currentZoom" size="small" class="vcp-radio-group">
                      <el-radio-button value="day">天</el-radio-button>
                      <el-radio-button value="week">周</el-radio-button>
                      <el-radio-button value="month">月</el-radio-button>
                      <el-radio-button value="quarter">季</el-radio-button>
                      <el-radio-button value="year">年</el-radio-button>
                    </el-radio-group>
                  </div>

                  <div class="right-filters">
                    <div class="toolbar-group radar-summary" :title="activeFilterSummary">
                      <span class="summary-pill scheduled">已排期 {{ scheduledTaskCount }}</span>
                      <span class="summary-pill unscheduled">未排期 {{ unscheduledTasks.length }}</span>
                      <span class="summary-pill context">上下文 {{ contextTaskCount }}</span>
                    </div>

                    <button class="today-jump-btn" @click="jumpToToday">
                      <span>⌖</span>
                      跳到今天
                    </button>

                    <el-switch v-model="showCompletedTasks" size="small" active-text="显示已完成" class="completed-switch" />
                    <el-switch v-model="keepParentContext" size="small" active-text="保留父级上下文" class="completed-switch" />
                  </div>
                </div>

                <div class="gantt-toolbar-advanced">
                  <div class="toolbar-group">
                    <span class="toolbar-title">范围：</span>
                    <el-select v-model="radarRangeKey" size="small" style="width: 130px;" class="vcp-custom-select" popper-class="vcp-radar-popper">
                      <el-option label="本周" value="this_week" />
                      <el-option label="本月" value="this_month" />
                      <el-option label="未来30天" value="next_30_days" />
                      <el-option label="本季度" value="this_quarter" />
                      <el-option label="全年" value="this_year" />
                      <el-option label="全部时间" value="all" />
                    </el-select>
                  </div>

                  <div class="toolbar-group">
                    <span class="toolbar-title">层级：</span>
                    <el-select v-model="filterPeriod" size="small" style="width: 130px;" class="vcp-custom-select" popper-class="vcp-radar-popper">
                      <el-option label="所有层级" value="all" />
                      <el-option label="长期 Epic" value="long_term" />
                      <el-option label="短期 Story" value="short_term" />
                      <el-option label="今日 Task" value="daily" />
                      <el-option label="常驻 Routine" value="routine" />
                    </el-select>
                  </div>

                  <div class="toolbar-group">
                    <span class="toolbar-title">状态：</span>
                    <el-select v-model="filterStatus" size="small" style="width: 130px;" class="vcp-custom-select" popper-class="vcp-radar-popper">
                      <el-option label="全部状态" value="all" />
                      <el-option label="待办" value="todo" />
                      <el-option label="进行中" value="in_progress" />
                      <el-option label="已完成" value="done" />
                      <el-option label="逾期" value="overdue" />
                    </el-select>
                  </div>

                  <div class="toolbar-group">
                    <span class="toolbar-title">优先级：</span>
                    <el-select v-model="filterPriority" size="small" style="width: 110px;" class="vcp-custom-select" popper-class="vcp-radar-popper">
                      <el-option label="全部" value="all" />
                      <el-option label="P0" value="p0" />
                      <el-option label="P1" value="p1" />
                      <el-option label="P2" value="p2" />
                      <el-option label="P3" value="p3" />
                    </el-select>
                  </div>

                  <div class="toolbar-group search-group">
                    <span class="toolbar-title">搜索：</span>
                    <el-input v-model="radarSearch" size="small" clearable placeholder="标题 / 标签 / 智能体" class="radar-search-input" />
                  </div>
                </div>
              </div>

              <div class="radar-content-layout">
                <div class="gantt-wrapper">
                  <GanttChart
                    v-if="isTimelineDialogOpen"
                    :tasks="ganttTasks"
                    :zoomLevel="currentZoom"
                    :todaySignal="todayJumpSignal"
                    @task-selected="openDetail"
                    @task-dblclick="openDetail"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <DetailDrawer :visible="isDrawerOpen" :task-id="selectedTaskId" @close="isDrawerOpen = false" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import GanttChart from '@/components/GanttChart.vue'
import { useTaskStore } from '@/stores/taskStore'
import type { ITaskItem, KanbanColumn, TaskPeriod, TaskPriority } from '@/types/task'
import DetailDrawer from './DetailDrawer.vue'
import MiniTimelineWidget from './MiniTimelineWidget.vue'

const store = useTaskStore()

const isTimelineDialogOpen = ref(false)
const currentZoom = ref('month')
const todayJumpSignal = ref(0)
const isDrawerOpen = ref(false)
const selectedTaskId = ref<string | null>(null)

const filterPeriod = ref<'all' | TaskPeriod>('all')
const filterStatus = ref<'all' | KanbanColumn | 'overdue'>('all')
const filterPriority = ref<'all' | TaskPriority>('all')
const radarRangeKey = ref('next_30_days')
const radarSearch = ref('')
const showCompletedTasks = ref(false)
const keepParentContext = ref(true)

const hasScheduleDate = (task: ITaskItem) => Boolean(task.plan_date || task.due_date)
const hasMeaningfulTitle = (task: ITaskItem) => Boolean(task.title?.trim()) && task.title.trim() !== '未命名任务'
const isTaskDone = (task: ITaskItem) => task.kanban_col === 'done'
const isTaskOverdue = (task: ITaskItem) => task.kanban_col !== 'done' && Boolean(task.due_date && task.due_date < Date.now())

const activeFilterSummary = computed(() => {
  const parts: string[] = []
  if (radarRangeKey.value !== 'all') parts.push('时间范围')
  if (filterPeriod.value !== 'all') parts.push('层级')
  if (filterStatus.value !== 'all') parts.push('状态')
  if (filterPriority.value !== 'all') parts.push('优先级')
  if (radarSearch.value.trim()) parts.push('搜索')
  if (!showCompletedTasks.value) parts.push('隐藏已完成')
  if (keepParentContext.value) parts.push('父级上下文')
  return parts.length ? `已启用：${parts.join(' / ')}` : '未启用额外筛选'
})

const radarRange = computed(() => {
  const now = new Date()
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const start = startOfDay(now)
  const end = new Date(start)

  if (radarRangeKey.value === 'this_week') {
    const day = start.getDay() || 7
    start.setDate(start.getDate() - day + 1)
    end.setDate(start.getDate() + 7)
  } else if (radarRangeKey.value === 'this_month') {
    start.setDate(1)
    end.setMonth(start.getMonth() + 1, 1)
  } else if (radarRangeKey.value === 'next_30_days') {
    end.setDate(start.getDate() + 30)
  } else if (radarRangeKey.value === 'this_quarter') {
    const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3
    start.setMonth(quarterStartMonth, 1)
    end.setMonth(quarterStartMonth + 3, 1)
  } else if (radarRangeKey.value === 'this_year') {
    start.setMonth(0, 1)
    end.setFullYear(start.getFullYear() + 1, 0, 1)
  } else {
    return null
  }

  return { start: start.getTime(), end: end.getTime() }
})

const intersectsRadarRange = (task: ITaskItem) => {
  const range = radarRange.value
  if (!range) return true
  const taskStart = task.plan_date || task.due_date
  const taskEnd = task.due_date || task.plan_date
  if (!taskStart || !taskEnd) return false
  return taskStart < range.end && taskEnd >= range.start
}

const matchesSearch = (task: ITaskItem) => {
  const keyword = radarSearch.value.trim().toLowerCase()
  if (!keyword) return true
  return [
    task.title,
    task.creator_agent,
    ...(task.tags || []),
    ...(task.knowledge_tags || [])
  ].filter(Boolean).join(' ').toLowerCase().includes(keyword)
}

const applyRadarFilters = (tasks: ITaskItem[]) => {
  let filtered = tasks

  if (filterPeriod.value !== 'all') {
    filtered = filtered.filter(t => t.period === filterPeriod.value)
  }

  if (filterPriority.value !== 'all') {
    filtered = filtered.filter(t => t.priority === filterPriority.value)
  }

  filtered = filtered.filter(intersectsRadarRange).filter(matchesSearch)

  if (!showCompletedTasks.value) {
    filtered = filtered.filter(t => !isTaskDone(t))
  }

  if (filterStatus.value === 'overdue') {
    filtered = filtered.filter(isTaskOverdue)
  } else if (filterStatus.value !== 'all') {
    filtered = filtered.filter(t => t.kanban_col === filterStatus.value)
  }

  return filtered
}

const parentLookup = computed(() => new Map(store.normalizedTaskList.map(task => [task.id, task])))

const scheduledBaseTasks = computed(() => applyRadarFilters(
  store.normalizedTaskList.filter(t => hasScheduleDate(t) && hasMeaningfulTitle(t))
))

const scheduledTasks = computed(() => {
  if (!keepParentContext.value) return scheduledBaseTasks.value
  const taskMap = new Map(scheduledBaseTasks.value.map(task => [task.id, task]))

  scheduledBaseTasks.value.forEach(task => {
    let parentId = task.parent_id || task.project
    while (parentId) {
      const parent = parentLookup.value.get(parentId)
      if (!parent || taskMap.has(parent.id) || !hasScheduleDate(parent) || !hasMeaningfulTitle(parent)) break
      taskMap.set(parent.id, parent)
      parentId = parent.parent_id || parent.project || null
    }
  })

  return Array.from(taskMap.values())
})

const scheduledTaskCount = computed(() => scheduledBaseTasks.value.length)
const contextTaskCount = computed(() => Math.max(0, scheduledTasks.value.length - scheduledBaseTasks.value.length))
const unscheduledTasks = computed(() => store.normalizedTaskList.filter(t => !hasScheduleDate(t) || !hasMeaningfulTitle(t)))

const buildTaskDateRange = (task: ITaskItem) => {
  const startBase = task.plan_date || task.due_date
  if (!startBase) return null

  const startDate = new Date(startBase)
  let endDate = new Date(task.due_date || task.plan_date || startBase)

  if (endDate.getTime() <= startDate.getTime()) {
    const padding = task.period === 'daily' ? 2 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    endDate = new Date(startDate.getTime() + padding)
  }

  return { startDate, endDate }
}

const taskProgress = (task: ITaskItem) => {
  if (task.kanban_col === 'done') return 1
  const completedAmount = task.effective_completed_amount ?? task.completed_amount ?? 0
  const actualPomodoros = task.effective_actual_pomodoros ?? task.actual_pomodoros ?? 0
  if (task.planned_amount && task.planned_amount > 0) return Math.min(1, completedAmount / task.planned_amount)
  if (task.planned_pomodoros && task.planned_pomodoros > 0) return Math.min(1, actualPomodoros / task.planned_pomodoros)
  if (task.kanban_col === 'in_progress') return 0.5
  return 0
}

const taskThemeColor = (task: ITaskItem) => {
  if (task.color) return task.color
  if (task.period === 'long_term') return '#3E3A36'
  if (task.period === 'short_term') return '#516B91'
  if (task.period === 'routine') return '#A16207'
  return '#4A9D9A'
}

const ganttTasks = computed(() => {
  const allTasks = scheduledTasks.value
  const validIds = new Set(allTasks.map(t => t.id))

  const data = allTasks.map(t => {
    const range = buildTaskDateRange(t)
    if (!range) return null

    let parentId: string | number = t.parent_id || t.project || 0
    if (typeof parentId === 'string' && !validIds.has(parentId)) parentId = 0

    const themeColor = taskThemeColor(t)
    const isContext = !scheduledBaseTasks.value.some(base => base.id === t.id)

    return {
      id: t.id,
      text: isContext ? `↳ ${t.title.trim()}` : t.title.trim(),
      start_date: range.startDate,
      end_date: range.endDate,
      parent: parentId,
      progress: taskProgress(t),
      type: t.period === 'long_term' ? 'project' : 'task',
      color: isContext ? 'rgba(62, 58, 54, 0.04)' : isTaskOverdue(t) ? 'rgba(244, 63, 94, 0.12)' : 'rgba(62, 58, 54, 0.08)',
      progressColor: isContext ? 'rgba(140, 132, 122, 0.35)' : isTaskOverdue(t) ? '#F43F5E' : themeColor,
      themeColor,
      overdue: isTaskOverdue(t),
      context: isContext,
      open: true
    }
  }).filter(Boolean)

  return { data, links: [] }
})

const jumpToToday = () => {
  todayJumpSignal.value += 1
}

const openDetail = (taskId: string) => {
  selectedTaskId.value = taskId
  isDrawerOpen.value = true
  isTimelineDialogOpen.value = false
}
</script>

<style scoped>
.global-timeline-float {
  pointer-events: none;
}

:deep(.mini-radar-widget) {
  pointer-events: auto;
}

.timeline-backdrop {
  position: fixed;
  inset: 0;
  z-index: 4500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 40px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.42);
  pointer-events: auto;
}

.timeline-panel {
  width: min(2350px, calc(100vw - 80px));
  height: min(980px, calc(100vh - 56px));
  background: var(--vcp-bg-card, #FFFFFF);
  border-radius: 18px;
  box-shadow: 0 28px 70px rgba(62, 58, 54, 0.22);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.timeline-panel-header {
  padding: 24px 28px 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid rgba(62, 58, 54, 0.06);
  flex-shrink: 0;
}

.timeline-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--vcp-text-main, #3E3A36);
}

.timeline-subtitle {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vcp-text-sub, #8C847A);
}

.timeline-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 12px;
  background: var(--vcp-bg-column, #F5F4EE);
  color: var(--vcp-text-sub, #8C847A);
  cursor: pointer;
  font-size: 16px;
  font-weight: 800;
  transition: all 0.2s ease;
}

.timeline-close:hover {
  background: #4A9D9A;
  color: #fff;
}

.gantt-dialog-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--vcp-bg-column, #FAFAF8);
  overflow: hidden;
}

.gantt-toolbar {
  padding: 14px 24px;
  background: var(--vcp-bg-card, #FFFFFF);
  border-bottom: 1px solid rgba(62, 58, 54, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;
}

.gantt-toolbar-main,
.gantt-toolbar-advanced {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.gantt-toolbar-advanced {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.radar-search-input {
  width: 210px;
}

.toolbar-group {
  display: flex;
  align-items: center;
}

.radar-summary {
  gap: 8px;
}

.summary-pill {
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.summary-pill.scheduled {
  color: #2563EB;
  background: rgba(37, 99, 235, 0.08);
}

.summary-pill.unscheduled {
  color: #A16207;
  background: rgba(161, 98, 7, 0.1);
}

.summary-pill.context {
  color: #6B7280;
  background: rgba(107, 114, 128, 0.1);
}

.today-jump-btn {
  height: 30px;
  border: 1px solid rgba(74, 157, 154, 0.18);
  border-radius: 9px;
  background: rgba(74, 157, 154, 0.08);
  color: var(--color-primary, #4A9D9A);
  font-size: 12px;
  font-weight: 800;
  padding: 0 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.today-jump-btn:hover {
  background: var(--color-primary, #4A9D9A);
  color: #fff;
  transform: translateY(-1px);
}

.right-filters {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.completed-switch {
  --el-switch-on-color: var(--color-primary, #4A9D9A);
  white-space: nowrap;
}

.toolbar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vcp-text-sub);
  margin-right: 12px;
  display: flex;
  align-items: center;
}

:deep(.vcp-custom-select .el-input__wrapper) {
  background: var(--vcp-bg-column, #F5F4EE);
  border: 1px solid rgba(62, 58, 54, 0.05);
  box-shadow: none !important;
  border-radius: 8px;
}

:deep(.vcp-custom-select:hover .el-input__wrapper) {
  border-color: var(--color-primary, #4A9D9A);
}

:deep(.vcp-custom-select .el-input__inner) {
  font-weight: 600;
  color: var(--vcp-text-main);
}

.radar-content-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  padding: 16px;
}

.gantt-wrapper {
  flex: 1;
  min-height: 520px;
  height: 100%;
  padding: 0;
}

.timeline-pop-enter-active,
.timeline-pop-leave-active { transition: opacity 0.2s ease; }
.timeline-pop-enter-active .timeline-panel,
.timeline-pop-leave-active .timeline-panel { transition: transform 0.2s ease, opacity 0.2s ease; }
.timeline-pop-enter-from,
.timeline-pop-leave-to { opacity: 0; }
.timeline-pop-enter-from .timeline-panel,
.timeline-pop-leave-to .timeline-panel { opacity: 0; transform: translateY(-10px) scale(0.98); }

:global(.vcp-radar-popper) {
  z-index: 7000 !important;
}
</style>
