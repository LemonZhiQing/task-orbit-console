<template>
  <div class="left-float-layer">
    <div class="left-overview-trigger today-stats-shell" aria-label="今日任务概览">
      <div class="today-stat danger" title="今日未完成任务">
        <span class="stat-value">{{ todayPendingCount }}</span>
      </div>
      <div class="today-stat success" title="今日已完成任务">
        <span class="stat-value">{{ todayDoneCount }}</span>
      </div>
      <div class="today-stat tomato" title="今日还需番茄钟">
        <span class="stat-value">{{ remainingPomodoros }}</span>
        <span class="tomato-icon">🍅</span>
      </div>
    </div>

    <button class="left-radar-widget glass-card review-radar-card" type="button" @click="isReviewDialogOpen = true">
      <div class="widget-header">
        <span class="review-card-title">🧠 复习雷达</span>
        <span class="widget-action-placeholder">↖</span>
      </div>

      <div class="widget-body">
        <div class="active-stats-grid">
          <div class="review-stat-block pending">
            <div class="review-stat-label">今日待复习</div>
            <div class="review-stat-num">{{ todayReviewDueCount }}</div>
            <div class="review-stat-sub">全部复习 {{ totalReviewTaskCount }}</div>
          </div>

          <div class="stat-divider"></div>

          <div class="review-stat-block done">
            <div class="review-stat-label">今日已复习</div>
            <div class="review-stat-num">{{ todayReviewedCount }}</div>
            <div class="review-stat-sub">全部已复习 {{ totalCompletedReviewCount }}</div>
          </div>
        </div>
      </div>
    </button>

    <Teleport to="body">
      <Transition name="review-radar-pop">
        <div v-if="isReviewDialogOpen" class="review-radar-backdrop" @click="isReviewDialogOpen = false">
          <div class="review-radar-panel" @click.stop>
            <div class="review-panel-header">
              <div>
                <div class="review-panel-title">复习关系雷达</div>
                <div class="review-panel-subtitle">查看复习到期、完成与记忆表现的时间关系</div>
              </div>
              <button class="review-panel-close" @click="isReviewDialogOpen = false">✕</button>
            </div>

            <div class="review-range-tabs">
              <button
                v-for="option in reviewRangeOptions"
                :key="option.value"
                class="review-range-btn"
                :class="{ active: reviewRangeDays === option.value }"
                @click="reviewRangeDays = option.value"
              >
                {{ option.label }}
              </button>
            </div>

            <div class="review-chart-summary">
              <div><strong>{{ chartTotals.due }}</strong><span>到期复习</span></div>
              <div><strong>{{ chartTotals.reviewed }}</strong><span>已复习</span></div>
              <div><strong>{{ chartTotals.remembered }}</strong><span>记住</span></div>
              <div><strong>{{ chartTotals.forgotten }}</strong><span>忘记</span></div>
            </div>

            <div class="review-chart-card">
              <svg class="review-chart" viewBox="0 0 720 260" preserveAspectRatio="none">
                <line x1="40" y1="210" x2="690" y2="210" class="chart-axis" />
                <line x1="40" y1="28" x2="40" y2="210" class="chart-axis" />
                <polyline :points="dueTrendLine" class="trend-line due-line" />
                <polyline :points="reviewedTrendLine" class="trend-line reviewed-line" />
                <polyline :points="rememberedTrendLine" class="trend-line remembered-line" />
                <polyline :points="forgottenTrendLine" class="trend-line forgotten-line" />
                <g v-for="point in reviewTrendPoints" :key="point.key">
                  <circle :cx="point.x" :cy="point.dueY" r="3.5" class="trend-dot due-dot" />
                  <circle :cx="point.x" :cy="point.reviewedY" r="3.5" class="trend-dot reviewed-dot" />
                  <circle v-if="point.forgotten > 0" :cx="point.x" :cy="point.forgottenY" r="4" class="trend-dot forgotten-dot" />
                  <circle v-if="point.remembered > 0" :cx="point.x" :cy="point.rememberedY" r="4" class="trend-dot remembered-dot" />
                </g>
                <text v-for="label in chartLabels" :key="label.key" :x="label.x" y="238" class="chart-label">{{ label.text }}</text>
              </svg>
              <div class="chart-legend">
                <span><i class="due"></i>到期</span>
                <span><i class="reviewed"></i>已复习</span>
                <span><i class="remembered"></i>记住</span>
                <span><i class="forgotten"></i>忘记</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <div class="left-extra-card first-extra glass-card placeholder-shell">
      <div class="extra-card-header">
        <span class="extra-icon-placeholder"></span>
        <span class="extra-pill-placeholder"></span>
      </div>
      <div class="extra-line wide"></div>
      <div class="extra-line medium"></div>
      <div class="extra-line short"></div>
    </div>

    <div class="left-extra-card second-extra glass-card placeholder-shell">
      <div class="extra-card-header compact">
        <span class="extra-dot teal"></span>
        <span class="extra-dot amber"></span>
        <span class="extra-dot muted"></span>
      </div>
      <div class="extra-orb-row">
        <span class="extra-orb"></span>
        <span class="extra-bar-stack">
          <i></i>
          <i></i>
          <i></i>
        </span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTaskStore } from '@/stores/taskStore'

