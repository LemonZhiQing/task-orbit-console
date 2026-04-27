<template>
  <div class="planning-center-container">
    
    <!-- 左侧：恢复满血 100% 宽度的效能洞察大卡片，不再让路 -->
    <div class="insights-panel">
      <div class="panel-header">
        <div style="display: flex; align-items: center;">
          <div class="panel-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            效能洞察 (Insights)
          </div>
          <el-dropdown trigger="click" @command="handleRangeChange" style="margin-left: 16px;">
            <div class="date-badge interactive-badge" style="font-size: 11px; padding: 4px 10px;">
              {{ rangeLabel }}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="vcp-custom-dropdown">
                <el-dropdown-item v-for="(opt, key) in timeRanges" :key="key" :command="key" :class="{ 'is-active': currentTimeRange === key }">
                  {{ opt.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="insights-content">
        <div class="stats-group">
          <div class="stat-item">
            <span class="stat-label">累计专注</span>
            <div class="stat-value">{{ store.insights.focusHours }} <span class="stat-unit">小时</span></div>
          </div>
          <div class="stat-item">
            <span class="stat-label">连续达成</span>
            <div class="stat-value">{{ store.insights.streak }} <span class="stat-unit">天 🔥</span></div>
          </div>
        </div>

        <div class="chart-group">
          <div class="chart-wrapper">
            <div class="sparkline-container">
              <svg viewBox="0 0 400 60" preserveAspectRatio="none" class="sparkline-svg">       
                <defs>
                  <linearGradient id="lineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#F43F5E" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="#F43F5E" stop-opacity="1"/>
                  </linearGradient>
                  <linearGradient id="areaFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#F43F5E" stop-opacity="0.15"/>
                    <stop offset="100%" stop-color="#F43F5E" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path :d="areaPath" fill="url(#areaFill)"/>
                <path :d="linePath" fill="none" stroke="url(#lineGlow)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle v-if="activityData.length > 0" cx="400" :cy="lastPointY" r="4" fill="#FFFFFF" stroke="#F43F5E" stroke-width="2" class="glow-point"/>
              </svg>
            </div>
            <div class="heatmap-container" :style="{ gap: heatmapGap }">
              <div
                v-for="point in activityData"
                :key="point.key"
                class="heat-cube"
                :style="{
                  opacity: point.value === 0 ? 0.05 : point.value,
                  boxShadow: point.value > 0.8 ? '0 2px 6px rgba(74, 157, 154, 0.4)' : 'none',
                  background: point.value === 0 ? 'var(--vcp-text-sub)' : 'var(--color-primary, #4A9D9A)',
                  borderRadius: activityData.length > 72 ? '2px' : '4px'
                }"
                :title="`${point.label} · 活跃度: ${Math.round(point.value * 100)}%`"
              ></div>
            </div>
            <div class="heatmap-axis" v-if="axisLabels.length > 0">
              <span v-for="label in axisLabels" :key="label.key" :style="{ left: label.left + '%' }">{{ label.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 下半部：目标池网格 -->
    <div class="pools-grid">
      <!-- 短期目标池 -->
      <div class="pool-col">
        <div class="pool-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="pool-title">短期目标 (本周)</span>
            <span class="pool-count">{{ shortTermTasks.length }}</span>
          </div>
          <button class="ghost-add-btn" @click="quickAdd('short_term')" title="新建短期目标">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <div class="pool-list">
          <TaskCard 
            v-for="task in shortTermTasks" 
            :key="task.id" 
            :task="task" 
            @click="openDetail(task.id)"
            @promote="promoteToDaily(task.id)" 
          />
          <div v-if="shortTermTasks.length === 0" class="empty-state">暂无短期任务</div>   
        </div>
      </div>

      <!-- 长期宏图池 -->
      <div class="pool-col">
        <div class="pool-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="pool-title">长期宏图 (Epic)</span>
            <span class="pool-count">{{ longTermTasks.length }}</span>
          </div>
          <button class="ghost-add-btn" @click="quickAdd('long_term')" title="新建长期宏图">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <div class="pool-list">
          <TaskCard 
            v-for="task in longTermTasks" 
            :key="task.id" 
            :task="task" 
            @click="openDetail(task.id)"
            @promote="promoteToDaily(task.id)" 
          />
          <div v-if="longTermTasks.length === 0" class="empty-state">暂无长期宏图</div>   
        </div>
      </div>

      <!-- 常驻习惯池 -->
      <div class="pool-col">
        <div class="pool-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="pool-title">常驻习惯 (Routine)</span>
            <span class="pool-count">{{ routineTasks.length }}</span>
          </div>
          <button class="ghost-add-btn" @click="quickAdd('routine')" title="新建常驻习惯">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <div class="pool-list">
          <TaskCard 
            v-for="task in routineTasks" 
            :key="task.id" 
            :task="task" 
            @click="openDetail(task.id)"
            @promote="promoteToDaily(task.id)" 
          />
          <div v-if="routineTasks.length === 0" class="empty-state">暂无常驻习惯</div>     
        </div>
      </div>
    </div>

    <!-- 沉浸式详情抽屉：Teleport 到 body，避免被全域排期雷达的弹层 stacking context 压住 -->
    <Teleport to="body">
      <DetailDrawer :visible="isDrawerOpen" :task-id="selectedTaskId" @close="isDrawerOpen = false" />
    </Teleport>
    
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import TaskCard from './components/TaskCard.vue'
import DetailDrawer from './components/DetailDrawer.vue'
import { useTaskStore } from '@/stores/taskStore'

const store = useTaskStore()

const shortTermTasks = computed(() => store.shortTermTasks)
const longTermTasks = computed(() => store.longTermTasks)
const routineTasks = computed(() => store.routineTasks)

const promoteToDaily = (taskId: string) => {
  if (store.moveTaskToPeriod) {
    store.moveTaskToPeriod(taskId, 'daily')
  }
}

const isDrawerOpen = ref(false)
const selectedTaskId = ref<string | null>(null)
const openDetail = (taskId: string) => {
  selectedTaskId.value = taskId
  isDrawerOpen.value = true
}

const quickAdd = (periodType: string) => {
  const now = new Date()
  const defaultDate = new Date()
  if (now.getHours() >= 21) {
    defaultDate.setDate(defaultDate.getDate() + 1)
  }
  
  const timestamp = defaultDate.getTime()

  const newTask = store.createTask({
    title: '',
    period: periodType as 'short_term' | 'long_term' | 'routine',
    kanban_col: 'todo', 
    plan_date: timestamp,
    due_date: timestamp 
  })
  openDetail(newTask.id)
}

type TimeBucketUnit = 'hour' | 'day' | 'week' | 'month'
type ActivityPoint = { key: string; label: string; value: number; start: number; end: number }
type AxisLabel = { key: string; text: string; left: number }

const currentTimeRange = ref('last_30_days')
const timeRanges: Record<string, { label: string, points: number, unit: TimeBucketUnit }> = {
  today: { label: '当天 (按小时)', points: 24, unit: 'hour' },
  this_week: { label: '本周', points: 7, unit: 'day' },
  this_month: { label: '本月', points: 30, unit: 'day' },
  last_30_days: { label: '最近 30 天', points: 30, unit: 'day' },
  last_3_months: { label: '最近 3 个月', points: 13, unit: 'week' },
  last_6_months: { label: '最近半年', points: 26, unit: 'week' },
  last_1_year: { label: '最近一年', points: 52, unit: 'week' },
  all: { label: '所有时间', points: 24, unit: 'month' }
}

const rangeLabel = computed(() => timeRanges[currentTimeRange.value].label)

const heatmapGap = computed(() => {
  const len = activityData.value.length;
  if (len > 180) return '1px';
  if (len > 30) return '2px';
  return '6px';
})

const activityData = ref<ActivityPoint[]>([])
const axisLabels = ref<AxisLabel[]>([])
const linePath = ref('')
const areaPath = ref('')
const lastPointY = ref(0)

const bucketMsMap: Record<TimeBucketUnit, number> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000
}

const formatBucketLabel = (timestamp: number, unit: TimeBucketUnit) => {
  const d = new Date(timestamp)
  if (unit === 'hour') return `${String(d.getHours()).padStart(2, '0')}:00`
  if (unit === 'week') return `${d.getMonth() + 1}/${d.getDate()} 周`
  if (unit === 'month') return `${d.getFullYear()}/${d.getMonth() + 1}`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const buildAxisLabels = (points: ActivityPoint[]) => {
  if (points.length <= 1) return []
  const indexes = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]))
  return indexes.map(index => ({
    key: points[index].key,
    text: points[index].label.replace(' 周', ''),
    left: (index / (points.length - 1)) * 100
  }))
}

