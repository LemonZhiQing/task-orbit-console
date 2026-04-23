import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useStorage, useDebounceFn } from '@vueuse/core'
import { taskApi } from '@/api/task'
import type { InboxItem, ITaskItem, KanbanColumn, TaskPeriod } from '@/types/task'

type Task = ITaskItem

const ORDERED_COLUMNS: KanbanColumn[] = ['todo', 'in_progress', 'done']
const ORDERED_PERIODS: TaskPeriod[] = ['daily', 'short_term', 'long_term', 'routine']

function normalizeTask(rawTask: Partial<Task> & Record<string, any>): Task {
    return {
        id: String(rawTask.id || crypto.randomUUID()),
        title: String(rawTask.title || '未命名任务'),
        period: ORDERED_PERIODS.includes(rawTask.period) ? rawTask.period : 'daily',
        kanban_col: ORDERED_COLUMNS.includes(rawTask.kanban_col) ? rawTask.kanban_col : 'todo',
        is_focused: Boolean(rawTask.is_focused),
        ai_meta_json: typeof rawTask.ai_meta_json === 'string' ? rawTask.ai_meta_json : undefined
    }
}

function cloneTasks(tasks: Task[]) {
    return tasks.map(task => ({ ...task }))
}

function isReviewTask(task: Task) {
    if (!task.ai_meta_json) return false

    try {
        const meta = JSON.parse(task.ai_meta_json)
        return Boolean(meta?.review_info?.is_reviewable)
    } catch {
        return false
    }
}

export const useTaskStore = defineStore('task', () => {
    const tasks = useStorage<Task[]>('vcp-tasks', [])
    const inbox = useStorage<InboxItem[]>('vcp-inbox', [])
    const isHydrated = useStorage<boolean>('vcp-task-hydrated', false)
    const isSyncing = useStorage<boolean>('vcp-task-syncing', false)
    const activePeriod = useStorage<TaskPeriod>('vcp-task-active-period', 'daily')

    const orderedTasks = computed(() =>
        cloneTasks(tasks.value)
            .map(normalizeTask)
            .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    )

    const todayBoardTasks = computed(() =>
        orderedTasks.value.filter(task => task.period === 'daily')
    )

    const planningTasks = computed(() =>
        orderedTasks.value.filter(task => task.period !== 'daily')
    )

    const reviewTasks = computed(() =>
        orderedTasks.value.filter(task => isReviewTask(task))
    )

    const focusedTask = computed(() =>
        orderedTasks.value.find(task => task.is_focused) || null
    )

    const tasksByColumn = computed(() => {
        return ORDERED_COLUMNS.reduce((acc, column) => {
            acc[column] = todayBoardTasks.value.filter(task => (task.kanban_col || 'todo') === column)
            return acc
        }, /** @type {Record<KanbanColumn, Task[]>} */({ todo: [], in_progress: [], done: [] }))
    })

    const tasksByPeriod = computed(() => {
        return ORDERED_PERIODS.reduce((acc, period) => {
            acc[period] = orderedTasks.value.filter(task => task.period === period)
            return acc
        }, /** @type {Record<TaskPeriod, Task[]>} */({ daily: [], short_term: [], long_term: [], routine: [] }))
    })

    const syncToServer = useDebounceFn(async () => {
        isSyncing.value = true
        try {
            await taskApi.batchUpdateTasks(cloneTasks(tasks.value).map(normalizeTask))
        } finally {
            isSyncing.value = false
        }
    }, 1000)

    async function hydrateFromServer(force = false) {
        if (isHydrated.value && !force) return
        const response = await taskApi.getTasks()
        tasks.value = Array.isArray(response.data) ? response.data.map(normalizeTask) : []
        isHydrated.value = true
    }

    function setColumnTasks(column: KanbanColumn, nextTasks: Task[]) {
        const normalized = nextTasks.map(task => normalizeTask({ ...task, kanban_col: column, period: 'daily' }))
        const remaining = orderedTasks.value.filter(task => task.period !== 'daily' || task.kanban_col !== column)
        tasks.value = [...remaining, ...normalized]
        syncToServer()
    }

    function updateTaskStatus(id: string, newCol: KanbanColumn) {
        const index = tasks.value.findIndex(task => task.id === id)
        if (index === -1) return
        tasks.value[index] = normalizeTask({ ...tasks.value[index], kanban_col: newCol, period: 'daily' })
        syncToServer()
    }

    function createTask(payload: Partial<Task>) {
        const newTask = normalizeTask({
            ...payload,
            id: payload.id || crypto.randomUUID(),
            period: payload.period || activePeriod.value,
            kanban_col: payload.kanban_col || 'todo'
        })
        tasks.value = [newTask, ...orderedTasks.value]
        syncToServer()
        return newTask
    }

    function updateTask(id: string, updates: Partial<Task>) {
        const index = tasks.value.findIndex(task => task.id === id)
        if (index === -1) return
        tasks.value[index] = normalizeTask({ ...tasks.value[index], ...updates })
        syncToServer()
    }

    function removeTask(id: string) {
        tasks.value = tasks.value.filter(task => task.id !== id)
        syncToServer()
    }

    function setFocusedTask(id: string | null) {
        tasks.value = tasks.value.map(task => normalizeTask({ ...task, is_focused: id ? task.id === id : false }))
        syncToServer()
    }

    function addInboxItem(content: string) {
        if (!content.trim()) return
        inbox.value = [
            {
                id: crypto.randomUUID(),
                content: content.trim(),
                created_at: Date.now()
            },
            ...inbox.value
        ]
    }

    function removeInboxItem(id: string) {
        inbox.value = inbox.value.filter(item => item.id !== id)
    }

    function convertInboxToTask(itemId: string, period: TaskPeriod = 'daily') {
        const item = inbox.value.find(entry => entry.id === itemId)
        if (!item) return null
        const task = createTask({ title: item.content, period })
        removeInboxItem(itemId)
        return task
    }

    return {
        tasks,
        inbox,
        isSyncing,
        activePeriod,
        orderedTasks,
        todayBoardTasks,
        planningTasks,
        reviewTasks,
        focusedTask,
        tasksByColumn,
        tasksByPeriod,
        hydrateFromServer,
        setColumnTasks,
        updateTaskStatus,
        createTask,
        updateTask,
        removeTask,
        setFocusedTask,
        addInboxItem,
        removeInboxItem,
        convertInboxToTask,
        syncToServer
    }
})