const store = useTaskStore()

const isReviewDialogOpen = ref(false)
const reviewRangeDays = ref(7)
const reviewRangeOptions = [
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 }
]

const todayPendingCount = computed(() => store.todayTasks.filter(task => task.kanban_col !== 'done').length)
const todayDoneCount = computed(() => store.todayTasks.filter(task => task.kanban_col === 'done').length)
const remainingPomodoros = computed(() => store.todayTasks.reduce((sum, task) => sum + (task.planned_pomodoros || 0), 0))

const startOfDay = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const dateKey = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const isReviewTask = (task: any) => Boolean(task.is_review || task.review_info || task.review_history?.length)
const todayKey = computed(() => dateKey())
const reviewTasks = computed(() => store.normalizedTaskList.filter(isReviewTask))
const todayReviewDueCount = computed(() => store.todayReviewTasks.length)
const totalReviewTaskCount = computed(() => reviewTasks.value.length)
const todayReviewedCount = computed(() => reviewTasks.value.filter(task =>
  (task.review_history || []).some(history => dateKey(history.reviewed_at) === todayKey.value)
).length)
const totalCompletedReviewCount = computed(() => reviewTasks.value.filter(task => task.review_info?.completed).length)

const reviewTrendData = computed(() => {
  const dayMs = 24 * 60 * 60 * 1000
  const todayStart = startOfDay()
  return Array.from({ length: reviewRangeDays.value }, (_, index) => {
    const timestamp = todayStart - (reviewRangeDays.value - 1 - index) * dayMs
    const key = dateKey(timestamp)
    const due = reviewTasks.value.filter(task => task.review_info?.next_review_date === key).length
    const histories = reviewTasks.value.flatMap(task => task.review_history || []).filter(history => dateKey(history.reviewed_at) === key)
    return {
      key,
      label: `${new Date(timestamp).getMonth() + 1}/${new Date(timestamp).getDate()}`,
      due,
      reviewed: histories.length,
      remembered: histories.filter(history => history.remembered).length,
      forgotten: histories.filter(history => !history.remembered).length
    }
  })
})

const chartTotals = computed(() => reviewTrendData.value.reduce((acc, item) => {
  acc.due += item.due
  acc.reviewed += item.reviewed
  acc.remembered += item.remembered
  acc.forgotten += item.forgotten
  return acc
}, { due: 0, reviewed: 0, remembered: 0, forgotten: 0 }))

