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
                <div class="review-panel-title">复习效率总览</div>
                <div class="review-panel-subtitle">今日待复习 {{ todayReviewDueCount }} · 今日已复习 {{ todayReviewedCount }} · 最近 {{ reviewRangeDays }} 天完成 {{ reviewTrendTotals.reviewed }} 次</div>
              </div>
              <button class="review-panel-close" type="button" @click="isReviewDialogOpen = false">✕</button>
            </div>

            <div class="review-metric-strip">
              <div><strong>{{ todayReviewDueCount }}</strong><span>今日待复习</span></div>
              <div><strong>{{ todayReviewedCount }}</strong><span>今日已复习</span></div>
              <div><strong>{{ formatPercent(reviewRememberRate) }}</strong><span>记住率</span></div>
              <div><strong>{{ overdueReviewCount }}</strong><span>逾期数</span></div>
            </div>

            <div class="review-range-tabs">
              <button
                v-for="option in reviewRangeOptions"
                :key="option.value"
                type="button"
                class="review-range-btn"
                :class="{ active: reviewRangeDays === option.value }"
                @click="reviewRangeDays = option.value"
              >
                {{ option.label }}
              </button>
            </div>

            <div class="review-chart-card">
              <div class="review-chart-header">
                <div>
                  <div class="review-chart-title">复习趋势图</div>
                  <div class="review-chart-subtitle">柱形为已复习量，淡色柱为到期量，曲线为 3 点移动平均</div>
                </div>
                <div class="review-chart-stats">
                  <span>已复习 {{ reviewTrendTotals.reviewed }}</span>
                  <span>到期 {{ reviewTrendTotals.due }}</span>
                  <span>记住率 {{ formatPercent(reviewRememberRate) }}</span>
                </div>
              </div>
              <svg class="review-chart" viewBox="0 0 720 260" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="reviewDoneBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.62" />
                    <stop offset="100%" stop-color="#7C3AED" stop-opacity="0.2" />
                  </linearGradient>
                  <linearGradient id="reviewTrendGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#14B8A6" />
                    <stop offset="100%" stop-color="#7C3AED" />
                  </linearGradient>
                </defs>
                <g v-for="tick in reviewYAxisTicks" :key="tick.key">
                  <line x1="42" :y1="tick.y" x2="690" :y2="tick.y" class="review-grid-line" />
                  <text x="30" :y="tick.y + 4" class="review-y-label">{{ tick.label }}</text>
                </g>
                <line x1="42" y1="220" x2="690" y2="220" class="review-axis" />
                <line x1="42" y1="28" x2="42" y2="220" class="review-axis" />
                <g v-for="point in reviewTrendPoints" :key="point.key">
                  <rect class="review-due-bar" :x="point.dueBarX" :y="point.dueBarY" :width="point.barWidth" :height="point.dueBarHeight" rx="6">
                    <title>{{ point.label }} · 已复习 {{ point.reviewed }} · 到期 {{ point.due }} · 记住率 {{ formatPercent(point.rememberRate) }}</title>
                  </rect>
                  <rect class="review-done-bar" :x="point.doneBarX" :y="point.doneBarY" :width="point.barWidth" :height="point.doneBarHeight" rx="6">
                    <title>{{ point.label }} · 已复习 {{ point.reviewed }} · 到期 {{ point.due }} · 记住率 {{ formatPercent(point.rememberRate) }}</title>
                  </rect>
                  <text v-if="point.showLabel" :x="point.x" y="244" class="review-chart-label">{{ point.axisLabel }}</text>
                </g>
                <path :d="reviewTrendAreaPath" class="review-trend-area" />
                <path :d="reviewTrendLinePath" class="review-trend-line" />
                <circle
                  v-for="point in reviewTrendPoints"
                  :key="`${point.key}-review-hover`"
                  :cx="point.x"
                  :cy="point.trendY"
                  r="8"
                  class="review-hover-dot"
                >
                  <title>{{ point.label }} · 移动平均 {{ formatCompactNumber(point.trend) }} · 已复习 {{ point.reviewed }} · 到期 {{ point.due }}</title>
                </circle>
                <circle v-if="reviewLastPoint" :cx="reviewLastPoint.x" :cy="reviewLastPoint.trendY" r="5" class="review-last-dot" />
              </svg>
              <div class="review-chart-legend">
                <span><i class="done"></i>已复习</span>
                <span><i class="due"></i>到期复习</span>
                <span><i class="trend"></i>3 点移动平均</span>
              </div>
            </div>

            <div class="review-queue-card">
              <div class="review-queue-header">
                <span>复习任务队列</span>
                <span>点击任务打开编辑抽屉，总览窗口保持打开</span>
              </div>
              <div class="review-queue-tabs">
                <button
                  v-for="tab in reviewQueueTabs"
                  :key="tab.value"
                  type="button"
                  class="review-queue-tab"
                  :class="{ active: activeReviewQueueTab === tab.value }"
                  @click="activeReviewQueueTab = tab.value"
                >
                  {{ tab.label }} {{ reviewQueueCounts[tab.value] }}
                </button>
              </div>
              <div class="review-table-shell">
                <table class="review-task-table">
                  <thead>
                    <tr>
                      <th>任务标题</th>
                      <th>阶段</th>
                      <th>下次复习</th>
                      <th>复习次数</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="task in activeReviewQueue" :key="task.id" @click="openDetail(task.id)">
                      <td class="review-task-title">
                        <strong>{{ task.title || '未命名任务' }}</strong>
                        <span>{{ task.id }}</span>
                      </td>
                      <td><span class="review-soft-badge">第 {{ task.review_info?.stage ?? 0 }} 阶</span></td>
                      <td>{{ formatReviewDate(task.review_info?.next_review_date) }}</td>
                      <td>{{ task.review_history?.length || 0 }}</td>
                      <td><span class="review-status-badge" :class="reviewStatusClass(task)">{{ reviewStatusText(task) }}</span></td>
                    </tr>
                    <tr v-if="activeReviewQueue.length === 0">
                      <td colspan="5" class="review-empty-cell">当前队列没有任务</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Transition>
      <DetailDrawer :visible="isDrawerOpen" :task-id="selectedTaskId" @close="isDrawerOpen = false" />
    </Teleport>

    <button class="left-extra-card first-extra glass-card tomato-rate-card" type="button" @click="isTomatoDialogOpen = true">
      <div class="tomato-rate-header">
        <span>🍅 番茄速率</span>
        <span class="tomato-rate-unit">/ 天</span>
      </div>
      <div class="tomato-rate-grid">
        <div class="tomato-rate-item rose">
          <strong>{{ formatPomodoroRate(todayPomodoros) }}</strong>
          <span>今日番茄</span>
        </div>
        <div class="tomato-rate-item amber">
          <strong>{{ formatPomodoroRate(weekPomodoroRate) }}</strong>
          <span>周日均</span>
        </div>
        <div class="tomato-rate-item teal">
          <strong>{{ formatPomodoroRate(monthPomodoroRate) }}</strong>
          <span>月日均</span>
        </div>
        <div class="tomato-rate-item indigo">
          <strong>{{ formatPomodoroRate(quarterPomodoroRate) }}</strong>
          <span>季日均</span>
        </div>
      </div>
    </button>

    <Teleport to="body">
      <Transition name="tomato-overview-pop">
        <div v-if="isTomatoDialogOpen" class="tomato-overview-backdrop" @click="isTomatoDialogOpen = false">
          <div class="tomato-overview-panel" @click.stop>
            <div class="tomato-panel-header">
              <div>
                <div class="tomato-panel-title">番茄效率总览</div>
                <div class="tomato-panel-subtitle">今日完成 {{ formatPomodoroRate(todayPomodoros) }} 个番茄 · 最近 {{ tomatoRangeDays }} 天累计 {{ formatPomodoroRate(tomatoTrendTotals.total) }} 个番茄</div>
              </div>
              <button class="tomato-panel-close" type="button" @click="isTomatoDialogOpen = false">✕</button>
            </div>

            <div class="tomato-rate-strip">
              <div><strong>{{ formatPomodoroRate(todayPomodoros) }}</strong><span>今日番茄</span></div>
              <div><strong>{{ formatPomodoroRate(weekPomodoroRate) }}</strong><span>周日均</span></div>
              <div><strong>{{ formatPomodoroRate(monthPomodoroRate) }}</strong><span>月日均</span></div>
              <div><strong>{{ formatPomodoroRate(quarterPomodoroRate) }}</strong><span>季日均</span></div>
            </div>

            <div class="tomato-range-tabs">
              <button
                v-for="option in tomatoRangeOptions"
                :key="option.value"
                type="button"
                class="tomato-range-btn"
                :class="{ active: tomatoRangeDays === option.value }"
                @click="tomatoRangeDays = option.value"
              >
                {{ option.label }}
              </button>
            </div>

            <div class="tomato-chart-card">
              <div class="tomato-chart-header">
                <div>
                  <div class="tomato-chart-title">每日番茄趋势</div>
                  <div class="tomato-chart-subtitle">柱形为每日完成量，曲线为 3 日移动平均</div>
                </div>
                <div class="tomato-chart-stats">
                  <span>累计 {{ formatPomodoroRate(tomatoTrendTotals.total) }}</span>
                  <span>日均 {{ formatPomodoroRate(tomatoTrendTotals.average) }}</span>
                  <span>峰值 {{ formatPomodoroRate(tomatoTrendTotals.peak) }}</span>
                </div>
              </div>
              <svg class="tomato-trend-chart" viewBox="0 0 720 260" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="tomatoBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#F43F5E" stop-opacity="0.58" />
                    <stop offset="100%" stop-color="#F97316" stop-opacity="0.18" />
                  </linearGradient>
                  <linearGradient id="tomatoLineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#F97316" />
                    <stop offset="100%" stop-color="#E11D48" />
                  </linearGradient>
                </defs>
                <g v-for="tick in tomatoYAxisTicks" :key="tick.key">
                  <line x1="42" :y1="tick.y" x2="690" :y2="tick.y" class="tomato-grid-line" />
                  <text x="30" :y="tick.y + 4" class="tomato-y-label">{{ tick.label }}</text>
                </g>
                <line x1="42" y1="220" x2="690" y2="220" class="tomato-axis" />
                <line x1="42" y1="28" x2="42" y2="220" class="tomato-axis" />
                <g v-for="point in tomatoTrendPoints" :key="point.key">
                  <rect
                    class="tomato-bar"
                    :x="point.barX"
                    :y="point.barY"
                    :width="point.barWidth"
                    :height="point.barHeight"
                    rx="6"
                  >
                    <title>{{ point.label }} · {{ formatPomodoroRate(point.value) }} 番茄</title>
                  </rect>
                  <text v-if="point.showLabel" :x="point.x" y="244" class="tomato-chart-label">{{ point.axisLabel }}</text>
                </g>
                <path :d="tomatoTrendAreaPath" class="tomato-trend-area" />
                <path :d="tomatoTrendLinePath" class="tomato-trend-line" />
                <circle
                  v-for="point in tomatoTrendPoints"
                  :key="`${point.key}-trend-dot`"
                  :cx="point.x"
                  :cy="point.trendY"
                  r="8"
                  class="tomato-hover-dot"
                >
                  <title>{{ point.label }} · {{ formatPomodoroRate(point.trend) }} 番茄</title>
                </circle>
                <circle v-if="tomatoLastPoint" :cx="tomatoLastPoint.x" :cy="tomatoLastPoint.trendY" r="5" class="tomato-last-dot" />
              </svg>
            </div>

            <div class="tomato-contrib-card">
              <div class="tomato-contrib-header">
                <span>任务贡献榜</span>
                <span>按当前范围内已完成番茄排序</span>
              </div>
              <div class="tomato-contrib-list">
                <div v-for="task in tomatoTopTasks" :key="task.id" class="tomato-contrib-row">
                  <div>
                    <strong>{{ task.title || '未命名任务' }}</strong>
                    <span>{{ periodName(task.period) }} · {{ formatDate(task.completed_at || task.updated_at || task.created_at) }}</span>
                  </div>
                  <em>🍅 {{ formatPomodoroRate(task.actual_pomodoros || 0) }}</em>
                </div>
                <div v-if="tomatoTopTasks.length === 0" class="tomato-contrib-empty">当前范围还没有已完成番茄记录</div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
