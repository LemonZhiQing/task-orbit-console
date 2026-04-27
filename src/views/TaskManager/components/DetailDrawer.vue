<template>
  <div v-if="visible" class="drawer-overlay" @click="closeDrawer">
    <div class="drawer-content floating-card" @click.stop>
      <div v-if="task" class="drawer-inner">
        
        <!-- 头部标签 -->
        <div class="drawer-header">
          <div class="header-left">
            <button v-if="navigationStack.length" class="back-btn" @click="goBackToParent">
              ← 返回上一级
            </button>
            <div class="header-tags">
              <span class="period-tag">{{ periodName(task.period) }}</span>
              <span v-if="task.creator_agent" class="agent-tag">🤖 {{ task.creator_agent }}</span>
            </div>
          </div>
          <button class="close-btn" @click="closeDrawer">✕</button>
        </div>

        <!-- 无感标题输入 -->
        <input v-model="task.title" class="title-input" placeholder="输入任务标题..." @blur="saveTask" />

        <!-- 核心属性网格 -->
        <div class="attr-grid">
          
          <!-- 状态 -->
          <div class="attr-row">
            <span class="attr-icon">🚦</span><span class="attr-label">状态</span>
            <select v-model="task.kanban_col" class="attr-value borderless-select" @change="saveTask">
              <option value="todo">待办</option>
              <option value="in_progress">进行中</option>
              <option value="done">已完成</option>
            </select>
          </div>

          <!-- 周期 -->
          <div class="attr-row">
            <span class="attr-icon">📁</span><span class="attr-label">周期</span>
            <select v-model="task.period" class="attr-value borderless-select" @change="handlePeriodChange">
              <option value="daily">今日 (Daily)</option>
              <option value="short_term">短期 (本周)</option>
              <option value="long_term">长期 (史诗)</option>
              <option value="routine">常驻 (打卡)</option>
            </select>
          </div>

          <!-- 优先级 -->
          <div class="attr-row">
            <span class="attr-icon">⚡</span><span class="attr-label">优先</span>
            <select v-model="task.priority" class="attr-value borderless-select" @change="saveTask">
              <option value="p0">🚨 P0 紧急</option>
              <option value="p1">🔥 P1 高</option>
              <option value="p2">💧 P2 中</option>
              <option value="p3">🧊 P3 低</option>
            </select>
          </div>

          <!-- 专属主题色 (Color Picker) -->
          <div class="attr-row">
            <span class="attr-icon">🎨</span><span class="attr-label">颜色</span>
            <el-color-picker
              v-model="task.color"
              size="small"
              popper-class="vcp-drawer-popper"
              @change="saveTask"
              :predefine="['#4A9D9A', '#3E3A36', '#516B91', '#81C784', '#F43F5E', '#F59E0B', '#8B5CF6', '#10B981', '#3B82F6']"
              style="margin-left: 4px;"
            />
          </div>

          <!-- 所属项目 (解除封印，如果没选则提示没有长任务) -->
          <div class="attr-row">
            <span class="attr-icon">🎯</span><span class="attr-label">项目</span>
            <el-select
              v-model="task.project"
              class="borderless-select-component"
              popper-class="vcp-drawer-popper"
              :placeholder="parentCandidates.length > 0 ? '未归属项目' : '该层级暂无可用父项目'"
              filterable
              clearable
              @change="saveTask"
            >
              <el-option 
                v-for="item in parentCandidates" 
                :key="item.id" 
                :label="item.title" 
                :value="item.id" 
              />
            </el-select>
          </div>

          <!-- 计划日 -->
          <div class="attr-row">
            <span class="attr-icon">📅</span><span class="attr-label">计划</span>
            <el-date-picker
              v-model="localPlanDate"
              type="date"
              placeholder="未设置"
              format="YYYY/MM/DD"
              value-format="x"
              class="borderless-date-picker"
              popper-class="vcp-drawer-popper"
              :clearable="true"
              @change="saveTask"
            />
          </div>

          <!-- 截止日 -->
          <div class="attr-row">
            <span class="attr-icon">🏁</span><span class="attr-label">截止</span>
            <el-date-picker
              v-model="localDueDate"
              type="date"
              placeholder="无期限"
              format="YYYY/MM/DD"
              value-format="x"
              class="borderless-date-picker"
              popper-class="vcp-drawer-popper"
              :clearable="true"
              @change="saveTask"
            />
          </div>

          <!-- 番茄钟 -->
          <div class="attr-row">
            <span class="attr-icon">🍅</span><span class="attr-label">番茄钟</span>
            <div class="flex-inputs">
              <span
                class="readonly-metric"
                :title="task.has_aggregated_metrics ? '实际番茄钟来自子任务汇总' : '实际番茄钟由系统统计，不能手动编辑'"
              >{{ task.has_aggregated_metrics ? 'Σ ' : '' }}{{ displayActualPomodoros }}</span>
              <span class="slash">/</span>
              <input type="number" v-model.number="task.planned_pomodoros" class="attr-value micro-input" @blur="saveTask" placeholder="计划" />
            </div>
          </div>
          
          <!-- 任务量 -->
          <div class="attr-row" style="grid-column: span 2;">
            <span class="attr-icon">📈</span><span class="attr-label">任务量</span>
            <div class="flex-inputs">
              <span
                class="readonly-metric"
                :title="task.has_aggregated_metrics ? '实际完成量来自子任务汇总' : '实际完成量由系统统计，不能手动编辑'"
              >{{ task.has_aggregated_metrics ? 'Σ ' : '' }}{{ displayCompletedAmount }}</span>
              <span class="slash">/</span>
              <input type="number" v-model.number="task.planned_amount" class="attr-value micro-input" @blur="saveTask" placeholder="总量" />
              <input type="text" v-model="task.unit" class="attr-value micro-input" style="width:60px; margin-left:4px" placeholder="单位" @blur="saveTask" />
            </div>
          </div>

          <!-- 普通标签 -->
          <div class="attr-row" style="grid-column: span 2;">
            <span class="attr-icon">🏷️</span><span class="attr-label">标签</span>
            <input type="text" v-model="formStrings.tags" class="attr-value borderless-input" placeholder="输入普通标签，逗号分隔" @blur="saveTask" />
          </div>

        </div>

        <!-- 子任务列表：短期 / 长期目标专属 -->
        <div v-if="showChildTasks" class="children-section">
          <div class="section-title children-title">
            <span>🧩 子任务列表</span>
            <span class="children-count">{{ childTasks.length }}</span>
          </div>
          <div v-if="childTasks.length" class="children-list">
            <button
              v-for="child in childTasks"
              :key="child.id"
              type="button"
              class="child-task-card"
              :class="`child-status-${child.kanban_col}`"
              @click="openChildTask(child.id)"
            >
              <div class="child-main">
                <span class="child-period">{{ periodName(child.period) }}</span>
                <span class="child-title">{{ child.title || '未命名任务' }}</span>
              </div>
              <div class="child-meta">
                <span class="child-state">{{ columnName(child.kanban_col) }}</span>
                <span class="child-priority">{{ child.priority.toUpperCase() }}</span>
                <span class="child-progress">{{ progressText(child) }}</span>
                <span v-if="child.due_date" class="child-date">截止 {{ formatDate(child.due_date) }}</span>
              </div>
            </button>
          </div>
          <div v-else class="children-empty">当前目标还没有挂载子任务</div>
        </div>

        <!-- 备注 -->
        <div class="memo-section">
          <div class="section-title">📝 备注正文</div>
          <textarea v-model="task.memo" class="memo-input" placeholder="输入 Markdown 格式的详细备忘录..." @blur="saveTask"></textarea>
        </div>

        <!-- 艾宾浩斯复习引擎 -->
        <div class="review-engine-card" :class="{ active: task.is_review }">
          <div class="review-header">
            <span class="review-title">🧠 艾宾浩斯复习引擎</span>
            <label class="switch">
              <input type="checkbox" v-model="task.is_review" @change="saveTask">
              <span class="slider round"></span>
            </label>
          </div>
          <p class="review-desc" v-if="!task.is_review">流转至「已完成」时，将自动为您编入知识闪卡池。</p>

          <div class="review-body" v-if="task.is_review">
            <div class="review-status" v-if="task.review_info">
              <span class="status-badge">阶段 {{ task.review_info.stage || 0 }}</span>
              <span class="status-text">下次复习: {{ task.review_info.next_review_date || '未安排' }}</span>
            </div>

            <div class="input-group">
              <label>知识标签 (用于精准召回，逗号分隔)</label>
              <input v-model="formStrings.knowledge_tags" placeholder="例如: Vue3, 响应式原理" class="cool-input" @blur="saveTask" />
            </div>
            <div class="input-group">
              <label>任意门链接 (external_urls，逗号分隔)</label>
              <input v-model="formStrings.external_urls" placeholder="网页 / file:// / vcp-diary://" class="cool-input" @blur="saveTask" />
            </div>
          </div>
        </div>

        <!-- 底部元信息 -->
        <div class="drawer-footer">
          <div class="timestamps" v-if="task.created_at">
            <span>创建于: {{ formatDateTime(task.created_at) }}</span>
            <span v-if="task.updated_at && task.updated_at !== task.created_at"> · 更新于: {{ formatDateTime(task.updated_at) }}</span>
          </div>
          <div class="danger-zone">
            <button class="delete-task-btn" @click="handleDelete">🗑️ 删除此任务</button>
          </div>
        </div>

      </div>
      <div v-else class="empty-state">
        任务走丢了 🛸
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import { taskApi } from '@/api/task'
import type { ITaskItem, ParentCandidate, TaskPeriod } from '@/types/task'