const handleRangeChange = (cmd: string) => {
  currentTimeRange.value = cmd
  generateChartData(timeRanges[cmd])
}

const generateChartData = (range = timeRanges[currentTimeRange.value]) => {
  const bucketMs = bucketMsMap[range.unit]
  const length = range.points
  const end = Date.now()
  const start = end - (length - 1) * bucketMs
  const data = Array.from({ length }, (_, idx) => {
    const bucketStart = start + idx * bucketMs
    const bucketEnd = bucketStart + bucketMs
    const pomodoros = store.normalizedTaskList
      .filter(task => {
        const ts = task.completed_at || task.updated_at || task.created_at
        return ts >= bucketStart && ts < bucketEnd
      })
      .reduce((sum, task) => sum + (task.actual_pomodoros || (task.kanban_col === 'done' ? 1 : 0)), 0)
    return {
      key: `${range.unit}-${bucketStart}`,
      label: formatBucketLabel(bucketStart, range.unit),
      value: Math.min(1, pomodoros / (range.unit === 'hour' ? 2 : range.unit === 'day' ? 6 : range.unit === 'week' ? 18 : 48)),
      start: bucketStart,
      end: bucketEnd
    }
  })
  activityData.value = data;
  axisLabels.value = buildAxisLabels(data);

  const width = 400;
  const height = 50; 
  
  if (length <= 1) {
    linePath.value = ''; areaPath.value = ''; return;
  }

  const points = data.map((point, idx) => {
    const x = (idx / (length - 1)) * width;
    const y = height - (point.value * height) + 5;
    return { x, y };
  });

  lastPointY.value = points[points.length - 1].y;

  let dLine = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    dLine += ` C ${midX},${prev.y} ${midX},${curr.y} ${curr.x},${curr.y}`;
  }
  
  linePath.value = dLine;
  areaPath.value = `${dLine} L ${width},60 L 0,60 Z`;
}