import DetailDrawer from './DetailDrawer.vue'
import { useTaskStore } from '@/stores/taskStore'
import type { ITaskItem } from '@/types/task'

const store = useTaskStore()

const isReviewDialogOpen = ref(false)
const isTomatoDialogOpen = ref(false)
const isDrawerOpen = ref(false)
const selectedTaskId = ref<string | null>(null)
const reviewRangeDays = ref(7)
const reviewRangeOptions = [
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 },
  { label: '半年', value: 183 },
  { label: '一年', value: 365 },
  { label: '三年', value: 1095 }
]
const activeReviewQueueTab = ref<ReviewQueueTab>('today')
const tomatoRangeDays = ref(7)
const tomatoRangeOptions = [
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 },
  { label: '半年', value: 183 },
  { label: '一年', value: 365 },
  { label: '三年', value: 1095 }
]

const DAY_MS = 24 * 60 * 60 * 1000

const todayPendingCount = computed(() => store.todayTasks.filter(task => task.kanban_col !== 'done').length)
const todayDoneCount = computed(() => store.todayTasks.filter(task => task.kanban_col === 'done').length)
const remainingPomodoros = computed(() => Math.max(0, store.todayTasks.reduce((sum, task) => sum + (task.planned_pomodoros || 0) - (task.actual_pomodoros || 0), 0)))