const reviewTrendPoints = computed(() => {
  const maxValue = Math.max(1, ...reviewTrendData.value.flatMap(item => [item.due, item.reviewed, item.remembered, item.forgotten]))
  const chartWidth = 650
  const step = reviewTrendData.value.length > 1 ? chartWidth / (reviewTrendData.value.length - 1) : chartWidth
  const yOf = (value: number) => 210 - (value / maxValue) * 170
  return reviewTrendData.value.map((item, index) => ({
    ...item,
    x: 40 + index * step,
    dueY: yOf(item.due),
    reviewedY: yOf(item.reviewed),
    rememberedY: yOf(item.remembered),
    forgottenY: yOf(item.forgotten)
  }))
})

const buildTrendLine = (field: 'dueY' | 'reviewedY' | 'rememberedY' | 'forgottenY') =>
  reviewTrendPoints.value.map(point => `${point.x},${point[field]}`).join(' ')

const dueTrendLine = computed(() => buildTrendLine('dueY'))
const reviewedTrendLine = computed(() => buildTrendLine('reviewedY'))
const rememberedTrendLine = computed(() => buildTrendLine('rememberedY'))
const forgottenTrendLine = computed(() => buildTrendLine('forgottenY'))

const chartLabels = computed(() => reviewTrendPoints.value.filter((_, index) => {
  const interval = reviewRangeDays.value <= 7 ? 1 : reviewRangeDays.value <= 30 ? 5 : 15
  return index % interval === 0 || index === reviewTrendPoints.value.length - 1
}).map(point => ({ key: point.key, x: point.x, text: point.label })))
</script>

<style scoped>
.left-float-layer,
.placeholder-shell {
  pointer-events: none;
}

.left-overview-trigger {
  position: fixed;
  top: 92px;
  left: 24px;
  z-index: 1200;
  height: 44px;
  width: 160px;
  box-sizing: border-box;
  border: 1px solid rgba(74, 157, 154, 0.2);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--vcp-text-main, #3E3A36);
  box-shadow: 0 12px 28px rgba(62, 58, 54, 0.08);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 10px;
}

.today-stats-shell {
  gap: 6px;
}

.today-stat {
  flex: 1;
  min-width: 0;
  height: 30px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-weight: 900;
  line-height: 1;
}

.today-stat.danger {
  color: #E11D48;
  background: rgba(225, 29, 72, 0.08);
}

.today-stat.success {
  color: #059669;
  background: rgba(5, 150, 105, 0.09);
}

.today-stat.tomato {
  color: #D97706;
  background: linear-gradient(135deg, rgba(255, 237, 213, 0.9), rgba(254, 226, 226, 0.85));
}

.stat-value {
  font-size: 17px;
  letter-spacing: -0.04em;
}

.tomato-icon {
  font-size: 13px;
  filter: drop-shadow(0 2px 3px rgba(217, 119, 6, 0.18));
}

.glass-card {
  position: fixed !important;
  left: 24px !important;
  z-index: 900 !important;
  box-sizing: border-box;
  width: 160px;
  height: auto;
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 30px rgba(62, 58, 54, 0.08), 0 0 1px rgba(0, 0, 0, 0.05) inset;
  border-radius: 16px;
}

.left-radar-widget {
  top: 150px !important;
  height: 184px;
  min-height: 184px;
  padding: 14px;
  display: flex;
  flex-direction: column;
}