const props = defineProps<{
  visible: boolean
  taskId: string | null
}>()

const emit = defineEmits(['close'])
const store = useTaskStore()

const task = ref<ITaskItem | null>(null)
const localPlanDate = ref<number | null>(null)
const localDueDate = ref<number | null>(null)
const formStrings = ref({ knowledge_tags: '', external_urls: '', tags: '' })
const parentCandidates = ref<ParentCandidate[]>([])
const navigationStack = ref<{ id: string, title: string }[]>([])

const displayActualPomodoros = computed(() => task.value?.effective_actual_pomodoros ?? task.value?.actual_pomodoros ?? 0)
const displayCompletedAmount = computed(() => task.value?.effective_completed_amount ?? task.value?.completed_amount ?? 0)
const showChildTasks = computed(() => task.value?.period === 'short_term' || task.value?.period === 'long_term')
const childTasks = computed(() => {
  if (!task.value) return []
  return store.normalizedTaskList
    .filter(item => !item.deleted_at && item.id !== task.value?.id && (item.parent_id === task.value?.id || item.project === task.value?.id))
    .sort((a, b) => {
      const periodWeight: Record<string, number> = { short_term: 0, daily: 1, routine: 2, long_term: 3 }
      const columnWeight: Record<string, number> = { in_progress: 0, todo: 1, done: 2 }
      return (periodWeight[a.period] ?? 9) - (periodWeight[b.period] ?? 9)
        || (columnWeight[a.kanban_col] ?? 9) - (columnWeight[b.kanban_col] ?? 9)
        || (a.sort_order || 0) - (b.sort_order || 0)
    })
})

