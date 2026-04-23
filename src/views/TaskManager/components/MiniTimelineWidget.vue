<template>
  <div class="mini-radar-widget glass-effect" @click="$emit('expand')" title="点击展开全域排期雷达">
    <div class="widget-header">
      <span class="widget-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path></svg>
        全域排期雷达
      </span>
      <span class="widget-action">展开 ↗</span>
    </div>
    
    <div class="widget-body">
      <div class="active-stats-grid">
        <div class="stat-block">
          <div class="stat-num" style="color: #4A9D9A;">{{ activeShortTermCount }}</div>
          <div class="stat-label">活跃短期目标</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
          <div class="stat-num" style="color: #CD853F;">{{ activeLongTermCount }}</div>
          <div class="stat-label">并行长期宏图</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTaskStore } from '@/stores/taskStore'

defineEmits(['expand'])

const store = useTaskStore()

const isTaskActive = (task: any) => {
  if (task.kanban_col === 'done') return false;
  const now = Date.now();
  if (task.due_date && task.due_date > 0 && task.due_date < now) {
      return false; 
  }
  return true;
}

const activeShortTermCount = computed(() => store.shortTermTasks.filter(isTaskActive).length)
const activeLongTermCount = computed(() => store.longTermTasks.filter(isTaskActive).length)
</script>

<style scoped>
.glass-effect {
  /* ✨ 终极绝杀：固定视口定位 ✨ */
  position: fixed !important;
  top: 130px !important;  /* 避开头部的导航栏 */
  right: 48px !important;
  z-index: 900 !important; /* 确保它在除 Drawer 以外的最上层 */
  width: 250px;
  height: 100px;

  /* 毛玻璃悬浮质感 */
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 30px rgba(62, 58, 54, 0.08), 0 0 1px rgba(0,0,0,0.05) inset;
}

.mini-radar-widget {
  border-radius: 16px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

.mini-radar-widget:hover {
  box-shadow: 0 15px 35px rgba(74, 157, 154, 0.15), 0 0 1px rgba(0,0,0,0.05) inset;
  transform: translateY(-4px) scale(1.02);
  border-color: rgba(74, 157, 154, 0.3);
  background: rgba(255, 255, 255, 0.95) !important;
}

.widget-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.widget-title { font-size: 14px; font-weight: 600; color: var(--vcp-text-main); display: flex; align-items: center; }
.widget-action { font-size: 11px; font-weight: 600; background: rgba(74, 157, 154, 0.08); color: var(--color-primary, #4A9D9A); padding: 2px 8px; border-radius: 10px; opacity: 0; transition: all 0.3s; transform: translateX(-5px); }
.mini-radar-widget:hover .widget-action { opacity: 1; transform: translateX(0); }
.widget-body { flex: 1; display: flex; align-items: center; }
.active-stats-grid { width: 100%; display: flex; align-items: center; justify-content: space-between; }
.stat-block { display: flex; flex-direction: column; align-items: flex-start; flex: 1; }
.stat-divider { width: 1px; height: 28px; background: rgba(62, 58, 54, 0.1); margin: 0 16px; }
.stat-num { font-size: 26px; font-weight: 800; line-height: 1; margin-bottom: 4px; text-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.stat-label { font-size: 11px; font-weight: 600; color: var(--vcp-text-sub); }
</style>