.review-radar-card {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid rgba(139, 92, 246, 0.12);
  color: var(--vcp-text-main, #3E3A36);
  cursor: pointer;
  pointer-events: auto;
  text-align: left;
  font: inherit;
  line-height: normal;
  overflow: hidden;
  transition: all 0.25s ease;
}

.review-radar-card:hover {
  transform: translateY(-3px);
  border-color: rgba(139, 92, 246, 0.28);
  background: rgba(255, 255, 255, 0.94) !important;
  box-shadow: 0 15px 35px rgba(139, 92, 246, 0.12), 0 0 1px rgba(0, 0, 0, 0.05) inset;
}

.review-card-title {
  font-size: 12px;
  font-weight: 800;
  color: #7C3AED;
  white-space: nowrap;
}

.review-radar-card:hover .widget-action-placeholder {
  opacity: 1;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.widget-title-placeholder {
  width: 16px;
  height: 16px;
  border-radius: 5px;
  background: linear-gradient(135deg, rgba(74, 157, 154, 0.48), rgba(74, 157, 154, 0.14));
}

.widget-action-placeholder {
  font-size: 12px;
  font-weight: bold;
  color: var(--color-primary, #4A9D9A);
  opacity: 0.42;
}

.widget-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.active-stats-grid {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.stat-block,
.review-stat-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.review-stat-label {
  font-size: 10px;
  color: var(--vcp-text-sub, #8C847A);
  font-weight: 800;
  margin-bottom: 3px;
}

.review-stat-num {
  font-size: 30px;
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.04em;
  margin-bottom: 4px;
}

.review-stat-block.pending .review-stat-num {
  color: #7C3AED;
}

.review-stat-block.done .review-stat-num {
  color: #059669;
}

.review-stat-sub {
  font-size: 9px;
  color: var(--vcp-text-sub, #8C847A);
  font-weight: 800;
  opacity: 0.72;
  line-height: 1.15;
}

.stat-divider {
  width: 60%;
  height: 1px;
  background: transparent;
  border-bottom: 1px dashed rgba(62, 58, 54, 0.2);
  margin: 2px 0;
}

.stat-num-placeholder {
  width: 42px;
  height: 32px;
  border-radius: 10px;
  margin-bottom: 6px;
}

.stat-num-placeholder.teal {
  background: rgba(74, 157, 154, 0.18);
}

.stat-num-placeholder.amber {
  background: rgba(205, 133, 63, 0.18);
}

.stat-label-placeholder {
  width: 76px;
  height: 11px;
  border-radius: 999px;
  background: rgba(62, 58, 54, 0.1);
}

.stat-label-placeholder.short {
  width: 68px;
}

.review-radar-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.38);
  pointer-events: auto;
}

.review-radar-panel {
  width: min(920px, calc(100vw - 64px));
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  box-shadow: 0 28px 70px rgba(62, 58, 54, 0.18);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 24px;
  box-sizing: border-box;
}

.review-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.review-panel-title {
  font-size: 20px;
  font-weight: 900;
  color: var(--vcp-text-main, #3E3A36);
}

.review-panel-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: var(--vcp-text-sub, #8C847A);
  font-weight: 700;
}

.review-panel-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 12px;
  background: var(--vcp-bg-column, #F5F4EE);
  color: var(--vcp-text-sub, #8C847A);
  cursor: pointer;
  font-size: 16px;
  font-weight: 900;
  transition: all 0.2s ease;
}

.review-panel-close:hover {
  background: #7C3AED;
  color: #fff;
}

.review-range-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.review-range-btn {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  background: rgba(62, 58, 54, 0.06);
  color: var(--vcp-text-sub, #8C847A);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s ease;
}

.review-range-btn.active,
.review-range-btn:hover {
  background: rgba(139, 92, 246, 0.14);
  color: #7C3AED;
}

.review-chart-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.review-chart-summary div {
  border-radius: 16px;
  background: rgba(245, 244, 238, 0.72);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.review-chart-summary strong {
  font-size: 24px;
  color: var(--vcp-text-main, #3E3A36);
  line-height: 1;
}

.review-chart-summary span {
  font-size: 11px;
  color: var(--vcp-text-sub, #8C847A);
  font-weight: 800;
}

.review-chart-card {
  border-radius: 20px;
  border: 1px solid rgba(62, 58, 54, 0.06);
  background: rgba(255, 255, 255, 0.72);
  padding: 18px;
}

.review-chart {
  width: 100%;
  height: 260px;
  overflow: visible;
}

.chart-axis {
  stroke: rgba(62, 58, 54, 0.14);
  stroke-width: 1;
}

.trend-line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 4px 8px rgba(62, 58, 54, 0.08));
}

.due-line { stroke: #8B5CF6; }
.reviewed-line { stroke: #059669; }
.remembered-line { stroke: #22C55E; stroke-width: 2; stroke-dasharray: 6 6; }
.forgotten-line { stroke: #E11D48; stroke-width: 2; stroke-dasharray: 4 7; }

.trend-dot {
  stroke: rgba(255, 255, 255, 0.92);
  stroke-width: 2;
}

.due-dot { fill: #8B5CF6; }
.reviewed-dot { fill: #059669; }
.remembered-dot { fill: #22C55E; }
.forgotten-dot { fill: #E11D48; }

.chart-label {
  fill: var(--vcp-text-sub, #8C847A);
  font-size: 10px;
  font-weight: 800;
  text-anchor: middle;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 12px;
  font-weight: 800;
}

.chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chart-legend i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.chart-legend .due { background: #8B5CF6; }
.chart-legend .reviewed { background: #059669; }
.chart-legend .remembered { background: #22C55E; }
.chart-legend .forgotten { background: #E11D48; }

.review-radar-pop-enter-active,
.review-radar-pop-leave-active { transition: opacity 0.2s ease; }
.review-radar-pop-enter-active .review-radar-panel,
.review-radar-pop-leave-active .review-radar-panel { transition: transform 0.2s ease, opacity 0.2s ease; }
.review-radar-pop-enter-from,
.review-radar-pop-leave-to { opacity: 0; }
.review-radar-pop-enter-from .review-radar-panel,
.review-radar-pop-leave-to .review-radar-panel { opacity: 0; transform: translateY(-10px) scale(0.98); }

.left-extra-card {
  height: 108px;
  min-height: 108px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.first-extra {
  top: 352px !important;
}

.second-extra {
  top: 478px !important;
}

.extra-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.extra-card-header.compact {
  justify-content: flex-start;
  gap: 7px;
  margin-bottom: 4px;
}

.extra-icon-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 9px;
  background: linear-gradient(135deg, rgba(74, 157, 154, 0.22), rgba(244, 63, 94, 0.12));
}

.extra-pill-placeholder {
  width: 48px;
  height: 18px;
  border-radius: 999px;
  background: rgba(62, 58, 54, 0.08);
}

.extra-icon-placeholder.soft {
  background: linear-gradient(135deg, rgba(205, 133, 63, 0.2), rgba(74, 157, 154, 0.12));
}

.extra-pill-placeholder.narrow {
  width: 36px;
}

.extra-line {
  height: 9px;
  border-radius: 999px;
  background: rgba(62, 58, 54, 0.08);
}

.extra-line.wide {
  width: 100%;
}

.extra-line.medium {
  width: 74%;
}

.extra-line.short {
  width: 48%;
}

.extra-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.extra-dot.teal {
  background: rgba(74, 157, 154, 0.58);
}

.extra-dot.amber {
  background: rgba(205, 133, 63, 0.42);
}

.extra-dot.muted {
  background: rgba(62, 58, 54, 0.16);
}

.extra-orb-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.extra-orb {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.92), rgba(74, 157, 154, 0.22));
  box-shadow: 0 8px 18px rgba(74, 157, 154, 0.12);
}

.extra-bar-stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.extra-bar-stack i {
  height: 7px;
  border-radius: 999px;
  background: rgba(62, 58, 54, 0.08);
}

.extra-bar-stack i:nth-child(2) {
  width: 76%;
}

.extra-bar-stack i:nth-child(3) {
  width: 52%;
}

.extra-grid-placeholder {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.extra-grid-placeholder span {
  height: 22px;
  border-radius: 8px;
  background: rgba(62, 58, 54, 0.07);
}

.extra-grid-placeholder span:nth-child(1),
.extra-grid-placeholder span:nth-child(4) {
  background: rgba(74, 157, 154, 0.1);
}

@media (max-width: 1280px) {
  .left-overview-trigger {
    top: 76px;
    left: 20px;
  }

  .glass-card {
    left: 20px !important;
  }
}
</style>