const fetchParentCandidates = async (period: TaskPeriod) => {
  if (!period) {
    parentCandidates.value = [];
    return;
  }
  try {
    const res = await taskApi.getParentCandidates(period) as any;
    parentCandidates.value = Array.isArray(res?.data) ? res.data : [];
  } catch (error) {
    console.error('Failed to fetch parent candidates:', error);
    parentCandidates.value = [];
  }
}

const loadTask = (taskId: string) => {
  const found = store.normalizedTaskList.find(t => t.id === taskId)
  if (!found) return
  task.value = JSON.parse(JSON.stringify(found))
  localPlanDate.value = task.value.plan_date || null
  localDueDate.value = task.value.due_date || null
  formStrings.value.knowledge_tags = (task.value.knowledge_tags || []).join(', ')
  formStrings.value.external_urls = (task.value.external_urls || []).join(', ')
  formStrings.value.tags = (task.value.tags || []).join(', ')
  fetchParentCandidates(task.value.period)
}

// 核心大管家：当抽屉打开时，一并处理所有初始化工作
watch(() => [props.visible, props.taskId] as const, ([newVal, taskId]) => {
  if (!newVal) {
    navigationStack.value = []
    return
  }

  if (taskId && task.value?.id !== taskId) {
    navigationStack.value = []
    loadTask(taskId)
  }
}, { immediate: true })

