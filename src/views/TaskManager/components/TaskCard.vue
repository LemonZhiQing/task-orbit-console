<template>
  <div
    class="task-card-v4"
    :class="[`priority-${task.priority}`, { 'is-focused': task.is_focused }]"
    :style="cardStyle"
  >
    <!-- 任务主题色彩带 -->
    <div class="card-edge" :class="`edge-${task.priority}`"></div>
    
    <div class="card-content">
      <div class="card-header">
        <div class="tags">
          <span class="period-tag">{{ periodName(task.period) }}</span>
          <span v-if="task.creator_agent" class="agent-tag">🤖 {{ task.creator_agent }}</span>
        </div>
        <!-- 悬停丝滑删除 -->
        <button class="delete-btn" @click.stop="handleDelete" title="删除任务">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
      
      <div class="card-title">{{ task.title || '未命名任务' }}</div>

      <div v-if="showProgress" class="progress-section">
        <div class="progress-meta">
          <span>完成度 {{ completionPercent }}%</span>
          <span>{{ progressText }}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${completionPercent}%` }"></div>
        </div>
      </div>
      
      <div class="card-footer">
        <div class="metrics">
          <!-- 番茄钟进度 -->
          <span v-if="task.planned_pomodoros > 0 || actualPomodoros > 0" class="metric-tag pomodoro" :class="{'is-done': actualPomodoros >= task.planned_pomodoros && task.planned_pomodoros > 0}">
            🍅 {{ formattedActualPomodoros }}/{{ task.planned_pomodoros || 0 }}
          </span>
          <span v-if="task.has_aggregated_metrics" class="metric-tag aggregate-badge" title="实际量来自子任务汇总">Σ {{ task.aggregated_children_count }}</span>
          <!-- 艾宾浩斯标记 -->
          <span v-if="task.is_review" class="metric-tag review-badge" title="完成后将进入复习池">🧠 知识</span>
        </div>
        
        <div class="actions">
          <!-- 智能动作按钮：根据所属周期自动变形 -->
          <button v-if="canFocus" class="action-btn focus-btn" @click.stop="toggleFocus">
            {{ task.is_focused ? '⏹ 停止' : '▶ 专注' }}
          </button>
          <button v-else-if="task.period === 'routine'" class="action-btn checkin-btn" @click.stop="handleCheckIn">
            ✅ 打卡
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import type { ITaskItem } from '@/types/task'

const props = defineProps<{ task: ITaskItem }>()
const emit = defineEmits(['checkin'])
const store = useTaskStore()

const priorityColorMap: Record<string, string> = {
  p0: '#EF4444',
  p1: '#F59E0B',
  p2: '#3B82F6',
  p3: '#94A3B8'
}

const actualPomodoros = computed(() => props.task.effective_actual_pomodoros ?? props.task.actual_pomodoros ?? 0)
const formattedActualPomodoros = computed(() => Number(actualPomodoros.value).toFixed(2))
const canFocus = computed(() => props.task.period === 'daily' && props.task.kanban_col === 'in_progress')
const completedAmount = computed(() => props.task.effective_completed_amount ?? props.task.completed_amount ?? 0)
const plannedAmount = computed(() => props.task.planned_amount ?? 0)
const showProgress = computed(() => props.task.period === 'short_term' || props.task.period === 'long_term')
const completionPercent = computed(() => {
  if (plannedAmount.value > 0) return Math.min(100, Math.round((completedAmount.value / plannedAmount.value) * 100))
  const plannedPomodoros = props.task.planned_pomodoros || 0
  if (plannedPomodoros > 0) return Math.min(100, Math.round((actualPomodoros.value / plannedPomodoros) * 100))
  return props.task.kanban_col === 'done' ? 100 : 0
})
const progressText = computed(() => {
  if (plannedAmount.value > 0) return `${completedAmount.value}/${plannedAmount.value}${props.task.unit || ''}`
  if ((props.task.planned_pomodoros || 0) > 0) return `🍅 ${formattedActualPomodoros.value}/${props.task.planned_pomodoros || 0}`
  return props.task.kanban_col === 'done' ? '已完成' : '未开始'
})
const taskThemeColor = computed(() => props.task.color || priorityColorMap[props.task.priority] || '#4A9D9A')
const cardStyle = computed(() => ({
  '--task-theme-color': taskThemeColor.value
}))

const periodName = (p: string) => {
  const map: any = { daily: '今日', short_term: '短期', long_term: '长期', routine: '常驻' }
  return map[p] || p
}

const handleDelete = () => {
  store.removeTask(props.task.id)
}

const toggleFocus = () => {
  store.setFocusedTask(props.task.is_focused ? null : props.task.id)
}

const handleCheckIn = () => {
  emit('checkin', props.task.id)
}
</script>

<style scoped>
.task-card-v4 {
  background: var(--vcp-bg-card, #FFFFFF);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(62, 58, 54, 0.03);
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  
  /* 🚨 核心修复：防止在 Flex 容器中被海量数据挤压成面条！ */
  flex-shrink: 0; 
  min-height: 100px; /* 保证卡片始终有呼吸感高度 */
}
.task-card-v4:hover {
  box-shadow: 0 6px 16px rgba(62, 58, 54, 0.06);
  transform: translateY(-2px);
}

/* 番茄钟流光发光态 */
.task-card-v4.is-focused {
  box-shadow: 0 0 0 2px var(--task-theme-color, #4A9D9A), 0 8px 20px color-mix(in srgb, var(--task-theme-color, #4A9D9A) 20%, transparent);
  animation: pulse-border 2s infinite;
}
.task-card-v4.is-focused::before {
  content: '';
  position: absolute;
  top: 0;
  left: -45%;
  width: 45%;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--task-theme-color, #4A9D9A), #fff, var(--task-theme-color, #4A9D9A), transparent);
  box-shadow: 0 0 12px var(--task-theme-color, #4A9D9A);
  z-index: 3;
  pointer-events: none;
  animation: focus-stream 1.6s linear infinite;
}
@keyframes pulse-border {
  0% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--task-theme-color, #4A9D9A) 80%, transparent), 0 8px 20px color-mix(in srgb, var(--task-theme-color, #4A9D9A) 18%, transparent); }
  50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--task-theme-color, #4A9D9A) 22%, transparent), 0 8px 20px color-mix(in srgb, var(--task-theme-color, #4A9D9A) 18%, transparent); }
  100% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--task-theme-color, #4A9D9A) 80%, transparent), 0 8px 20px color-mix(in srgb, var(--task-theme-color, #4A9D9A) 18%, transparent); }
}
@keyframes focus-stream {
  0% { transform: translateX(0); opacity: 0; }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { transform: translateX(322%); opacity: 0; }
}

/* 任务主题色彩带 */
.card-edge { width: 4px; flex-shrink: 0; transition: background 0.3s; background: var(--task-theme-color, #3B82F6); position: relative; z-index: 2; }
.edge-p0 { background: var(--task-theme-color, #EF4444); }
.edge-p1 { background: var(--task-theme-color, #F59E0B); }
.edge-p2 { background: var(--task-theme-color, #3B82F6); }
.edge-p3 { background: var(--task-theme-color, #94A3B8); }

.card-content { padding: 14px 16px; flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; position: relative; z-index: 1; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; min-height: 20px;}
.tags { display: flex; gap: 6px; flex-wrap: wrap; }
.period-tag, .agent-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: var(--vcp-bg-column, #F5F4EE); color: var(--vcp-text-sub, #8C847A); }
.agent-tag { color: #8B5CF6; background: #F5F3FF; }

/* 优雅删除按钮 */
.delete-btn { background: none; border: none; color: #EF4444; opacity: 0; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: all 0.2s; margin-top: -2px; margin-right: -4px;}
.delete-btn:hover { background: #FEF2F2; }
.task-card-v4:hover .delete-btn { opacity: 0.5; }
.task-card-v4:hover .delete-btn:hover { opacity: 1; }

.card-title { font-size: 14px; font-weight: 600; color: var(--vcp-text-main, #3E3A36); line-height: 1.4; word-break: break-all; }

.progress-section { display: flex; flex-direction: column; gap: 6px; margin-top: 2px; }
.progress-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 11px; font-weight: 700; color: var(--vcp-text-sub, #8C847A); }
.progress-track { height: 6px; border-radius: 999px; background: rgba(62, 58, 54, 0.08); overflow: hidden; }
.progress-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--task-theme-color, #4A9D9A), color-mix(in srgb, var(--task-theme-color, #4A9D9A) 65%, #FFFFFF)); transition: width 0.25s ease; }
.card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
.metrics { display: flex; gap: 6px; flex-wrap: wrap; }
.metric-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
.pomodoro { background: #FFF1F2; color: #E11D48; }
.pomodoro.is-done { background: #ECFDF5; color: #059669; }
.review-badge { background: #F0FDF4; color: #059669; }
.aggregate-badge { background: #EEF2FF; color: #4F46E5; }

.action-btn { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px; cursor: pointer; border: none; transition: all 0.2s; }
.focus-btn { background: rgba(74,157,154,0.1); color: var(--color-primary, #4A9D9A); }
.focus-btn:hover { background: var(--color-primary, #4A9D9A); color: #fff; }
.checkin-btn { background: #ECFDF5; color: #059669; }
.checkin-btn:hover { background: #059669; color: #fff; }
</style>