onMounted(() => {
  generateChartData(timeRanges[currentTimeRange.value])
})
</script>

<style scoped>
.planning-center-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--topbar-height, 72px));
  padding: 24px 40px;
  gap: 24px;
  box-sizing: border-box;
}

/* 效能洞察面板 */
.insights-panel {
  width: 100%; background: var(--vcp-bg-card, #FFFFFF); border: 1px solid rgba(62, 58, 54, 0.06);
  border-radius: 16px; padding: 24px 32px; box-shadow: 0 4px 20px rgba(62, 58, 54, 0.03);
  display: flex; flex-direction: column; flex-shrink: 0;
}
.panel-header { display: flex; justify-content: flex-start; align-items: center; margin-bottom: 24px; }
.panel-title { display: flex; align-items: center; font-size: 16px; font-weight: 600; color: var(--color-primary, #4A9D9A); }
.interactive-badge { cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease; user-select: none; }
.interactive-badge:hover { background: rgba(62, 58, 54, 0.06); color: var(--vcp-text-main, #3E3A36); }
.date-badge { font-size: 12px; font-weight: 600; color: var(--vcp-text-sub, #8C847A); background: var(--vcp-bg-column, #F5F4EE); padding: 6px 14px; border-radius: 20px; }
.insights-content { display: flex; gap: 48px; align-items: center; flex: 1; }
.stats-group { display: flex; flex-direction: column; gap: 20px; min-width: 140px; }
.stat-item { display: flex; flex-direction: column; gap: 6px; }
.stat-label { font-size: 13px; font-weight: 600; color: var(--vcp-text-sub, #8C847A); }
.stat-value { font-size: 28px; font-weight: 700; color: var(--vcp-text-main, #3E3A36); display: flex; align-items: baseline; gap: 6px; }
.stat-unit { font-size: 13px; font-weight: 600; color: var(--vcp-text-sub, #8C847A); }
.chart-group { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.chart-label { font-size: 12px; font-weight: 600; color: var(--vcp-text-sub, #8C847A); margin-bottom: 12px; text-align: right; }
.chart-wrapper { position: relative; height: 108px; display: flex; flex-direction: column; justify-content: flex-end; padding-right: 72px; padding-bottom: 20px; }
.sparkline-container { position: absolute; top: 0; left: 0; right: 72px; height: 70px; pointer-events: none; transition: all 0.3s ease; }
.sparkline-svg { width: 100%; height: 100%; overflow: visible; }
.glow-point { filter: drop-shadow(0 0 6px rgba(244,63,94,0.8)); transition: cy 0.3s ease; }
.heatmap-container { display: flex; justify-content: space-between; align-items: flex-end; height: 16px; margin-bottom: 10px; transform: translateY(-4px); z-index: 2; transition: gap 0.3s ease; }
.heat-cube { flex: 1; height: 14px; min-width: 4px; transition: all 0.3s ease; }
.heat-cube:hover { transform: translateY(-2px) scale(1.1); filter: brightness(1.1); }
.heatmap-axis { position: relative; height: 16px; margin-top: 0; z-index: 2; color: var(--vcp-text-sub, #8C847A); font-size: 10px; font-weight: 600; opacity: 0.7; }
.heatmap-axis span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
.heatmap-axis span:first-child { transform: translateX(0); }
.heatmap-axis span:last-child { transform: translateX(-100%); }

/* 目标池网格 */
.pools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; flex: 1; min-height: 0; }
.pool-col { background: var(--vcp-bg-column, #F5F4EE); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; overflow: hidden; }
.pool-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-shrink: 0; }
.pool-title { font-size: 14px; font-weight: 600; color: var(--vcp-text-main, #3E3A36); }
.pool-count { font-size: 12px; font-weight: 600; background: rgba(62, 58, 54, 0.08); padding: 4px 10px; border-radius: 12px; color: var(--vcp-text-sub, #8C847A); }
.ghost-add-btn { background: transparent; border: none; color: var(--vcp-text-sub); cursor: pointer; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
.ghost-add-btn:hover { background: rgba(62, 58, 54, 0.08); color: var(--vcp-text-main); }
.pool-list { display: flex; flex-direction: column; gap: 14px; overflow-y: auto; flex: 1; padding-right: 4px; }
.pool-list::-webkit-scrollbar { width: 4px; background: transparent; }
.pool-list::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; transition: background 0.3s; }
.pool-col:hover .pool-list::-webkit-scrollbar-thumb { background: rgba(62, 58, 54, 0.15); }
.pool-list::-webkit-scrollbar-thumb:hover { background: rgba(62, 58, 54, 0.25); }
.empty-state { text-align: center; color: var(--vcp-text-sub, #8C847A); font-size: 13px; font-weight: 500; padding: 32px 0; border: 2px dashed rgba(62, 58, 54, 0.1); border-radius: 12px; }

</style>

<style>
/* 全局覆盖样式 */
.vcp-custom-dropdown { background: var(--vcp-bg-card, #FFFFFF) !important; border: 1px solid rgba(62, 58, 54, 0.08) !important; border-radius: 12px !important; box-shadow: 0 10px 25px rgba(62, 58, 54, 0.06) !important; padding: 8px !important; }
.vcp-custom-dropdown .el-dropdown-menu__item { color: var(--vcp-text-main, #3E3A36) !important; border-radius: 6px !important; font-weight: 500 !important; padding: 8px 16px !important; margin-bottom: 2px !important; }
.vcp-custom-dropdown .el-dropdown-menu__item:hover { background-color: rgba(62, 58, 54, 0.04) !important; }
.vcp-custom-dropdown .el-dropdown-menu__item.is-active { color: var(--color-primary, #4A9D9A) !important; background-color: rgba(74, 157, 154, 0.08) !important; font-weight: 600 !important; }

</style>