<template>
  <div class="task-card-v4" :class="[`priority-${task.priority}`, { 'is-focused': task.is_focused }]">
    <!-- 优先级彩带 -->
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
      
      <div class="card-footer">
        <div class="metrics">
          <!-- 番茄钟进度 -->
          <span v-if="task.planned_pomodoros > 0" class="metric-tag pomodoro" :class="{'is-done': task.actual_pomodoros >= task.planned_pomodoros}">
            🍅 {{ task.actual_pomodoros || 0 }}/{{ task.planned_pomodoros }}
          </span>
          <!-- 艾宾浩斯标记 -->
          <span v-if="task.is_review" class="metric-tag review-badge" title="完成后将进入复习池">🧠 知识</span>
        </div>
        
        <div class="actions">
          <!-- 智能动作按钮：根据所属周期自动变形 -->
          <button v-if="task.period === 'daily'" class="action-btn focus-btn" @click.stop="toggleFocus">
            {{ task.is_focused ? '⏹ 停止' : '▶ 专注' }}
          </button>
          <button v-else class="action-btn promote-btn" @click.stop="emit('promote', task.id)">
            ↗ 安排到今日
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTaskStore } from '@/stores/taskStore'
import type { ITaskItem } from '@/types/task'

const props = defineProps<{ task: ITaskItem }>()
const emit = defineEmits(['promote'])
const store = useTaskStore()

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
  box-shadow: 0 0 0 2px var(--color-primary, #4A9D9A), 0 8px 20px rgba(74, 157, 154, 0.15);
  animation: pulse-border 2s infinite;
}
@keyframes pulse-border {
  0% { box-shadow: 0 0 0 2px rgba(74,157,154,0.8), 0 8px 20px rgba(74,157,154,0.15); }
  50% { box-shadow: 0 0 0 4px rgba(74,157,154,0.2), 0 8px 20px rgba(74,157,154,0.15); }
  100% { box-shadow: 0 0 0 2px rgba(74,157,154,0.8), 0 8px 20px rgba(74,157,154,0.15); }
}

/* 优先级彩带 */
.card-edge { width: 4px; flex-shrink: 0; transition: background 0.3s; }
.edge-p0 { background: #EF4444; }
.edge-p1 { background: #F59E0B; }
.edge-p2 { background: #3B82F6; }
.edge-p3 { background: #94A3B8; }

.card-content { padding: 14px 16px; flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
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

.card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
.metrics { display: flex; gap: 6px; }
.metric-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
.pomodoro { background: #FFF1F2; color: #E11D48; }
.pomodoro.is-done { background: #ECFDF5; color: #059669; }
.review-badge { background: #F0FDF4; color: #059669; }

.action-btn { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px; cursor: pointer; border: none; transition: all 0.2s; }
.focus-btn { background: rgba(74,157,154,0.1); color: var(--color-primary, #4A9D9A); }
.focus-btn:hover { background: var(--color-primary, #4A9D9A); color: #fff; }
.promote-btn { background: #F5F3FF; color: #6D28D9; }
.promote-btn:hover { background: #6D28D9; color: #fff; }
</style>