// 专属拦截器：当用户在下拉框里切换“周期”时，先清理旧项目，再拉取新项目，最后保存
const handlePeriodChange = () => {
    // 跨级了，老父亲不合法了，清空！
    if (!task.value) return
    task.value.project = null;
    task.value.parent_id = null;
    
    // 去拉取新层级的候选人
    fetchParentCandidates(task.value.period);
    
    // 保存到后端
    saveTask();
}

const periodName = (p: string) => {
  const map: Record<string, string> = { daily: '今日', short_term: '短期', long_term: '长期', routine: '常驻' }
  return map[p] || p
}

const columnName = (column: string) => {
  const map: Record<string, string> = { todo: '待办', in_progress: '进行中', done: '已完成' }
  return map[column] || column
}

const formatDate = (ts?: number | string | null) => {
  if (!ts) return '未设置'
  const d = new Date(ts)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

const formatDateTime = (ts: number | string) => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

const progressText = (item: ITaskItem) => {
  const completedAmount = item.effective_completed_amount ?? item.completed_amount ?? 0
  const actualPomodoros = item.effective_actual_pomodoros ?? item.actual_pomodoros ?? 0
  const prefix = item.has_aggregated_metrics ? 'Σ ' : ''
  if (item.planned_amount && item.planned_amount > 0) return `${prefix}${completedAmount}/${item.planned_amount}${item.unit || ''}`
  if (item.planned_pomodoros && item.planned_pomodoros > 0) return `${prefix}🍅 ${actualPomodoros}/${item.planned_pomodoros}`
  if (item.kanban_col === 'done') return '100%'
  if (item.kanban_col === 'in_progress') return '进行中'
  return '未开始'
}

const openChildTask = (taskId: string) => {
  if (!task.value || task.value.id === taskId) return
  saveTask()
  navigationStack.value.push({
    id: task.value.id,
    title: task.value.title || '未命名任务'
  })
  loadTask(taskId)
}

const goBackToParent = () => {
  const previousTask = navigationStack.value.pop()
  if (!previousTask) return
  saveTask()
  loadTask(previousTask.id)
}

const saveTask = () => {
  if (!task.value) return
  task.value.plan_date = localPlanDate.value ? Number(localPlanDate.value) : null
  task.value.due_date = localDueDate.value ? Number(localDueDate.value) : null
  task.value.parent_id = task.value.project || task.value.parent_id || null
  task.value.project = task.value.parent_id
  task.value.knowledge_tags = formStrings.value.knowledge_tags.split(',').map(s => s.trim()).filter(Boolean)
  task.value.external_urls = formStrings.value.external_urls.split(',').map(s => s.trim()).filter(Boolean)
  task.value.tags = formStrings.value.tags.split(',').map(s => s.trim()).filter(Boolean)
  
  if (task.value.has_aggregated_metrics) {
    delete task.value.effective_actual_pomodoros
    delete task.value.effective_completed_amount
    delete task.value.aggregated_children_count
    delete task.value.has_aggregated_metrics
  }

  store.updateTask(task.value.id, task.value)
}

const handleDelete = () => {
  if (task.value && confirm('确定要将该任务永久删除吗？')) {
    store.removeTask(task.value.id)
    emit('close')
  }
}

const closeDrawer = () => {
  emit('close')
}
</script>

<style scoped>
.drawer-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(62, 58, 54, 0.1); backdrop-filter: blur(2px); z-index: 20000; display: flex; justify-content: flex-end; }
.floating-card { width: 580px; background: var(--vcp-bg-card, #fff); margin: 90px 24px 24px 0; border-radius: 20px; box-shadow: 0 10px 40px rgba(62, 58, 54, 0.1); display: flex; flex-direction: column; animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); overflow-y: auto; }
.floating-card::-webkit-scrollbar { display: none; }
.drawer-inner { padding: 36px 40px; display: flex; flex-direction: column; gap: 28px; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.header-tags { display: flex; align-items: center; gap: 8px; min-width: 0; flex-wrap: wrap; }
.back-btn { border: none; border-radius: 999px; background: rgba(74, 157, 154, 0.1); color: var(--color-primary, #4A9D9A); padding: 7px 12px; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
.back-btn:hover { background: var(--color-primary, #4A9D9A); color: #fff; transform: translateX(-2px); }
.period-tag, .agent-tag { background: var(--vcp-bg-column, #f5f4ee); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: var(--vcp-text-sub);}
.close-btn { background: none; border: none; font-size: 22px; cursor: pointer; color: var(--vcp-text-sub); transition: color 0.2s;}
.close-btn:hover { color: var(--vcp-text-main); }
.title-input { font-size: 26px; font-weight: 600; border: none; outline: none; width: 100%; color: var(--vcp-text-main); background: transparent; padding: 4px 0;}
.title-input::placeholder { color: var(--vcp-text-sub); opacity: 0.4; }
.attr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: var(--vcp-bg-column, #f5f4ee); padding: 20px; border-radius: 16px; }
.attr-row { display: flex; align-items: center; font-size: 14px; }
.attr-icon { margin-right: 12px; font-size: 16px; }
.attr-label { color: var(--vcp-text-sub); width: 60px; font-weight: 500;}
.borderless-select, .borderless-input { border: none; background: transparent; outline: none; color: var(--vcp-text-main); font-weight: 600; flex: 1; cursor: pointer; padding: 4px; width: 100%; }
.borderless-select:hover, .borderless-input:hover { background: rgba(62, 58, 54, 0.05); border-radius: 6px; }
.flex-inputs { display: flex; align-items: center; }
.micro-input { width: 50px; text-align: center; border: none; background: transparent; font-weight: 600; outline: none; padding: 4px; color: var(--vcp-text-main); }
.micro-input:hover { background: rgba(62, 58, 54, 0.05); border-radius: 6px; }
.micro-input::placeholder { font-weight: 400; opacity: 0.4; color: var(--vcp-text-sub); font-size: 12px; }
.slash { margin: 0 4px; color: var(--vcp-text-sub); opacity: 0.5;}
.readonly-metric { min-width: 50px; text-align: center; font-weight: 800; color: var(--color-primary, #4A9D9A); background: rgba(74,157,154,0.1); border-radius: 6px; padding: 4px 8px; }

:deep(.borderless-date-picker) { flex: 1; width: auto; }
:deep(.borderless-date-picker .el-input__wrapper) { box-shadow: none !important; background: transparent !important; padding: 0 4px !important; }
:deep(.borderless-date-picker .el-input__inner) { color: var(--vcp-text-main) !important; font-weight: 600 !important; cursor: pointer; text-align: left; }
:deep(.borderless-date-picker:hover .el-input__wrapper) { background: rgba(62, 58, 54, 0.05) !important; border-radius: 6px; }

:deep(.borderless-select-component) { flex: 1; }
:deep(.borderless-select-component .el-input__wrapper) { box-shadow: none !important; background: transparent !important; padding: 0 4px !important; cursor: pointer; }
:deep(.borderless-select-component .el-input__inner) { color: var(--vcp-text-main) !important; font-weight: 600 !important; cursor: pointer; }
:deep(.borderless-select-component:hover .el-input__wrapper) { background: rgba(62, 58, 54, 0.05) !important; border-radius: 6px; }

.section-title { font-size: 14px; font-weight: 600; color: var(--vcp-text-main); margin-bottom: 12px; }
.children-section { background: rgba(74, 157, 154, 0.05); border: 1px solid rgba(74, 157, 154, 0.1); border-radius: 16px; padding: 20px; }
.children-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.children-count { min-width: 24px; height: 22px; padding: 0 8px; border-radius: 999px; background: rgba(74,157,154,0.12); color: var(--color-primary, #4A9D9A); display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
.children-list { display: flex; flex-direction: column; gap: 10px; }
.child-task-card { width: 100%; border: 1px solid rgba(62, 58, 54, 0.08); background: rgba(255,255,255,0.72); border-radius: 12px; padding: 12px 14px; text-align: left; cursor: pointer; border-left: 4px solid rgba(62, 58, 54, 0.18); transition: all 0.2s ease; }
.child-task-card:hover { transform: translateY(-1px); background: rgba(255,255,255,0.95); box-shadow: 0 10px 24px rgba(62,58,54,0.08); }
.child-status-todo { border-left-color: #F43F5E; }
.child-status-in_progress { border-left-color: #3B82F6; }
.child-status-done { border-left-color: #94A3B8; }
.child-main { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.child-period { flex: 0 0 auto; padding: 3px 8px; border-radius: 999px; background: rgba(62,58,54,0.06); color: var(--vcp-text-sub); font-size: 12px; font-weight: 700; }
.child-title { color: var(--vcp-text-main); font-size: 14px; font-weight: 800; line-height: 1.4; }
.child-meta { display: flex; flex-wrap: wrap; gap: 8px; color: var(--vcp-text-sub); font-size: 12px; font-weight: 700; }
.child-meta span { padding: 3px 8px; border-radius: 999px; background: rgba(62,58,54,0.05); }
.child-progress { color: var(--color-primary, #4A9D9A) !important; background: rgba(74,157,154,0.1) !important; }
.children-empty { padding: 18px; border: 1px dashed rgba(62,58,54,0.14); border-radius: 12px; color: var(--vcp-text-sub); text-align: center; font-size: 13px; }
.memo-input { width: 100%; min-height: 120px; border: 1px solid rgba(62, 58, 54, 0.08); border-radius: 12px; padding: 16px; background: var(--vcp-bg-column, #f5f4ee); resize: vertical; outline: none; color: var(--vcp-text-main); font-family: inherit; line-height: 1.6; transition: border-color 0.2s;}
.memo-input:focus { border-color: var(--color-primary, #4A9D9A); background: var(--vcp-bg-card, #fff);}
.review-engine-card { background: rgba(74, 157, 154, 0.05); border: 1px solid rgba(74, 157, 154, 0.1); border-radius: 16px; padding: 24px; transition: all 0.3s; }
.review-engine-card.active { background: rgba(74, 157, 154, 0.1); border-color: rgba(74, 157, 154, 0.3); }
.review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;}
.review-title { font-weight: 600; color: #3b827f; }
.review-desc { font-size: 13px; color: #4A9D9A; opacity: 0.8; margin: 0; line-height: 1.5;}
.review-body { margin-top: 20px; display: flex; flex-direction: column; gap: 16px; }
.review-status { background: rgba(255,255,255,0.5); padding: 8px 14px; border-radius: 8px; display: flex; gap: 12px; align-items: center; border: 1px solid rgba(74, 157, 154, 0.15);}
.status-badge { background: #4A9D9A; color: white; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;}
.status-text { font-size: 12px; color: #3b827f; font-weight: 500;}
.input-group label { font-size: 12px; font-weight: 600; color: #3b827f; margin-bottom: 6px; display: block; }
.cool-input { width: 100%; border: 1px solid rgba(74, 157, 154, 0.2); background: rgba(255,255,255,0.6); padding: 10px 14px; border-radius: 8px; outline: none; color: var(--vcp-text-main); transition: all 0.2s;}
.cool-input:focus { border-color: #4A9D9A; background: #fff; }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(62, 58, 54, 0.15); transition: .4s; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);}
input:checked + .slider { background-color: #4A9D9A; }
input:checked + .slider:before { transform: translateX(20px); }
.slider.round { border-radius: 24px; }
.slider.round:before { border-radius: 50%; }
.drawer-footer { margin-top: 10px; display: flex; justify-content: space-between; align-items: center; }
.timestamps { font-size: 12px; color: var(--vcp-text-sub); opacity: 0.7;}
.danger-zone { display: flex; justify-content: flex-end; }
.delete-task-btn { background: rgba(239, 68, 68, 0.05); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 13px; }
.delete-task-btn:hover { background: #EF4444; color: white; }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.empty-state { text-align: center; padding: 100px 0; color: var(--vcp-text-sub); font-size: 18px;}
:global(.vcp-drawer-popper) {
  z-index: 21000 !important;
}
</style>