const startOfDay = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const startOfWeek = (timestamp = Date.now()) => {
  const date = new Date(startOfDay(timestamp))
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date.getTime()
}

const startOfMonth = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
}

const startOfQuarter = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), quarterStartMonth, 1).getTime()
}

const elapsedDaysFrom = (startTimestamp: number) => Math.max(1, Math.floor((startOfDay() - startTimestamp) / DAY_MS) + 1)

const completedTasks = computed(() => store.normalizedTaskList.filter(task => task.kanban_col === 'done'))
const sumPomodorosFrom = (startTimestamp: number, endTimestamp = Date.now()) => completedTasks.value
  .filter(task => {
    const timestamp = task.completed_at || task.updated_at || task.created_at
    return timestamp >= startTimestamp && timestamp <= endTimestamp
  })
  .reduce((sum, task) => sum + (task.actual_pomodoros || 0), 0)

const todayPomodoros = computed(() => sumPomodorosFrom(startOfDay()))
const weekPomodoroRate = computed(() => sumPomodorosFrom(startOfWeek()) / elapsedDaysFrom(startOfWeek()))
const monthPomodoroRate = computed(() => sumPomodorosFrom(startOfMonth()) / elapsedDaysFrom(startOfMonth()))
const quarterPomodoroRate = computed(() => sumPomodorosFrom(startOfQuarter()) / elapsedDaysFrom(startOfQuarter()))
const formatPomodoroRate = (value: number) => {
  const normalized = Number(value) || 0
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(2)
}

type TomatoBucketUnit = 'day' | 'week' | 'month'

const addMonths = (timestamp: number, months: number) => {
  const date = new Date(timestamp)
  date.setMonth(date.getMonth() + months)
  return date.getTime()
}

const tomatoBucketUnit = computed<TomatoBucketUnit>(() => {
  if (tomatoRangeDays.value <= 30) return 'day'
  if (tomatoRangeDays.value <= 183) return 'week'
  return 'month'
})

const formatTomatoBucketLabel = (start: number, end: number, unit: TomatoBucketUnit) => {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (unit === 'month') return `${startDate.getFullYear()}/${startDate.getMonth() + 1}`
  if (unit === 'week') return `${startDate.getMonth() + 1}/${startDate.getDate()}-${endDate.getMonth() + 1}/${endDate.getDate()}`
  return `${startDate.getMonth() + 1}/${startDate.getDate()}`
}

