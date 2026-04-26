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
const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30]

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
    title: String(rawTask.title ?? '未命名任务'),
    period: ORDERED_PERIODS.includes(rawTask.period as TaskPeriod) ? rawTask.period as TaskPeriod : 'daily',
    kanban_col: ORDERED_COLUMNS.includes(rawTask.kanban_col as KanbanColumn) ? rawTask.kanban_col as KanbanColumn : 'todo',
    priority: ORDERED_PRIORITIES.includes(rawTask.priority as TaskPriority) ? rawTask.priority as TaskPriority : 'p2',
    creator_agent: rawTask.creator_agent || undefined,
    created_at: createdAt,
    updated_at: updatedAt,
    version: Number(rawTask.version) || 1,
    plan_date: nullableTimestamp(rawTask.plan_date),
    due_date: nullableTimestamp(rawTask.due_date),
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

export const useTaskStore = defineStore('taskStore', () => {
  const taskList = useStorage<ITaskItem[]>(STORAGE_KEYS.tasks, [])
  const inboxList = useStorage<InboxItem[]>(STORAGE_KEYS.inbox, [])
  const isHydrated = useStorage<boolean>(STORAGE_KEYS.hydrated, false)
  const isSyncing = useStorage<boolean>(STORAGE_KEYS.syncing, false)
  const currentView = useStorage<'today' | 'planning' | 'review'>('vcp_current_view', 'today')

  const normalizedTaskList = computed(() => cloneTasks(taskList.value).map(normalizeTask).filter(task => !task.deleted_at))
  const deletedTasks = computed(() => cloneTasks(taskList.value).map(normalizeTask).filter(task => task.deleted_at))

  const todayTasks = computed(() => normalizedTaskList.value.filter(task => task.period === 'daily'))
  const shortTermTasks = computed(() => normalizedTaskList.value.filter(task => task.period === 'short_term'))
  const longTermTasks = computed(() => normalizedTaskList.value.filter(task => task.period === 'long_term'))
  const routineTasks = computed(() => normalizedTaskList.value.filter(task => task.period === 'routine'))
  const reviewTasks = computed(() => normalizedTaskList.value.filter(task => task.is_review && !task.review_info?.completed))
  const todayReviewTasks = computed(() => reviewTasks.value.filter(task => isDueReviewTask(task)))
  const focusedTask = computed(() => normalizedTaskList.value.find(task => task.is_focused) || null)

  const tasksByColumn = computed<Record<KanbanColumn, ITaskItem[]>>(() => ({
    todo: todayTasks.value.filter(task => task.kanban_col === 'todo').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    in_progress: todayTasks.value.filter(task => task.kanban_col === 'in_progress').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    done: todayTasks.value.filter(task => task.kanban_col === 'done').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
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

  const syncToServer = useDebounceFn(async () => {
    isSyncing.value = true
    try {
      await taskApi.batchUpdateTasks(normalizedTaskList.value)
    } catch (error) {
      console.error('[TaskOrbit] batch sync failed:', error)
      ElMessage.error('批量同步失败，已保留本地数据')
    } finally {
      isSyncing.value = false
    }
  }, 1000)

  async function hydrateFromServer(force = false) {
    if (isHydrated.value && !force) return
    const response = await taskApi.getTasks().catch(() => null)
    const payload = Array.isArray(response?.data) ? response.data : []
    taskList.value = payload.map(item => normalizeTask(item))
    isHydrated.value = true
  }

  async function createBackup(reason = 'frontend') {
    return taskApi.createBackup(reason)
  }

  function replaceTaskList(nextTasks: ITaskItem[]) {
    taskList.value = nextTasks.map(task => normalizeTask(task))
  }

  function createTask(payload: Partial<ITaskItem>) {
    const now = Date.now()
    const newTask = normalizeTask({
      ...payload,
      id: payload.id || crypto.randomUUID(),
      kanban_col: payload.kanban_col || 'todo',
      period: payload.period || 'daily',
      priority: payload.priority || 'p2',
      sort_order: payload.sort_order || now,
      created_at: now,
      updated_at: now,
      is_focused: false
    })
    replaceTaskList([newTask, ...normalizedTaskList.value])
    syncTaskToServer(newTask)
    return newTask
  }

  function updateTask(taskId: string, updates: Partial<ITaskItem>) {
    const now = Date.now()
    let changedTask: ITaskItem | null = null
    replaceTaskList(
      normalizedTaskList.value.map(task => {
        if (task.id !== taskId) return task
        const nextCol = updates.kanban_col || task.kanban_col
        changedTask = normalizeTask({
          ...task,
          ...updates,
          completed_at: Object.prototype.hasOwnProperty.call(updates, 'completed_at')
            ? updates.completed_at
            : nextCol === 'done'
              ? (task.completed_at || now)
              : null,
          updated_at: now,
          version: (task.version || 1) + 1
        })
        return changedTask
      })
    )
    if (changedTask) syncTaskToServer(changedTask)
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
    const normalizedColumnTasks = nextTasks.map((task, index) =>
      normalizeTask({ ...task, kanban_col: column, period: 'daily', sort_order: now + index, updated_at: now })
    )
    const changedIds = new Set(normalizedColumnTasks.map(task => task.id))
    const remainingTasks = normalizedTaskList.value.filter(task => !changedIds.has(task.id))
    replaceTaskList([...remainingTasks, ...normalizedColumnTasks])
    normalizedColumnTasks.forEach(task => syncTaskToServer(task))
  }

  function setFocusedTask(taskId: string | null) {
    const now = Date.now()
    const nextTasks = normalizedTaskList.value.map(task => normalizeTask({
      ...task,
      is_focused: taskId ? task.id === taskId : false,
      updated_at: Date.now()
    }))
    replaceTaskList(nextTasks)
    nextTasks.filter(task => task.is_focused || task.updated_at === now).forEach(task => syncTaskToServer(task))
  }

  function moveTaskToPeriod(taskId: string, period: TaskPeriod) {
    updateTask(taskId, { period, kanban_col: 'todo' })
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
    const nextStage = isRemembered ? Math.min(currentStage + 1, REVIEW_INTERVALS.length) : 0
    const completed = isRemembered && nextStage >= REVIEW_INTERVALS.length
    const interval = completed ? 0 : REVIEW_INTERVALS[nextStage] || REVIEW_INTERVALS[0]
    const nextReviewDate = completed ? '' : dateKey(addDays(Date.now(), interval))
    const historyItem: ReviewHistoryItem = {
      reviewed_at: Date.now(),
      remembered: isRemembered,
      stage_before: currentStage,
      stage_after: nextStage,
      next_review_date: nextReviewDate
    }

    updateTask(taskId, {
      is_review: !completed,
      review_info: { next_review_date: nextReviewDate, stage: nextStage, completed },
      review_history: [...(task.review_history || []), historyItem]
    })
  }

  return {
    taskList, inboxList, isHydrated, isSyncing, currentView,
    normalizedTaskList, deletedTasks, todayTasks, shortTermTasks, longTermTasks, routineTasks, reviewTasks, todayReviewTasks, focusedTask, tasksByColumn, tasksByPeriod, insights,
    hydrateFromServer, createBackup, createTask, updateTask, removeTask, restoreTask, moveTaskColumn, setColumnTasks, setFocusedTask, moveTaskToPeriod, addInboxItem, removeInboxItem, promoteInboxToTask, markReviewTask, syncToServer
  }
})
