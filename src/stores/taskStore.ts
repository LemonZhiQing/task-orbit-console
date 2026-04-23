import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useDebounceFn, useStorage } from '@vueuse/core'
import { taskApi } from '@/api/task'
import type { ITaskItem, InboxItem, KanbanColumn, TaskPeriod, TaskPriority } from '@/types/task'

const STORAGE_KEYS = {
  tasks: 'vcp_tasks',
  inbox: 'vcp_inbox',
  hydrated: 'vcp_tasks_hydrated',
  syncing: 'vcp_tasks_syncing'
} as const

const ORDERED_COLUMNS: KanbanColumn[] = ['todo', 'in_progress', 'done']
const ORDERED_PERIODS: TaskPeriod[] = ['daily', 'short_term', 'long_term', 'routine']
const ORDERED_PRIORITIES: TaskPriority[] = ['p0', 'p1', 'p2', 'p3']

function normalizeTask(rawTask: Partial<ITaskItem> & Record<string, any>): ITaskItem {
  return {
    id: String(rawTask.id || crypto.randomUUID()),
    title: String(rawTask.title || '未命名任务'),
    period: ORDERED_PERIODS.includes(rawTask.period as any) ? rawTask.period as TaskPeriod : 'daily',
    kanban_col: ORDERED_COLUMNS.includes(rawTask.kanban_col as any) ? rawTask.kanban_col as KanbanColumn : 'todo',
    priority: ORDERED_PRIORITIES.includes(rawTask.priority as any) ? rawTask.priority as TaskPriority : 'p2',
    
    creator_agent: rawTask.creator_agent || undefined,
    created_at: Number(rawTask.created_at) || Date.now(),
    updated_at: Number(rawTask.updated_at) || Date.now(),
    
    plan_date: rawTask.plan_date,
    due_date: rawTask.due_date,
    planned_pomodoros: Number(rawTask.planned_pomodoros) || 0,
    actual_pomodoros: Number(rawTask.actual_pomodoros) || 0,
    planned_amount: rawTask.planned_amount ? Number(rawTask.planned_amount) : undefined,
    completed_amount: rawTask.completed_amount ? Number(rawTask.completed_amount) : undefined,
    unit: rawTask.unit || undefined,
    project: rawTask.project || undefined,
    
    memo: rawTask.memo || '',
    tags: Array.isArray(rawTask.tags) ? rawTask.tags : [],
    
    is_review: Boolean(rawTask.is_review),
    knowledge_tags: Array.isArray(rawTask.knowledge_tags) ? rawTask.knowledge_tags : [],
    external_urls: Array.isArray(rawTask.external_urls) ? rawTask.external_urls : [],
    review_info: rawTask.review_info || undefined,

    is_focused: Boolean(rawTask.is_focused),
    
    ai_meta_json: typeof rawTask.ai_meta_json === 'string' 
      ? rawTask.ai_meta_json 
      : typeof rawTask.ai_meta === 'string' ? rawTask.ai_meta : rawTask.ai_meta ? JSON.stringify(rawTask.ai_meta) : undefined
  }
}

function cloneTasks(tasks: ITaskItem[]) {
  return tasks.map(task => ({ ...task }))
}

function parseMeta(task: ITaskItem) {
  if (!task.ai_meta_json) return null
  try { return JSON.parse(task.ai_meta_json) } catch { return null }
}

function isReviewTask(task: ITaskItem) {
  if (task.is_review) return true
  const meta = parseMeta(task)
  return Boolean(meta?.review_info?.is_reviewable)
}

