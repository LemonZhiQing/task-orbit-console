import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDebounceFn, useStorage } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { taskApi } from '@/api/task'
import type { ITaskItem, InboxItem, KanbanColumn, TaskPeriod, TaskPriority, ReviewHistoryItem } from '@/types/task'

const STORAGE_KEYS = {
  tasks: 'vcp_tasks',
  inbox: 'vcp_inbox',
  hydrated: 'vcp_tasks_hydrated',
  syncing: 'vcp_tasks_syncing'
} as const

const ORDERED_COLUMNS: KanbanColumn[] = ['todo', 'in_progress', 'done']
const ORDERED_PERIODS: TaskPeriod[] = ['daily', 'short_term', 'long_term', 'routine']
const ORDERED_PRIORITIES: TaskPriority[] = ['p0', 'p1', 'p2', 'p3']
const TASK_THEME_COLORS = ['#4A9D9A', '#3E3A36', '#516B91', '#81C784', '#F43F5E', '#F59E0B', '#8B5CF6', '#10B981', '#3B82F6'] as const
const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 90, 180, 365, 1095]
const LONG_TERM_REVIEW_INTERVAL = 1095

function toTimestamp(value: unknown, fallback = Date.now()): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return numeric
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return parsed
  }
  if (value instanceof Date) return value.getTime()
  return fallback
}

function nullableTimestamp(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  return toTimestamp(value, NaN)
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean)
  return []
}

function normalizeTaskTitle(value: unknown): string {
  const title = typeof value === 'string' ? value.trim() : ''
  return title || '未命名任务'
}

function parseMeta(task: Partial<ITaskItem> & Record<string, any>) {
  if (!task.ai_meta_json) return null
  try { return JSON.parse(task.ai_meta_json) } catch { return null }
}

function normalizeTask(rawTask: Partial<ITaskItem> & Record<string, any>): ITaskItem {
  const now = Date.now()
  const createdAt = toTimestamp(rawTask.created_at, now)
  const updatedAt = toTimestamp(rawTask.updated_at, createdAt)
  const meta = parseMeta(rawTask)
  const reviewInfo = rawTask.review_info || meta?.review_info || null
  const completedAt = nullableTimestamp(rawTask.completed_at) || (rawTask.kanban_col === 'done' ? updatedAt : null)
  const parentId = rawTask.parent_id || rawTask.project || null

  return {
    id: String(rawTask.id || crypto.randomUUID()),
    title: normalizeTaskTitle(rawTask.title),
    period: ORDERED_PERIODS.includes(rawTask.period as TaskPeriod) ? rawTask.period as TaskPeriod : 'daily',
    kanban_col: ORDERED_COLUMNS.includes(rawTask.kanban_col as KanbanColumn) ? rawTask.kanban_col as KanbanColumn : 'todo',
    priority: ORDERED_PRIORITIES.includes(rawTask.priority as TaskPriority) ? rawTask.priority as TaskPriority : 'p2',
    creator_agent: rawTask.creator_agent || undefined,
    created_at: createdAt,
    updated_at: updatedAt,
    version: Number(rawTask.version) || 1,
    plan_date: nullableTimestamp(rawTask.plan_date),
    due_date: nullableTimestamp(rawTask.due_date),
    started_at: nullableTimestamp(rawTask.started_at),
    completed_at: completedAt,
    deleted_at: nullableTimestamp(rawTask.deleted_at),
    sort_order: Number.isFinite(Number(rawTask.sort_order)) ? Number(rawTask.sort_order) : updatedAt,
    planned_pomodoros: Number.isFinite(Number(rawTask.planned_pomodoros)) ? Number(rawTask.planned_pomodoros) : 0,
    actual_pomodoros: Number.isFinite(Number(rawTask.actual_pomodoros)) ? Number(rawTask.actual_pomodoros) : 0,
    planned_amount: Number.isFinite(Number(rawTask.planned_amount)) ? Number(rawTask.planned_amount) : 0,
    completed_amount: Number.isFinite(Number(rawTask.completed_amount)) ? Number(rawTask.completed_amount) : 0,
    unit: rawTask.unit || undefined,
    project: rawTask.project || parentId || undefined,
    parent_id: parentId || undefined,
    memo: rawTask.memo || '',
    tags: normalizeStringArray(rawTask.tags),
    is_review: Boolean(rawTask.is_review) && !reviewInfo?.completed,
    knowledge_tags: normalizeStringArray(rawTask.knowledge_tags || meta?.knowledge_tags),
    external_urls: normalizeStringArray(rawTask.external_urls || meta?.external_urls),
    review_info: reviewInfo ? {
      next_review_date: String(reviewInfo.next_review_date || ''),
      stage: Number(reviewInfo.stage) || 0,
      completed: Boolean(reviewInfo.completed)
    } : null,
    review_history: Array.isArray(rawTask.review_history) ? rawTask.review_history : [],
    is_focused: Boolean(rawTask.is_focused),
    ai_meta_json: typeof rawTask.ai_meta_json === 'string' ? rawTask.ai_meta_json : undefined,
    color: rawTask.color || undefined
  }
}