const formatTomatoAxisLabel = (start: number, unit: TomatoBucketUnit) => {
  const date = new Date(start)
  if (unit === 'month') return `${date.getFullYear()}/${date.getMonth() + 1}`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const tomatoTrendData = computed(() => {
  const todayStart = startOfDay()
  const rangeStart = todayStart - (tomatoRangeDays.value - 1) * DAY_MS
  const unit = tomatoBucketUnit.value
  const buckets: { key: string; label: string; axisLabel: string; start: number; end: number; value: number }[] = []

  if (unit === 'day') {
    for (let cursor = rangeStart; cursor <= todayStart; cursor += DAY_MS) {
      const end = cursor + DAY_MS - 1
      buckets.push({
        key: dateKey(cursor),
        label: formatTomatoBucketLabel(cursor, end, unit),
        axisLabel: formatTomatoAxisLabel(cursor, unit),
        start: cursor,
        end,
        value: sumPomodorosFrom(cursor, end)
      })
    }
    return buckets
  }

  if (unit === 'week') {
    for (let cursor = rangeStart; cursor <= todayStart; cursor += 7 * DAY_MS) {
      const end = Math.min(cursor + 7 * DAY_MS - 1, Date.now())
      buckets.push({
        key: `${dateKey(cursor)}-${dateKey(end)}`,
        label: formatTomatoBucketLabel(cursor, end, unit),
        axisLabel: formatTomatoAxisLabel(cursor, unit),
        start: cursor,
        end,
        value: sumPomodorosFrom(cursor, end)
      })
    }
    return buckets
  }

  for (let cursor = rangeStart; cursor <= todayStart;) {
    const next = addMonths(cursor, 1)
    const end = Math.min(next - 1, Date.now())
    buckets.push({
      key: `${new Date(cursor).getFullYear()}-${new Date(cursor).getMonth() + 1}`,
      label: formatTomatoBucketLabel(cursor, end, unit),
      axisLabel: formatTomatoAxisLabel(cursor, unit),
      start: cursor,
      end,
      value: sumPomodorosFrom(cursor, end)
    })
    cursor = next
  }
  return buckets
})

const tomatoTrendTotals = computed(() => {
  const total = tomatoTrendData.value.reduce((sum, item) => sum + item.value, 0)
  const peak = Math.max(0, ...tomatoTrendData.value.map(item => item.value))
  return {
    total,
    peak,
    average: tomatoTrendData.value.length ? total / tomatoTrendData.value.length : 0
  }
})

const tomatoChartMaxValue = computed(() => Math.max(1, ...tomatoTrendData.value.flatMap((item, index) => {
  const trendWindow = tomatoTrendData.value.slice(Math.max(0, index - 2), index + 1)
  const trend = trendWindow.reduce((sum, point) => sum + point.value, 0) / trendWindow.length
  return [item.value, trend]
})))

const tomatoYAxisTicks = computed(() => {
  const max = tomatoChartMaxValue.value
  return [1, 0.75, 0.5, 0.25, 0].map(ratio => {
    const value = max * ratio
    return {
      key: ratio,
      value,
      label: formatPomodoroRate(value),
      y: 220 - ratio * 176
    }
  })
})

const tomatoTrendPoints = computed(() => {
  const width = 648
  const left = 42
  const baseY = 220
  const chartHeight = 176
  const length = tomatoTrendData.value.length
  const maxValue = tomatoChartMaxValue.value
  const step = length > 1 ? width / (length - 1) : width
  const barWidth = Math.max(4, Math.min(28, step * 0.48))
  const labelInterval = Math.max(1, Math.ceil(length / 8))

  return tomatoTrendData.value.map((item, index) => {
    const trendWindow = tomatoTrendData.value.slice(Math.max(0, index - 2), index + 1)
    const trend = trendWindow.reduce((sum, point) => sum + point.value, 0) / trendWindow.length
    const x = left + index * step
    const barHeight = Math.max(item.value > 0 ? 4 : 0, (item.value / maxValue) * chartHeight)
    const trendY = baseY - (trend / maxValue) * chartHeight
    return {
      ...item,
      x,
      trend,
      trendY,
      barWidth,
      barX: x - barWidth / 2,
      barY: baseY - barHeight,
      barHeight,
      showLabel: index % labelInterval === 0 || index === length - 1
    }
  })
})

const tomatoTrendLinePath = computed(() => {
  const points = tomatoTrendPoints.value
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x},${points[0].trendY}`
  let path = `M ${points[0].x},${points[0].trendY}`
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]
    const curr = points[index]
    const midX = (prev.x + curr.x) / 2
    path += ` C ${midX},${prev.trendY} ${midX},${curr.trendY} ${curr.x},${curr.trendY}`
  }
  return path
})

const tomatoTrendAreaPath = computed(() => tomatoTrendLinePath.value ? `${tomatoTrendLinePath.value} L 690,220 L 42,220 Z` : '')
const tomatoLastPoint = computed(() => tomatoTrendPoints.value[tomatoTrendPoints.value.length - 1] || null)

const tomatoTopTasks = computed(() => {
  const start = startOfDay() - (tomatoRangeDays.value - 1) * DAY_MS
  const end = Date.now()
  return completedTasks.value
    .filter(task => {
      const timestamp = task.completed_at || task.updated_at || task.created_at
      return timestamp >= start && timestamp <= end && (task.actual_pomodoros || 0) > 0
    })
    .sort((a, b) => (b.actual_pomodoros || 0) - (a.actual_pomodoros || 0))
    .slice(0, 8)
})

const formatDate = (timestamp?: number | null) => {
  if (!timestamp) return '未记录'
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const periodName = (period: string) => ({
  daily: '今日',
  short_term: '短期',
  long_term: '长期',
  routine: '常驻'
}[period] || period)

const dateKey = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const isReviewTask = (task: ITaskItem) => Boolean(task.is_review || task.review_info || task.review_history?.length)
type ReviewBucketUnit = 'day' | 'week' | 'month'
type ReviewQueueTab = 'today' | 'overdue' | 'recent' | 'weak'

const reviewQueueTabs: { label: string; value: ReviewQueueTab }[] = [
  { label: '今日应复习', value: 'today' },
  { label: '已逾期', value: 'overdue' },
  { label: '最近已复习', value: 'recent' },
  { label: '记忆薄弱', value: 'weak' }
]

const todayKey = computed(() => dateKey())
const reviewTasks = computed(() => store.normalizedTaskList.filter(isReviewTask))
const activeReviewTasks = computed(() => reviewTasks.value.filter(task => task.is_review && !task.review_info?.completed))
const todayReviewDueCount = computed(() => store.todayReviewTasks.length)
const totalReviewTaskCount = computed(() => reviewTasks.value.length)
const todayReviewedCount = computed(() => reviewTasks.value.filter(task =>
  (task.review_history || []).some(history => dateKey(history.reviewed_at) === todayKey.value)
).length)
const totalCompletedReviewCount = computed(() => reviewTasks.value.filter(task => task.review_info?.completed).length)
const overdueReviewCount = computed(() => activeReviewTasks.value.filter(task => Boolean(task.review_info?.next_review_date && task.review_info.next_review_date < todayKey.value)).length)

const reviewBucketUnit = computed<ReviewBucketUnit>(() => {
  if (reviewRangeDays.value <= 30) return 'day'
  if (reviewRangeDays.value <= 183) return 'week'
  return 'month'
})

const formatReviewBucketLabel = (start: number, end: number, unit: ReviewBucketUnit) => {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (unit === 'month') return `${startDate.getFullYear()}/${startDate.getMonth() + 1}`
  if (unit === 'week') return `${startDate.getMonth() + 1}/${startDate.getDate()}-${endDate.getMonth() + 1}/${endDate.getDate()}`
  return `${startDate.getMonth() + 1}/${startDate.getDate()}`
}

const formatReviewAxisLabel = (start: number, unit: ReviewBucketUnit) => {
  const date = new Date(start)
  if (unit === 'month') return `${date.getFullYear()}/${date.getMonth() + 1}`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const reviewHistoriesInRange = (start: number, end: number) => reviewTasks.value.flatMap(task => task.review_history || [])
  .filter(history => history.reviewed_at >= start && history.reviewed_at <= end)

const dueReviewsInRange = (start: number, end: number) => {
  const startKey = dateKey(start)
  const endKey = dateKey(end)
  return activeReviewTasks.value.filter(task => {
    const nextDate = task.review_info?.next_review_date
    return Boolean(nextDate && nextDate >= startKey && nextDate <= endKey)
  }).length
}

const reviewTrendData = computed(() => {
  const todayStart = startOfDay()
  const rangeStart = todayStart - (reviewRangeDays.value - 1) * DAY_MS
  const unit = reviewBucketUnit.value
  const buckets: { key: string; label: string; axisLabel: string; start: number; end: number; due: number; reviewed: number; remembered: number; forgotten: number; rememberRate: number }[] = []

  const pushBucket = (start: number, end: number) => {
    const histories = reviewHistoriesInRange(start, end)
    const remembered = histories.filter(history => history.remembered).length
    const reviewed = histories.length
    buckets.push({
      key: `${dateKey(start)}-${dateKey(end)}`,
      label: formatReviewBucketLabel(start, end, unit),
      axisLabel: formatReviewAxisLabel(start, unit),
      start,
      end,
      due: dueReviewsInRange(start, end),
      reviewed,
      remembered,
      forgotten: histories.filter(history => !history.remembered).length,
      rememberRate: reviewed ? remembered / reviewed : 0
    })
  }

  if (unit === 'day') {
    for (let cursor = rangeStart; cursor <= todayStart; cursor += DAY_MS) pushBucket(cursor, cursor + DAY_MS - 1)
    return buckets
  }

  if (unit === 'week') {
    for (let cursor = rangeStart; cursor <= todayStart; cursor += 7 * DAY_MS) pushBucket(cursor, Math.min(cursor + 7 * DAY_MS - 1, Date.now()))
    return buckets
  }

  for (let cursor = rangeStart; cursor <= todayStart;) {
    const next = addMonths(cursor, 1)
    pushBucket(cursor, Math.min(next - 1, Date.now()))
    cursor = next
  }
  return buckets
})

const reviewTrendTotals = computed(() => reviewTrendData.value.reduce((acc, item) => {
  acc.due += item.due
  acc.reviewed += item.reviewed
  acc.remembered += item.remembered
  acc.forgotten += item.forgotten
  return acc
}, { due: 0, reviewed: 0, remembered: 0, forgotten: 0 }))

const reviewRememberRate = computed(() => reviewTrendTotals.value.reviewed ? reviewTrendTotals.value.remembered / reviewTrendTotals.value.reviewed : 0)
const formatPercent = (value: number) => `${Math.round((Number(value) || 0) * 100)}%`
const formatCompactNumber = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1)

const reviewChartMaxValue = computed(() => Math.max(1, ...reviewTrendData.value.flatMap((item, index) => {
  const trendWindow = reviewTrendData.value.slice(Math.max(0, index - 2), index + 1)
  const trend = trendWindow.reduce((sum, point) => sum + point.reviewed, 0) / trendWindow.length
  return [item.due, item.reviewed, trend]
})))

const reviewYAxisTicks = computed(() => [1, 0.75, 0.5, 0.25, 0].map(ratio => ({
  key: ratio,
  label: formatCompactNumber(reviewChartMaxValue.value * ratio),
  y: 220 - ratio * 176
})))

const reviewTrendPoints = computed(() => {
  const width = 648
  const left = 42
  const baseY = 220
  const chartHeight = 176
  const length = reviewTrendData.value.length
  const maxValue = reviewChartMaxValue.value
  const step = length > 1 ? width / (length - 1) : width
  const barWidth = Math.max(4, Math.min(22, step * 0.28))
  const labelInterval = Math.max(1, Math.ceil(length / 8))

  return reviewTrendData.value.map((item, index) => {
    const trendWindow = reviewTrendData.value.slice(Math.max(0, index - 2), index + 1)
    const trend = trendWindow.reduce((sum, point) => sum + point.reviewed, 0) / trendWindow.length
    const x = left + index * step
    const dueBarHeight = Math.max(item.due > 0 ? 4 : 0, (item.due / maxValue) * chartHeight)
    const doneBarHeight = Math.max(item.reviewed > 0 ? 4 : 0, (item.reviewed / maxValue) * chartHeight)
    return {
      ...item,
      x,
      trend,
      trendY: baseY - (trend / maxValue) * chartHeight,
      barWidth,
      dueBarX: x - barWidth - 2,
      dueBarY: baseY - dueBarHeight,
      dueBarHeight,
      doneBarX: x + 2,
      doneBarY: baseY - doneBarHeight,
      doneBarHeight,
      showLabel: index % labelInterval === 0 || index === length - 1
    }
  })
})

const reviewTrendLinePath = computed(() => {
  const points = reviewTrendPoints.value
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x},${points[0].trendY}`
  let path = `M ${points[0].x},${points[0].trendY}`
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1]
    const curr = points[index]
    const midX = (prev.x + curr.x) / 2
    path += ` C ${midX},${prev.trendY} ${midX},${curr.trendY} ${curr.x},${curr.trendY}`
  }
  return path
})