// ✨ 100条高质量测试数据生成器
function generateMockTasks(): ITaskItem[] {
  const tasks: any[] = [];
  const now = Date.now();
  const dayMs = 86400000;
  
  const periods = ['daily', 'daily', 'daily', 'short_term', 'long_term', 'routine'];
  const columns = ['todo', 'todo', 'in_progress', 'done'];
  const priorities = ['p0', 'p1', 'p2', 'p2', 'p3'];
  const agents = ['晴天', '小娜', '小克', '麻衣', '系统引擎', undefined, undefined];
  const units = ['页', '行', '个', '番茄', '字', 'API'];
  
  const subjects = ['Vue3响应式', 'React Hooks', 'Node.js流', 'Python爬虫', 'Go并发', 'AI模型微调', 'UI/UX规范', '数据库索引', '算法题', 'VCP核心架构'];
  const actions = ['深度学习', '代码重构', '定期复习', '单元测试', '容器化部署', '性能优化', '蓝图设计', '市场调研', 'Bug修复', '文档撰写'];
  
  for (let i = 1; i <= 100; i++) {
    const period = periods[Math.floor(Math.random() * periods.length)];
    const kanban_col = columns[Math.floor(Math.random() * columns.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const is_review = Math.random() > 0.6; // 40% 概率开启复习
    const agent = agents[Math.floor(Math.random() * agents.length)];
    
    const subj = subjects[Math.floor(Math.random() * subjects.length)];
    const act = actions[Math.floor(Math.random() * actions.length)];
    const title = `[测试集 ${String(i).padStart(3, '0')}] ${act}：${subj} 相关模块`;
    
    const planned_pomodoros = Math.floor(Math.random() * 5) + 1;
    const actual_pomodoros = kanban_col === 'done' ? planned_pomodoros : Math.floor(Math.random() * planned_pomodoros);
    
    const hasAmount = Math.random() > 0.7;
    const planned_amount = hasAmount ? Math.floor(Math.random() * 100) + 10 : undefined;
    const completed_amount = planned_amount ? (kanban_col === 'done' ? planned_amount : Math.floor(Math.random() * planned_amount)) : undefined;
    const unit = planned_amount ? units[Math.floor(Math.random() * units.length)] : undefined;
    
    const plan_date = now + (Math.floor(Math.random() * 14) - 7) * dayMs;
    const due_date = plan_date + (Math.floor(Math.random() * 7) + 1) * dayMs;
    
    const memo = Math.random() > 0.4 ? `### 任务执行指南 🎯\n\n这是系统为您自动生成的测试数据，旨在验证 **全属性详情抽屉** 的抗压能力。\n\n**核心难点分析**：\n- 1. 处理 \`${subj}\` 的边界情况\n- 2. 保证 \`${act}\` 过程的内存稳定性\n\n> 💡 提示：本任务的优先级被设定为 ${priority.toUpperCase()}，请关注卡片左侧的颜色彩带。` : '';
    const tags = [subj.split(' ')[0], act.slice(0,2), `T${i}`];
    
    tasks.push({
      id: crypto.randomUUID(),
      title,
      period,
      kanban_col,
      priority,
      creator_agent: agent,
      created_at: now - Math.floor(Math.random() * 10) * dayMs,
      updated_at: now,
      plan_date: Math.random() > 0.3 ? plan_date : undefined,
      due_date: Math.random() > 0.3 ? due_date : undefined,
      planned_pomodoros,
      actual_pomodoros,
      planned_amount,
      completed_amount,
      unit,
      memo,
      tags,
      is_review,
      knowledge_tags: is_review ? [subj, '核心机制', '面试必考'] : [],
      external_urls: is_review ? [`https://github.com/search?q=${encodeURIComponent(subj)}`, `vcp-diary://[知识库]2026-04-22`] : [],
      review_info: is_review ? {
        next_review_date: new Date(now + Math.floor(Math.random() * 5) * dayMs).toISOString().split('T')[0],
        stage: Math.floor(Math.random() * 3)
      } : undefined,
      is_focused: false
    });
  }
  return tasks;
}

export const useTaskStore = defineStore('taskStore', () => {
  const taskList = useStorage<ITaskItem[]>(STORAGE_KEYS.tasks, [])
  const inboxList = useStorage<InboxItem[]>(STORAGE_KEYS.inbox, [])
  const isHydrated = useStorage<boolean>(STORAGE_KEYS.hydrated, false)
  const isSyncing = useStorage<boolean>(STORAGE_KEYS.syncing, false)
  const currentView = useStorage<'today' | 'planning' | 'review'>('vcp_current_view', 'today')

  const normalizedTaskList = computed(() => cloneTasks(taskList.value).map(normalizeTask))

  const todayTasks = computed(() => normalizedTaskList.value.filter(task => task.period === 'daily'))
  const shortTermTasks = computed(() => normalizedTaskList.value.filter(task => task.period === 'short_term'))
  const longTermTasks = computed(() => normalizedTaskList.value.filter(task => task.period === 'long_term'))
  const routineTasks = computed(() => normalizedTaskList.value.filter(task => task.period === 'routine'))
  const reviewTasks = computed(() => normalizedTaskList.value.filter(task => isReviewTask(task)))
  
  const todayReviewTasks = computed(() => reviewTasks.value)
  const focusedTask = computed(() => normalizedTaskList.value.find(task => task.is_focused) || null)

  const tasksByColumn = computed<Record<KanbanColumn, ITaskItem[]>>(() => ({
    todo: todayTasks.value.filter(task => task.kanban_col === 'todo'),
    in_progress: todayTasks.value.filter(task => task.kanban_col === 'in_progress'),
    done: todayTasks.value.filter(task => task.kanban_col === 'done')
  }))

  const tasksByPeriod = computed<Record<TaskPeriod, ITaskItem[]>>(() => ({
    daily: todayTasks.value,
    short_term: shortTermTasks.value,
    long_term: longTermTasks.value,
    routine: routineTasks.value
  }))

  const syncToServer = useDebounceFn(async () => {
    isSyncing.value = true
    try {
      await taskApi.batchUpdateTasks(normalizedTaskList.value)
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

  // 🚀 暴露一个生成 100 条 Mock 数据的能力，会清空旧数据并重新填充
  function forceInjectMockData() {
    console.log('🚀 [TaskOrbit] 正在注入 100 条全属性高质量测试数据...')
    const mocks = generateMockTasks()
    taskList.value = mocks.map(item => normalizeTask(item))
    syncToServer()
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
      created_at: now,
      updated_at: now,
      is_focused: false
    })
    replaceTaskList([newTask, ...normalizedTaskList.value])
    syncToServer()
    return newTask
  }

  function updateTask(taskId: string, updates: Partial<ITaskItem>) {
    replaceTaskList(
      normalizedTaskList.value.map(task => 
        task.id === taskId ? normalizeTask({ ...task, ...updates, updated_at: Date.now() }) : task
      )
    )
    syncToServer()
  }

  function removeTask(taskId: string) {
    replaceTaskList(normalizedTaskList.value.filter(task => task.id !== taskId))
    syncToServer()
  }

  function moveTaskColumn(taskId: string, newCol: KanbanColumn) {
    updateTask(taskId, { kanban_col: newCol, period: 'daily' })
  }

  function setColumnTasks(column: KanbanColumn, nextTasks: ITaskItem[]) {
    const normalizedColumnTasks = nextTasks.map(task => 
      normalizeTask({ ...task, kanban_col: column, period: 'daily', updated_at: Date.now() })
    )
    const remainingTasks = normalizedTaskList.value.filter(
      task => task.period !== 'daily' || task.kanban_col !== column
    )
    replaceTaskList([...remainingTasks, ...normalizedColumnTasks])
    syncToServer()
  }

  function setFocusedTask(taskId: string | null) {
    replaceTaskList(
      normalizedTaskList.value.map(task => ({
        ...task,
        is_focused: taskId ? task.id === taskId : false,
        updated_at: Date.now()
      }))
    )
    syncToServer()
  }

  function moveTaskToPeriod(taskId: string, period: TaskPeriod) {
    updateTask(taskId, { 
      period, 
      kanban_col: period === 'daily' ? 'todo' : 'todo'
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
    const task = createTask({ title: item.content, period: 'daily', kanban_col: 'todo', is_focused: false })
    return task
  }

  async function markReviewTask(taskId: string, isRemembered: boolean) {
    const task = normalizedTaskList.value.find(item => item.id === taskId)
    if (!task) return
    const d = new Date(); 
    d.setDate(d.getDate() + (isRemembered ? 2 : 1));
    const nextDate = d.toISOString().split('T')[0];
    const reviewInfo = {
      ...(task.review_info || {}),
      next_review_date: nextDate,
      stage: (task.review_info?.stage || 0) + (isRemembered ? 1 : 0)
    }
    updateTask(taskId, { is_review: true, review_info: reviewInfo })
  }

  return {
    taskList, inboxList, isHydrated, isSyncing, currentView,
    normalizedTaskList, todayTasks, shortTermTasks, longTermTasks, routineTasks, reviewTasks, todayReviewTasks, focusedTask, tasksByColumn, tasksByPeriod,
    hydrateFromServer, forceInjectMockData, createTask, updateTask, removeTask, moveTaskColumn, setColumnTasks, setFocusedTask, moveTaskToPeriod, addInboxItem, removeInboxItem, promoteInboxToTask, markReviewTask, syncToServer
  }
})