function cloneTasks(tasks: ITaskItem[]) {
  return tasks.map(task => ({ ...task }))
}

function dateKey(timestamp = Date.now()) {
  return new Date(timestamp).toISOString().split('T')[0]
}

function addDays(timestamp: number, days: number) {
  const d = new Date(timestamp)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

function isDueReviewTask(task: ITaskItem) {
  if (!task.is_review || !task.review_info || task.review_info.completed) return false
  if (!task.review_info.next_review_date) return true
  return task.review_info.next_review_date <= dateKey()
}

function randomTaskColor() {
  return TASK_THEME_COLORS[Math.floor(Math.random() * TASK_THEME_COLORS.length)]
}

function startOfTodayTimestamp(now = Date.now()) {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function endOfTodayTimestamp(now = Date.now()) {
  const date = new Date(now)
  date.setHours(23, 59, 59, 999)
  return date.getTime()
}

function startOfDayAtHour(timestamp: number, hour: number) {
  const date = new Date(timestamp)
  date.setHours(hour, 0, 0, 0)
  return date.getTime()
}

function localDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isAutoStartPeriod(period?: TaskPeriod | null) {
  return period === 'short_term' || period === 'long_term'
}

function normalizeDayStart(timestamp: number) {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function daysBetweenInclusive(start: number, end: number) {
  const result: number[] = []
  let cursor = normalizeDayStart(start)
  const endDay = normalizeDayStart(end)
  while (cursor <= endDay) {
    result.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return result
}

const priorityRank: Record<TaskPriority, number> = { p0: 0, p1: 1, p2: 2, p3: 3 }

function compareTasksByPriority(a: ITaskItem, b: ITaskItem) {
  return (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9)
    || (a.sort_order || 0) - (b.sort_order || 0)
    || (a.due_date || Number.MAX_SAFE_INTEGER) - (b.due_date || Number.MAX_SAFE_INTEGER)
    || (b.updated_at || 0) - (a.updated_at || 0)
    || (b.created_at || 0) - (a.created_at || 0)
}

const POMODORO_MINUTES = 30

function roundPomodoros(value: number) {
  return Math.round(Math.max(0, value) * 100) / 100
}

function pomodorosFromDuration(startedAt: number | null | undefined, endedAt: number) {
  if (!startedAt || startedAt >= endedAt) return 0
  return roundPomodoros((endedAt - startedAt) / (POMODORO_MINUTES * 60 * 1000))
}

function readAiMeta(task: Partial<ITaskItem>) {
  if (!task.ai_meta_json) return {}
  try {
    const parsed = JSON.parse(task.ai_meta_json)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeAiMeta(task: Partial<ITaskItem>, updates: Record<string, unknown>) {
  const nextMeta = { ...readAiMeta(task), ...updates }
  Object.keys(nextMeta).forEach(key => {
    if (nextMeta[key] === undefined || nextMeta[key] === null) delete nextMeta[key]
  })
  return Object.keys(nextMeta).length ? JSON.stringify(nextMeta) : undefined
}

function settleFocusSession(task: ITaskItem, endedAt: number) {
  const meta = readAiMeta(task)
  const focusStartedAt = typeof meta.focus_started_at === 'number' ? meta.focus_started_at : null
  const elapsedPomodoros = pomodorosFromDuration(focusStartedAt, endedAt)
  return {
    actual_pomodoros: roundPomodoros((task.actual_pomodoros || 0) + elapsedPomodoros),
    is_focused: false,
    ai_meta_json: writeAiMeta(task, { focus_started_at: null })
  }
}

export const useTaskStore = defineStore('taskStore', () => {
  const taskList = useStorage<ITaskItem[]>(STORAGE_KEYS.tasks, [])
  const inboxList = useStorage<InboxItem[]>(STORAGE_KEYS.inbox, [])
  const isHydrated = useStorage<boolean>(STORAGE_KEYS.hydrated, false)
  const isSyncing = useStorage<boolean>(STORAGE_KEYS.syncing, false)
  const currentView = useStorage<'today' | 'planning' | 'review'>('vcp_current_view', 'today')

  const rawNormalizedTaskList = computed(() => cloneTasks(taskList.value).map(normalizeTask).filter(task => !task.deleted_at))
  const normalizedTaskList = computed(() => {
    const tasks = rawNormalizedTaskList.value
    const childrenMap = new Map<string, ITaskItem[]>()

    tasks.forEach(task => {
      const parentId = task.parent_id || task.project
      if (!parentId) return
      const siblings = childrenMap.get(parentId) || []
      siblings.push(task)
      childrenMap.set(parentId, siblings)
    })

    const aggregateCache = new Map<string, { actualPomodoros: number, completedAmount: number, childrenCount: number }>()
    const visiting = new Set<string>()

    const aggregateFor = (task: ITaskItem) => {
      if (aggregateCache.has(task.id)) return aggregateCache.get(task.id)!
      if (visiting.has(task.id)) return { actualPomodoros: task.actual_pomodoros || 0, completedAmount: task.completed_amount || 0, childrenCount: 0 }

      visiting.add(task.id)
      const children = childrenMap.get(task.id) || []
      const hasChildren = children.length > 0
      const result = children.reduce((acc, child) => {
        const childAggregate = aggregateFor(child)
        acc.actualPomodoros += childAggregate.actualPomodoros
        acc.completedAmount += childAggregate.completedAmount
        acc.childrenCount += 1 + childAggregate.childrenCount
        return acc
      }, {
        actualPomodoros: hasChildren ? 0 : (task.actual_pomodoros || 0),
        completedAmount: hasChildren ? 0 : (task.completed_amount || 0),
        childrenCount: 0
      })

      visiting.delete(task.id)
      aggregateCache.set(task.id, result)
      return result
    }

    return tasks.map(task => {
      const aggregate = aggregateFor(task)
      const hasAggregatedMetrics = aggregate.childrenCount > 0 && (task.period === 'short_term' || task.period === 'long_term')
      return {
        ...task,
        effective_actual_pomodoros: hasAggregatedMetrics ? aggregate.actualPomodoros : (task.actual_pomodoros || 0),
        effective_completed_amount: hasAggregatedMetrics ? aggregate.completedAmount : (task.completed_amount || 0),
        aggregated_children_count: hasAggregatedMetrics ? aggregate.childrenCount : 0,
        has_aggregated_metrics: hasAggregatedMetrics
      }
    })
  })
  const deletedTasks = computed(() => cloneTasks(taskList.value).map(normalizeTask).filter(task => task.deleted_at))

  const todayTasks = computed(() => normalizedTaskList.value.filter(task => task.period === 'daily').sort(compareTasksByPriority))
  const shortTermTasks = computed(() => normalizedTaskList.value.filter(task => task.period === 'short_term').sort(compareTasksByPriority))
  const longTermTasks = computed(() => normalizedTaskList.value.filter(task => task.period === 'long_term').sort(compareTasksByPriority))
  const routineTasks = computed(() => normalizedTaskList.value
    .filter(task => task.period === 'routine' && task.kanban_col !== 'done' && !task.started_at && (!task.plan_date || task.plan_date <= endOfTodayTimestamp()))
    .sort(compareTasksByPriority))
  const reviewTasks = computed(() => normalizedTaskList.value.filter(task => task.is_review && !task.review_info?.completed))
  const todayReviewTasks = computed(() => reviewTasks.value.filter(task => isDueReviewTask(task)))
  const focusedTask = computed(() => normalizedTaskList.value.find(task => task.is_focused) || null)

  const tasksByColumn = computed<Record<KanbanColumn, ITaskItem[]>>(() => ({
    todo: todayTasks.value.filter(task => task.kanban_col === 'todo').sort(compareTasksByPriority),
    in_progress: todayTasks.value.filter(task => task.kanban_col === 'in_progress').sort(compareTasksByPriority),
    done: todayTasks.value.filter(task => task.kanban_col === 'done').sort(compareTasksByPriority)
  }))

  const tasksByPeriod = computed<Record<TaskPeriod, ITaskItem[]>>(() => ({
    daily: todayTasks.value,
    short_term: shortTermTasks.value,
    long_term: longTermTasks.value,
    routine: routineTasks.value
  }))

  const insights = computed(() => {
    const activeTasks = normalizedTaskList.value
    const doneTasks = activeTasks.filter(task => task.kanban_col === 'done')
    const actualPomodoros = activeTasks.reduce((sum, task) => sum + (task.actual_pomodoros || 0), 0)
    const completedDates = new Set(doneTasks.map(task => dateKey(task.completed_at || task.updated_at)))
    let streak = 0
    let cursor = Date.now()
    while (completedDates.has(dateKey(cursor))) {
      streak += 1
      cursor = addDays(cursor, -1)
    }
    return {
      total: activeTasks.length,
      done: doneTasks.length,
      completionRate: activeTasks.length ? Math.round((doneTasks.length / activeTasks.length) * 100) : 0,
      actualPomodoros,
      focusHours: Math.round((actualPomodoros * 25 / 60) * 10) / 10,
      streak
    }
  })

  const syncTaskToServer = useDebounceFn(async (task: ITaskItem) => {
    isSyncing.value = true
    try {
      await taskApi.upsertTask(normalizeTask(task))
    } catch (error) {
      console.error('[TaskOrbit] sync task failed:', error)
      ElMessage.error('任务同步失败，已保留本地数据')
    } finally {
      isSyncing.value = false
    }
  }, 600)

  async function syncToServerNow() {
    isSyncing.value = true
    try {
      await taskApi.batchUpdateTasks(normalizedTaskList.value)
    } catch (error) {
      console.error('[TaskOrbit] batch sync failed:', error)
      ElMessage.error('批量同步失败，已保留本地数据')
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  const syncToServer = useDebounceFn(syncToServerNow, 1000)

  async function hydrateFromServer(force = false) {
    if (isHydrated.value && !force) return
    const response = await taskApi.getTasks().catch(() => null)
    const payload = Array.isArray(response?.data) ? response.data : []
    taskList.value = payload.map(item => normalizeTask(item))
    isHydrated.value = true
  }

  function clearLocalCache() {
    taskList.value = []
    inboxList.value = []
    isHydrated.value = false
    isSyncing.value = false
  }

  async function createBackup(reason = 'frontend') {
    return taskApi.createBackup(reason)
  }

  function replaceTaskList(nextTasks: ITaskItem[]) {
    taskList.value = nextTasks.map(task => normalizeTask(task))
  }

  function createTask(payload: Partial<ITaskItem>) {
    const now = Date.now()
    const period = payload.period || 'daily'
    const planDate = Object.prototype.hasOwnProperty.call(payload, 'plan_date') ? payload.plan_date : null
    const shouldUsePlanStart = isAutoStartPeriod(period) && planDate && !payload.started_at
    const newTask = normalizeTask({
      ...payload,
      id: payload.id || crypto.randomUUID(),
      color: payload.color || randomTaskColor(),
      kanban_col: payload.kanban_col || 'todo',
      period,
      priority: payload.priority || 'p2',
      started_at: shouldUsePlanStart ? startOfDayAtHour(Number(planDate), 6) : payload.started_at,
      sort_order: payload.sort_order || now,
      created_at: now,
      updated_at: now,
      is_focused: false
    })
    replaceTaskList([newTask, ...normalizedTaskList.value])
    syncTaskToServer(newTask)
    if (newTask.period === 'routine') ensureRoutineInstances(newTask)
    return newTask
  }

  function updateTask(taskId: string, updates: Partial<ITaskItem>) {
    const now = Date.now()
    let changedTask: ITaskItem | null = null
    replaceTaskList(
      normalizedTaskList.value.map(task => {
        if (task.id !== taskId) return task
        const nextCol = updates.kanban_col || task.kanban_col
        const isCompleted = nextCol === 'done'
        const nextPlannedPomodoros = Object.prototype.hasOwnProperty.call(updates, 'planned_pomodoros')
          ? updates.planned_pomodoros
          : task.planned_pomodoros
        const nextPlannedAmount = Object.prototype.hasOwnProperty.call(updates, 'planned_amount')
          ? updates.planned_amount
          : task.planned_amount
        const nextCompletedAt = Object.prototype.hasOwnProperty.call(updates, 'completed_at')
          ? updates.completed_at
          : isCompleted
            ? (task.completed_at || now)
            : null
        const enteringInProgress = task.kanban_col !== 'in_progress' && nextCol === 'in_progress'
        const leavingInProgress = task.kanban_col === 'in_progress' && nextCol !== 'in_progress'
        const shouldSettleFocus = task.is_focused && (isCompleted || leavingInProgress || updates.is_focused === false)
        const settledFocus = shouldSettleFocus ? settleFocusSession(task, now) : null
        const todayTimestamp = startOfTodayTimestamp(now)
        const explicitStartedAt = Object.prototype.hasOwnProperty.call(updates, 'started_at')
        let nextStartedAt = explicitStartedAt
          ? updates.started_at
          : task.started_at
        const nextPlanDate = Object.prototype.hasOwnProperty.call(updates, 'plan_date')
          ? updates.plan_date
          : enteringInProgress
            ? todayTimestamp
            : task.plan_date
        const nextDueDate = Object.prototype.hasOwnProperty.call(updates, 'due_date')
          ? updates.due_date
          : enteringInProgress
            ? todayTimestamp
            : task.due_date
        if (!explicitStartedAt && isAutoStartPeriod(updates.period || task.period) && nextPlanDate && !nextStartedAt) {
          nextStartedAt = startOfDayAtHour(Number(nextPlanDate), 6)
        }
        changedTask = normalizeTask({
          ...task,
          ...updates,
          ...settledFocus,
          plan_date: nextPlanDate,
          due_date: nextDueDate,
          started_at: nextStartedAt,
          completed_at: nextCompletedAt,
          actual_pomodoros: Object.prototype.hasOwnProperty.call(updates, 'actual_pomodoros')
            ? updates.actual_pomodoros
            : settledFocus
              ? settledFocus.actual_pomodoros
              : isCompleted
                ? roundPomodoros(task.actual_pomodoros || nextPlannedPomodoros || 0)
                : task.actual_pomodoros,
          completed_amount: Object.prototype.hasOwnProperty.call(updates, 'completed_amount')
            ? updates.completed_amount
            : isCompleted
              ? (Number(nextPlannedAmount) || 0)
              : task.completed_amount,
          updated_at: now,
          version: (task.version || 1) + 1
        })
        return changedTask
      })
    )
    if (changedTask) {
      syncTaskToServer(changedTask)
      if (changedTask.period === 'routine') ensureRoutineInstances(changedTask)
    }
  }

  function removeTask(taskId: string) {
    updateTask(taskId, { deleted_at: Date.now(), is_focused: false })
  }

  function restoreTask(taskId: string) {
    const task = deletedTasks.value.find(item => item.id === taskId)
    if (!task) return
    const restored = normalizeTask({ ...task, deleted_at: null, updated_at: Date.now() })
    taskList.value = [restored, ...normalizedTaskList.value]
    syncTaskToServer(restored)
  }

  function moveTaskColumn(taskId: string, newCol: KanbanColumn) {
    updateTask(taskId, { kanban_col: newCol, period: 'daily' })
  }

  function setColumnTasks(column: KanbanColumn, nextTasks: ITaskItem[]) {
    const now = Date.now()
    const previousTaskMap = new Map(normalizedTaskList.value.map(task => [task.id, task]))
    const normalizedColumnTasks = nextTasks.map((task, index) => {
      const previousTask = previousTaskMap.get(task.id)
      const enteringInProgress = previousTask?.kanban_col !== 'in_progress' && column === 'in_progress'
      const todayTimestamp = startOfTodayTimestamp(now)
      const leavingInProgress = previousTask?.kanban_col === 'in_progress' && column !== 'in_progress'
      const settledFocus = previousTask?.is_focused && leavingInProgress ? settleFocusSession(previousTask, now) : null
      const isCompleted = column === 'done'
      const startedAt = task.started_at || previousTask?.started_at
      const plannedPomodoros = task.planned_pomodoros ?? previousTask?.planned_pomodoros ?? 0
      const plannedAmount = task.planned_amount ?? previousTask?.planned_amount ?? 0

      return normalizeTask({
        ...task,
        ...settledFocus,
        kanban_col: column,
        period: 'daily',
        plan_date: enteringInProgress ? todayTimestamp : task.plan_date,
        due_date: enteringInProgress ? todayTimestamp : task.due_date,
        started_at: startedAt,
        completed_at: isCompleted ? (task.completed_at || previousTask?.completed_at || now) : null,
        actual_pomodoros: isCompleted ? roundPomodoros(task.actual_pomodoros || plannedPomodoros || 0) : task.actual_pomodoros,
        completed_amount: isCompleted ? (Number(plannedAmount) || 0) : task.completed_amount,
        sort_order: now + index,
        updated_at: now
      })
    })
    const changedIds = new Set(normalizedColumnTasks.map(task => task.id))
    const remainingTasks = normalizedTaskList.value.filter(task => !changedIds.has(task.id))
    replaceTaskList([...remainingTasks, ...normalizedColumnTasks])
    normalizedColumnTasks.forEach(task => syncTaskToServer(task))
  }

  function setFocusedTask(taskId: string | null) {
    const now = Date.now()
    const changedTasks: ITaskItem[] = []
    const nextTasks = normalizedTaskList.value.map(task => {
      const shouldFocus = Boolean(taskId && task.id === taskId && task.kanban_col === 'in_progress')
      const shouldSettle = task.is_focused && !shouldFocus
      const settledFocus = shouldSettle ? settleFocusSession(task, now) : null
      const nextTask = normalizeTask({
        ...task,
        ...settledFocus,
        is_focused: shouldFocus,
        started_at: shouldFocus ? (task.started_at || now) : task.started_at,
        ai_meta_json: shouldFocus
          ? writeAiMeta(task, { focus_started_at: now })
          : settledFocus?.ai_meta_json ?? task.ai_meta_json,
        updated_at: now
      })

      if (task.is_focused !== nextTask.is_focused || task.id === taskId || shouldSettle) {
        changedTasks.push(nextTask)
      }
      return nextTask
    })
    replaceTaskList(nextTasks)
    changedTasks.forEach(task => syncTaskToServer(task))
  }

  function moveTaskToPeriod(taskId: string, period: TaskPeriod) {
    updateTask(taskId, { period, kanban_col: 'todo' })
  }

  function ensureRoutineInstances(templateTask: ITaskItem) {
    if (templateTask.period !== 'routine' || !templateTask.plan_date || !templateTask.due_date) return
    const now = Date.now()
    const meta = readAiMeta(templateTask)
    const templateId = String(meta.routine_template_id || templateTask.id)
    const existingKeys = new Set(normalizedTaskList.value
      .filter(task => task.period === 'routine')
      .map(task => {
        const taskMeta = readAiMeta(task)
        return taskMeta.routine_template_id === templateId && taskMeta.routine_date_key ? String(taskMeta.routine_date_key) : ''
      })
      .filter(Boolean))
    const baseDateKey = localDateKey(templateTask.plan_date)
    const baseTaskNeedsMeta = meta.routine_template_id !== templateId || meta.routine_date_key !== baseDateKey || !meta.routine_instance
    const generatedTasks: ITaskItem[] = daysBetweenInclusive(templateTask.plan_date, templateTask.due_date)
      .filter(day => !existingKeys.has(localDateKey(day)) && localDateKey(day) !== baseDateKey)
      .map((day, index) => normalizeTask({
        ...templateTask,
        id: crypto.randomUUID(),
        kanban_col: 'todo',
        started_at: null,
        completed_at: null,
        plan_date: day,
        due_date: day,
        actual_pomodoros: 0,
        completed_amount: 0,
        sort_order: (templateTask.sort_order || now) + index + 1,
        created_at: now,
        updated_at: now,
        version: 1,
        ai_meta_json: writeAiMeta(templateTask, {
          routine_template_id: templateId,
          routine_date_key: localDateKey(day),
          routine_instance: true
        })
      }))

    if (!baseTaskNeedsMeta && generatedTasks.length === 0) return

    const nextTasks = normalizedTaskList.value.map(task => task.id === templateTask.id
      ? normalizeTask({
        ...task,
        ai_meta_json: writeAiMeta(task, {
          routine_template_id: templateId,
          routine_date_key: baseDateKey,
          routine_instance: true
        }),
        updated_at: baseTaskNeedsMeta ? now : task.updated_at
      })
      : task)
    const changedBase = nextTasks.find(task => task.id === templateTask.id)
    replaceTaskList([...generatedTasks, ...nextTasks])
    if (baseTaskNeedsMeta && changedBase) syncTaskToServer(changedBase)
    generatedTasks.forEach(task => syncTaskToServer(task))
  }

  function checkInRoutineTask(taskId: string) {
    const task = normalizedTaskList.value.find(item => item.id === taskId)
    if (!task || task.period !== 'routine') return
    const now = Date.now()
    updateTask(taskId, {
      kanban_col: 'done',
      started_at: now,
      completed_at: now,
      actual_pomodoros: task.actual_pomodoros && task.actual_pomodoros > 0 ? task.actual_pomodoros : (task.planned_pomodoros || 1),
      completed_amount: task.completed_amount && task.completed_amount > 0 ? task.completed_amount : (task.planned_amount || 1)
    })
  }

  function addInboxItem(content: string) {
    const trimmed = content.trim()
    if (!trimmed) return
    inboxList.value = [
      { id: crypto.randomUUID(), content: trimmed, created_at: Date.now() },
      ...inboxList.value
    ]
  }

  function removeInboxItem(inboxId: string) {
    inboxList.value = inboxList.value.filter(item => item.id !== inboxId)
  }

  function promoteInboxToTask(inboxId: string) {
    const index = inboxList.value.findIndex(item => item.id === inboxId)
    if (index === -1) return null
    const item = inboxList.value[index]
    inboxList.value.splice(index, 1)
    return createTask({ title: item.content, period: 'daily', kanban_col: 'todo', is_focused: false })
  }

  async function markReviewTask(taskId: string, isRemembered: boolean) {
    const task = normalizedTaskList.value.find(item => item.id === taskId)
    if (!task) return

    const currentStage = task.review_info?.stage || 0
    const nextStage = isRemembered ? currentStage + 1 : 0
    const completed = false
    const interval = REVIEW_INTERVALS[nextStage] || LONG_TERM_REVIEW_INTERVAL
    const nextReviewDate = dateKey(addDays(Date.now(), interval))
    const historyItem: ReviewHistoryItem = {
      reviewed_at: Date.now(),
      remembered: isRemembered,
      stage_before: currentStage,
      stage_after: nextStage,
      next_review_date: nextReviewDate
    }

    updateTask(taskId, {
      is_review: true,
      review_info: { next_review_date: nextReviewDate, stage: nextStage, completed },
      review_history: [...(task.review_history || []), historyItem]
    })
  }

  return {
    taskList, inboxList, isHydrated, isSyncing, currentView,
    normalizedTaskList, deletedTasks, todayTasks, shortTermTasks, longTermTasks, routineTasks, reviewTasks, todayReviewTasks, focusedTask, tasksByColumn, tasksByPeriod, insights,
    hydrateFromServer, clearLocalCache, createBackup, createTask, updateTask, removeTask, restoreTask, moveTaskColumn, setColumnTasks, setFocusedTask, moveTaskToPeriod, ensureRoutineInstances, checkInRoutineTask, addInboxItem, removeInboxItem, promoteInboxToTask, markReviewTask, syncToServer, syncToServerNow
  }
})