const reviewTrendAreaPath = computed(() => reviewTrendLinePath.value ? `${reviewTrendLinePath.value} L 690,220 L 42,220 Z` : '')
const reviewLastPoint = computed(() => reviewTrendPoints.value[reviewTrendPoints.value.length - 1] || null)

const latestReviewAt = (task: ITaskItem) => Math.max(0, ...(task.review_history || []).map(history => history.reviewed_at || 0))
const latestForgottenAt = (task: ITaskItem) => Math.max(0, ...(task.review_history || []).filter(history => !history.remembered).map(history => history.reviewed_at || 0))
const reviewQueueCounts = computed<Record<ReviewQueueTab, number>>(() => ({
  today: store.todayReviewTasks.length,
  overdue: overdueReviewCount.value,
  recent: reviewTasks.value.filter(task => latestReviewAt(task) > 0).length,
  weak: reviewTasks.value.filter(task => latestForgottenAt(task) > 0).length
}))

const activeReviewQueue = computed(() => {
  const tab = activeReviewQueueTab.value
  if (tab === 'today') return [...store.todayReviewTasks].sort(compareReviewQueueTasks).slice(0, 80)
  if (tab === 'overdue') return activeReviewTasks.value.filter(task => Boolean(task.review_info?.next_review_date && task.review_info.next_review_date < todayKey.value)).sort(compareReviewQueueTasks).slice(0, 80)
  if (tab === 'weak') return reviewTasks.value.filter(task => latestForgottenAt(task) > 0).sort((a, b) => latestForgottenAt(b) - latestForgottenAt(a)).slice(0, 80)
  return reviewTasks.value.filter(task => latestReviewAt(task) > 0).sort((a, b) => latestReviewAt(b) - latestReviewAt(a)).slice(0, 80)
})

function compareReviewQueueTasks(a: ITaskItem, b: ITaskItem) {
  return String(a.review_info?.next_review_date || '9999-99-99').localeCompare(String(b.review_info?.next_review_date || '9999-99-99'))
}

const formatReviewDate = (value?: string | null) => {
  if (!value) return '未设置'
  const [, month, day] = value.split('-')
  return month && day ? `${Number(month)}/${Number(day)}` : value
}

const reviewStatusText = (task: ITaskItem) => {
  if (task.review_info?.completed) return '已完成'
  if (task.review_info?.next_review_date && task.review_info.next_review_date < todayKey.value) return '已逾期'
  if (task.review_info?.next_review_date === todayKey.value) return '今日到期'
  if (latestForgottenAt(task) > 0 && activeReviewQueueTab.value === 'weak') return '薄弱'
  return '待复习'
}

const reviewStatusClass = (task: ITaskItem) => {
  if (task.review_info?.completed) return 'done'
  if (task.review_info?.next_review_date && task.review_info.next_review_date < todayKey.value) return 'overdue'
  if (task.review_info?.next_review_date === todayKey.value) return 'today'
  if (latestForgottenAt(task) > 0 && activeReviewQueueTab.value === 'weak') return 'weak'
  return 'pending'
}

const openDetail = (taskId: string) => {
  selectedTaskId.value = null
  requestAnimationFrame(() => {
    selectedTaskId.value = taskId
    isDrawerOpen.value = true
  })
}
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
  width: min(1080px, calc(100vw - 64px));
  max-height: min(860px, calc(100vh - 64px));
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 26px;
  box-shadow: 0 28px 70px rgba(62, 58, 54, 0.18);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 24px;
  box-sizing: border-box;
  overflow: auto;
}

.review-panel-header,
.review-chart-header,
.review-queue-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.review-panel-title {
  font-size: 22px;
  font-weight: 950;
  color: var(--vcp-text-main, #3E3A36);
  letter-spacing: -0.04em;
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

.review-metric-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.review-metric-strip div {
  height: 74px;
  border-radius: 18px;
  background: rgba(245, 244, 238, 0.72);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.review-metric-strip strong {
  font-size: 26px;
  color: #7C3AED;
  line-height: 1;
}

.review-metric-strip span,
.review-chart-subtitle,
.review-queue-header span:last-child {
  color: var(--vcp-text-sub, #8C847A);
  font-size: 11px;
  font-weight: 900;
}

.review-chart-card,
.review-queue-card {
  border-radius: 20px;
  border: 1px solid rgba(62, 58, 54, 0.06);
  background: rgba(255, 255, 255, 0.72);
  padding: 18px;
}

.review-chart-card {
  margin-bottom: 16px;
}

.review-chart-title,
.review-queue-header span:first-child {
  font-size: 15px;
  font-weight: 950;
  color: var(--vcp-text-main, #3E3A36);
}

.review-chart-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  color: #7C3AED;
  font-size: 11px;
  font-weight: 900;
}

.review-chart-stats span {
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.09);
}

.review-chart {
  width: 100%;
  height: 260px;
  margin-top: 12px;
  overflow: visible;
}

.review-axis {
  stroke: rgba(62, 58, 54, 0.14);
  stroke-width: 1;
}

.review-grid-line {
  stroke: rgba(62, 58, 54, 0.07);
  stroke-width: 1;
  stroke-dasharray: 4 8;
}

.review-y-label,
.review-chart-label {
  fill: var(--vcp-text-sub, #8C847A);
  font-size: 10px;
  font-weight: 800;
  text-anchor: middle;
}

.review-y-label {
  text-anchor: end;
  opacity: 0.78;
}

.review-due-bar {
  fill: rgba(139, 92, 246, 0.14);
}

.review-done-bar {
  fill: url(#reviewDoneBarGradient);
}

.review-trend-area {
  fill: rgba(20, 184, 166, 0.08);
}

.review-trend-line {
  fill: none;
  stroke: url(#reviewTrendGradient);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 6px 10px rgba(124, 58, 237, 0.14));
}

.review-hover-dot {
  fill: transparent;
  stroke: transparent;
  pointer-events: all;
}

.review-last-dot {
  fill: #fff;
  stroke: #7C3AED;
  stroke-width: 3;
  pointer-events: none;
  filter: drop-shadow(0 4px 8px rgba(124, 58, 237, 0.18));
}

.review-chart-legend,
.review-queue-tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 12px;
  font-weight: 800;
}

.review-chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.review-chart-legend i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.review-chart-legend .done { background: #7C3AED; }
.review-chart-legend .due { background: rgba(139, 92, 246, 0.28); }
.review-chart-legend .trend { background: #14B8A6; }

.review-queue-header {
  margin-bottom: 12px;
}

.review-queue-tab {
  border: none;
  border-radius: 999px;
  padding: 7px 13px;
  background: rgba(62, 58, 54, 0.06);
  color: var(--vcp-text-sub, #8C847A);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  transition: all 0.2s ease;
}

.review-queue-tab.active,
.review-queue-tab:hover {
  background: rgba(139, 92, 246, 0.14);
  color: #7C3AED;
}

.review-table-shell {
  max-height: 240px;
  overflow: auto;
  margin-top: 12px;
  border-radius: 16px;
  border: 1px solid rgba(62, 58, 54, 0.06);
  background: rgba(255, 255, 255, 0.58);
}

.review-task-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
}

.review-task-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(248, 247, 242, 0.96);
  color: var(--vcp-text-sub, #8C847A);
  font-size: 12px;
  text-align: left;
  padding: 11px 13px;
  white-space: nowrap;
}

.review-task-table td {
  padding: 12px 13px;
  border-top: 1px solid rgba(62, 58, 54, 0.06);
  color: var(--vcp-text-main, #3E3A36);
  font-size: 13px;
  vertical-align: middle;
}

.review-task-table tbody tr {
  cursor: pointer;
  transition: background 0.16s ease;
}

.review-task-table tbody tr:hover {
  background: rgba(139, 92, 246, 0.06);
}

.review-task-title strong {
  display: block;
  font-weight: 900;
  line-height: 1.35;
}

.review-task-title span {
  display: block;
  margin-top: 4px;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 11px;
  opacity: 0.72;
}

.review-soft-badge,
.review-status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
}

.review-soft-badge { background: rgba(62, 58, 54, 0.06); color: var(--vcp-text-sub, #8C847A); }
.review-status-badge.today { background: rgba(139, 92, 246, 0.12); color: #7C3AED; }
.review-status-badge.overdue { background: #FFF1F2; color: #E11D48; }
.review-status-badge.done { background: #ECFDF5; color: #059669; }
.review-status-badge.weak { background: #FEF3C7; color: #D97706; }
.review-status-badge.pending { background: #EFF6FF; color: #2563EB; }

.review-empty-cell {
  text-align: center;
  padding: 32px;
  color: var(--vcp-text-sub, #8C847A) !important;
  font-weight: 800;
}

:deep(.drawer-overlay) { pointer-events: auto; z-index: 11000; }

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
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.first-extra {
  top: 352px !important;
}

.second-extra {
  top: 478px !important;
}

.tomato-rate-card {
  appearance: none;
  -webkit-appearance: none;
  border-color: rgba(244, 63, 94, 0.12) !important;
  color: var(--vcp-text-main, #3E3A36);
  cursor: pointer;
  pointer-events: auto;
  overflow: hidden;
  text-align: left;
  font: inherit;
  transition: all 0.25s ease;
}

.tomato-rate-card:hover {
  transform: translateY(-3px);
  border-color: rgba(244, 63, 94, 0.28) !important;
  background: rgba(255, 255, 255, 0.94) !important;
  box-shadow: 0 15px 35px rgba(244, 63, 94, 0.12), 0 0 1px rgba(0, 0, 0, 0.05) inset;
}

.tomato-rate-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
  font-size: 11px;
  line-height: 1;
  font-weight: 900;
  color: #E11D48;
  white-space: nowrap;
}

.tomato-rate-unit {
  color: var(--vcp-text-sub, #8C847A);
  font-size: 10px;
  font-weight: 900;
  opacity: 0.72;
}

.tomato-rate-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 7px;
}

.tomato-rate-item {
  min-width: 0;
  height: 32px;
  border-radius: 11px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.tomato-rate-item strong {
  font-size: 15px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.05em;
}

.tomato-rate-item span {
  font-size: 8px;
  line-height: 1;
  font-weight: 900;
  color: var(--vcp-text-sub, #8C847A);
  white-space: nowrap;
}

.tomato-rate-item.rose { background: rgba(244, 63, 94, 0.09); color: #E11D48; }
.tomato-rate-item.amber { background: rgba(245, 158, 11, 0.1); color: #D97706; }
.tomato-rate-item.teal { background: rgba(20, 184, 166, 0.1); color: #0F766E; }
.tomato-rate-item.indigo { background: rgba(99, 102, 241, 0.1); color: #4F46E5; }

.tomato-overview-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10030;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.36);
  pointer-events: auto;
}

.tomato-overview-panel {
  width: min(1080px, calc(100vw - 64px));
  max-height: min(860px, calc(100vh - 64px));
  display: flex;
  flex-direction: column;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 28px 70px rgba(62, 58, 54, 0.18);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  padding: 24px;
  box-sizing: border-box;
  overflow: auto;
}

.tomato-panel-header,
.tomato-chart-header,
.tomato-contrib-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.tomato-panel-header { margin-bottom: 18px; }

.tomato-panel-title {
  font-size: 22px;
  font-weight: 950;
  color: var(--vcp-text-main, #3E3A36);
  letter-spacing: -0.04em;
}

.tomato-panel-subtitle,
.tomato-chart-subtitle,
.tomato-contrib-header span:last-child {
  margin-top: 6px;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 12px;
  font-weight: 800;
}

.tomato-panel-close {
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

.tomato-panel-close:hover {
  background: #E11D48;
  color: #fff;
}

.tomato-rate-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.tomato-rate-strip div {
  height: 74px;
  border-radius: 18px;
  background: rgba(245, 244, 238, 0.72);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.tomato-rate-strip strong {
  font-size: 26px;
  color: #E11D48;
  line-height: 1;
}

.tomato-rate-strip span {
  font-size: 11px;
  font-weight: 900;
  color: var(--vcp-text-sub, #8C847A);
}

.tomato-range-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tomato-range-btn {
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

.tomato-range-btn.active,
.tomato-range-btn:hover {
  background: rgba(244, 63, 94, 0.13);
  color: #E11D48;
}

.tomato-chart-card,
.tomato-contrib-card {
  border-radius: 20px;
  border: 1px solid rgba(62, 58, 54, 0.06);
  background: rgba(255, 255, 255, 0.72);
  padding: 18px;
}

.tomato-chart-card { margin-bottom: 16px; }

.tomato-chart-title,
.tomato-contrib-header span:first-child {
  font-size: 15px;
  font-weight: 950;
  color: var(--vcp-text-main, #3E3A36);
}

.tomato-chart-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  color: #E11D48;
  font-size: 11px;
  font-weight: 900;
}

.tomato-chart-stats span {
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(244, 63, 94, 0.08);
}

.tomato-trend-chart {
  width: 100%;
  height: 260px;
  margin-top: 12px;
  overflow: visible;
}

.tomato-axis {
  stroke: rgba(62, 58, 54, 0.14);
  stroke-width: 1;
}

.tomato-grid-line {
  stroke: rgba(62, 58, 54, 0.07);
  stroke-width: 1;
  stroke-dasharray: 4 8;
}

.tomato-y-label {
  fill: var(--vcp-text-sub, #8C847A);
  font-size: 10px;
  font-weight: 800;
  text-anchor: end;
  opacity: 0.78;
}

.tomato-bar {
  fill: url(#tomatoBarGradient);
}

.tomato-trend-area {
  fill: rgba(244, 63, 94, 0.08);
}

.tomato-trend-line {
  fill: none;
  stroke: url(#tomatoLineGradient);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 6px 10px rgba(225, 29, 72, 0.14));
}

.tomato-hover-dot {
  fill: transparent;
  stroke: transparent;
  pointer-events: all;
}

.tomato-last-dot {
  fill: #fff;
  stroke: #E11D48;
  stroke-width: 3;
  pointer-events: none;
  filter: drop-shadow(0 4px 8px rgba(225, 29, 72, 0.18));
}

.tomato-chart-label {
  fill: var(--vcp-text-sub, #8C847A);
  font-size: 10px;
  font-weight: 800;
  text-anchor: middle;
}

.tomato-contrib-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow: auto;
}

.tomato-contrib-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(245, 244, 238, 0.62);
}

.tomato-contrib-row strong {
  display: block;
  color: var(--vcp-text-main, #3E3A36);
  font-size: 13px;
  font-weight: 900;
  line-height: 1.3;
}

.tomato-contrib-row span {
  display: block;
  margin-top: 4px;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 11px;
  font-weight: 800;
}

.tomato-contrib-row em {
  flex: 0 0 auto;
  font-style: normal;
  color: #E11D48;
  font-weight: 950;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(244, 63, 94, 0.09);
}

.tomato-contrib-empty {
  padding: 26px;
  text-align: center;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 13px;
  font-weight: 800;
  border: 1px dashed rgba(62, 58, 54, 0.16);
  border-radius: 14px;
}

.tomato-overview-pop-enter-active,
.tomato-overview-pop-leave-active { transition: opacity 0.2s ease; }
.tomato-overview-pop-enter-active .tomato-overview-panel,
.tomato-overview-pop-leave-active .tomato-overview-panel { transition: transform 0.2s ease, opacity 0.2s ease; }
.tomato-overview-pop-enter-from,
.tomato-overview-pop-leave-to { opacity: 0; }
.tomato-overview-pop-enter-from .tomato-overview-panel,
.tomato-overview-pop-leave-to .tomato-overview-panel { opacity: 0; transform: translateY(-10px) scale(0.98); }

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
