<template>
  <div class="right-placeholder-layer">
    <button class="right-extra-card first-extra glass-card review-rate-card" type="button" @click="isOverviewOpen = true">
      <div class="review-rate-header">
        <span>🧠 复习速率</span>
        <span class="rate-unit">/ 天</span>
      </div>
      <div class="review-rate-grid">
        <div class="rate-item violet">
          <strong>{{ formatRate(weekReviewRate) }}</strong>
          <span>周复习率</span>
        </div>
        <div class="rate-item teal">
          <strong>{{ formatRate(monthReviewRate) }}</strong>
          <span>月复习率</span>
        </div>
        <div class="rate-item amber">
          <strong>{{ formatRate(quarterReviewRate) }}</strong>
          <span>季复习率</span>
        </div>
        <div class="rate-item rose">
          <strong>{{ formatRate(yearReviewRate) }}</strong>
          <span>年复习率</span>
        </div>
      </div>
    </button>

    <div class="right-extra-card second-extra glass-card placeholder-shell">
      <div class="extra-card-header compact">
        <span class="extra-dot teal"></span>
        <span class="extra-dot amber"></span>
        <span class="extra-dot muted"></span>
      </div>
      <div class="extra-orb-row">
        <span class="extra-bar-stack">
          <i></i>
          <i></i>
          <i></i>
        </span>
        <span class="extra-orb"></span>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="review-overview-pop">
        <div v-if="isOverviewOpen" class="review-overview-backdrop" @click="isOverviewOpen = false">
          <div class="review-overview-panel" @click.stop>
            <div class="overview-panel-header">
              <div>
                <div class="overview-panel-title">复习任务总览</div>
                <div class="overview-panel-subtitle">{{ reviewTasks.length }} 张复习卡 · 今日应复习 {{ todayDueReviewCount }} 张</div>
              </div>
              <button class="overview-panel-close" type="button" @click="isOverviewOpen = false">✕</button>
            </div>

            <div class="overview-rate-strip">
              <div><strong>{{ formatRate(weekReviewRate) }}</strong><span>周复习率</span></div>
              <div><strong>{{ formatRate(monthReviewRate) }}</strong><span>月复习率</span></div>
              <div><strong>{{ formatRate(quarterReviewRate) }}</strong><span>季复习率</span></div>
              <div><strong>{{ formatRate(yearReviewRate) }}</strong><span>年复习率</span></div>
            </div>

            <div class="overview-toolbar">
              <input v-model="filters.keyword" class="overview-search" type="text" placeholder="搜索标题 / 备注 / 标签 / 智能体" />
              <button class="overview-reset-btn" type="button" @click="resetFilters">重置筛选</button>
            </div>

            <details class="overview-advanced">
              <summary>高级筛选</summary>
              <div class="overview-filter-grid">
                <label>
                  <span>复习状态</span>
                  <select v-model="filters.status">
                    <option value="all">全部状态</option>
                    <option value="due">今日应复习</option>
                    <option value="overdue">已逾期</option>
                    <option value="upcoming">未到复习日</option>
                    <option value="completed">已闭环</option>
                  </select>
                </label>
                <label>
                  <span>任务层级</span>
                  <select v-model="filters.period">
                    <option value="all">全部层级</option>
                    <option value="daily">今日任务</option>
                    <option value="short_term">短期目标</option>
                    <option value="long_term">长期宏图</option>
                    <option value="routine">常驻习惯</option>
                  </select>
                </label>
                <label>
                  <span>优先级</span>
                  <select v-model="filters.priority">
                    <option value="all">全部优先级</option>
                    <option value="p0">P0 紧急</option>
                    <option value="p1">P1 高</option>
                    <option value="p2">P2 中</option>
                    <option value="p3">P3 低</option>
                  </select>
                </label>
                <label>
                  <span>复习阶段</span>
                  <select v-model="filters.stage">
                    <option value="all">全部阶段</option>
                    <option v-for="stage in stageOptions" :key="stage" :value="String(stage)">阶段 {{ stage }}</option>
                  </select>
                </label>
                <label>
                  <span>智能体</span>
                  <select v-model="filters.creator">
                    <option value="all">全部智能体</option>
                    <option v-for="creator in creatorOptions" :key="creator" :value="creator">{{ creator }}</option>
                  </select>
                </label>
                <label>
                  <span>标签包含</span>
                  <input v-model="filters.tag" type="text" placeholder="普通/知识标签" />
                </label>
                <label>
                  <span>到期起始</span>
                  <input v-model="filters.dueStart" type="date" />
                </label>
                <label>
                  <span>到期结束</span>
                  <input v-model="filters.dueEnd" type="date" />
                </label>
                <label>
                  <span>显示范围</span>
                  <select v-model="filters.scope">
                    <option value="today">今日应复习任务</option>
                    <option value="all">全部复习任务</option>
                  </select>
                </label>
                <label>
                  <span>排序</span>
                  <select v-model="filters.sortBy">
                    <option value="due_asc">到期日近 → 远</option>
                    <option value="stage_desc">阶段高 → 低</option>
                    <option value="history_desc">复习次数多 → 少</option>
                    <option value="updated_desc">最近更新</option>
                  </select>
                </label>
              </div>
            </details>

            <div class="overview-table-meta">
              <span>筛选结果 {{ filteredReviewTasks.length }} / {{ reviewTasks.length }}</span>
              <span>点击任意行进入编辑界面</span>
            </div>

            <div class="overview-table-shell">
              <table class="review-overview-table">
                <thead>
                  <tr>
                    <th>任务</th>
                    <th>状态</th>
                    <th>阶段</th>
                    <th>层级</th>
                    <th>优先级</th>
                    <th>下次复习</th>
                    <th>复习次数</th>
                    <th>标签</th>
                    <th>更新</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="task in filteredReviewTasks" :key="task.id" :class="{ due: isDueReviewTask(task), completed: task.review_info?.completed }" @click="openTaskDetail(task.id)">
                    <td class="title-cell">
                      <div class="table-title">{{ task.title || '未命名复习任务' }}</div>
                      <div class="table-subtitle">{{ task.creator_agent || '手动创建' }}</div>
                    </td>
                    <td><span class="status-chip">{{ reviewStatusName(task) }}</span></td>
                    <td>阶段 {{ task.review_info?.stage || 0 }}</td>
                    <td>{{ periodName(task.period) }}</td>
                    <td>{{ task.priority?.toUpperCase?.() || '-' }}</td>
                    <td>{{ task.review_info?.next_review_date || '未安排' }}</td>
                    <td>{{ task.review_history?.length || 0 }}</td>
                    <td class="tag-cell"><span v-for="tag in compactTags(task)" :key="tag">{{ tag }}</span></td>
                    <td>{{ formatDate(task.updated_at) }}</td>
                  </tr>
                  <tr v-if="filteredReviewTasks.length === 0">
                    <td colspan="9" class="overview-empty">没有匹配的复习任务</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Transition>

      <DetailDrawer :visible="isDrawerOpen" :task-id="selectedTaskId" @close="isDrawerOpen = false" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import DetailDrawer from './DetailDrawer.vue'
import type { ITaskItem, TaskPeriod, TaskPriority } from '@/types/task'

const DAY_MS = 24 * 60 * 60 * 1000

const store = useTaskStore()
const isOverviewOpen = ref(false)
const isDrawerOpen = ref(false)
const selectedTaskId = ref<string | null>(null)
const filters = reactive({
  keyword: '',
  status: 'all',
  period: 'all' as 'all' | TaskPeriod,
  priority: 'all' as 'all' | TaskPriority,
  stage: 'all',
  creator: 'all',
  tag: '',
  scope: 'today',
  dueStart: '',
  dueEnd: '',
  sortBy: 'due_asc'
})

const startOfDay = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

const startOfWeek = (date = new Date()) => {
  const start = new Date(startOfDay(date))
  const day = start.getDay() || 7
  start.setDate(start.getDate() - day + 1)
  return start.getTime()
}

const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1).getTime()

const startOfQuarter = (date = new Date()) => {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), quarterStartMonth, 1).getTime()
}

const startOfYear = (date = new Date()) => new Date(date.getFullYear(), 0, 1).getTime()

const elapsedDaysFrom = (startTimestamp: number) => Math.max(1, Math.floor((startOfDay() - startTimestamp) / DAY_MS) + 1)

const dateKey = (timestamp = Date.now()) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const isReviewTask = (task: any) => Boolean(task.is_review || task.review_info || task.review_history?.length)
const reviewDateStatus = (task: any) => {
  if (task.review_info?.completed) return 'completed'
  if (!task.is_review || !task.review_info) return 'inactive'
  if (!task.review_info.next_review_date) return 'due'
  const today = dateKey()
  if (task.review_info.next_review_date < today) return 'overdue'
  if (task.review_info.next_review_date === today) return 'due'
  return 'upcoming'
}

const isDueReviewTask = (task: any) => ['overdue', 'due'].includes(reviewDateStatus(task))

const reviewTasks = computed(() => store.normalizedTaskList.filter(isReviewTask).sort((a, b) => {
  if (isDueReviewTask(a) !== isDueReviewTask(b)) return isDueReviewTask(a) ? -1 : 1
  return String(a.review_info?.next_review_date || '9999-99-99').localeCompare(String(b.review_info?.next_review_date || '9999-99-99'))
}))
const todayDueReviewCount = computed(() => reviewTasks.value.filter(isDueReviewTask).length)
const creatorOptions = computed(() => Array.from(new Set(reviewTasks.value.map(task => task.creator_agent).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'zh-CN')))
const stageOptions = computed(() => Array.from(new Set(reviewTasks.value.map(task => task.review_info?.stage || 0))).sort((a, b) => a - b))

const filteredReviewTasks = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  const tagKeyword = filters.tag.trim().toLowerCase()
  const dueStart = filters.dueStart || ''
  const dueEnd = filters.dueEnd || ''

  const result = reviewTasks.value.filter(task => {
    const isCompleted = Boolean(task.review_info?.completed)
    const isDue = isDueReviewTask(task)
    const nextDate = task.review_info?.next_review_date || ''
    const tags = [...(task.tags || []), ...(task.knowledge_tags || [])]

    const status = reviewDateStatus(task)

    if (filters.scope === 'today' && !isDue) return false
    if (filters.status !== 'all' && status !== filters.status) return false
    if (filters.period !== 'all' && task.period !== filters.period) return false
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    if (filters.stage !== 'all' && String(task.review_info?.stage || 0) !== filters.stage) return false
    if (filters.creator !== 'all' && task.creator_agent !== filters.creator) return false
    if (dueStart && (!nextDate || nextDate < dueStart)) return false
    if (dueEnd && (!nextDate || nextDate > dueEnd)) return false
    if (tagKeyword && !tags.join(' ').toLowerCase().includes(tagKeyword)) return false

    if (keyword) {
      const haystack = [
        task.title,
        task.memo,
        task.creator_agent,
        task.id,
        ...tags
      ].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(keyword)) return false
    }

    return true
  })

  return result.sort((a, b) => {
    if (filters.sortBy === 'stage_desc') return (b.review_info?.stage || 0) - (a.review_info?.stage || 0)
    if (filters.sortBy === 'history_desc') return (b.review_history?.length || 0) - (a.review_history?.length || 0)
    if (filters.sortBy === 'updated_desc') return (b.updated_at || 0) - (a.updated_at || 0)
    return String(a.review_info?.next_review_date || '9999-99-99').localeCompare(String(b.review_info?.next_review_date || '9999-99-99'))
  })
})

const reviewedAtList = computed(() => store.normalizedTaskList
  .flatMap(task => task.review_history || [])
  .map(history => Number(history.reviewed_at || 0))
  .filter(Boolean)
)

const countReviewedSince = (startTimestamp: number) => reviewedAtList.value.filter(timestamp => timestamp >= startTimestamp).length
const reviewRateSince = (startTimestamp: number) => countReviewedSince(startTimestamp) / elapsedDaysFrom(startTimestamp)

const weekReviewRate = computed(() => reviewRateSince(startOfWeek()))
const monthReviewRate = computed(() => reviewRateSince(startOfMonth()))
const quarterReviewRate = computed(() => reviewRateSince(startOfQuarter()))
const yearReviewRate = computed(() => reviewRateSince(startOfYear()))

const formatRate = (value: number) => {
  if (!Number.isFinite(value)) return '0'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const periodName = (period?: TaskPeriod) => ({
  daily: '今日',
  short_term: '短期',
  long_term: '长期',
  routine: '常驻'
}[period || 'daily'] || period || '-')

const reviewStatusName = (task: ITaskItem) => ({
  completed: '已闭环',
  overdue: '已逾期',
  due: '今日应复习',
  upcoming: '未到复习日',
  inactive: '未启用'
}[reviewDateStatus(task)] || '未启用')
const compactTags = (task: ITaskItem) => [...(task.knowledge_tags || []), ...(task.tags || [])].slice(0, 3)
const formatDate = (timestamp?: number | null) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const resetFilters = () => {
  filters.keyword = ''
  filters.status = 'all'
  filters.period = 'all'
  filters.priority = 'all'
  filters.stage = 'all'
  filters.creator = 'all'
  filters.tag = ''
  filters.scope = 'today'
  filters.dueStart = ''
  filters.dueEnd = ''
  filters.sortBy = 'due_asc'
}

const openTaskDetail = (taskId: string) => {
  selectedTaskId.value = taskId
  isDrawerOpen.value = true
}
</script>

<style scoped>
.right-placeholder-layer,
.placeholder-shell {
  pointer-events: none;
}

.review-rate-card {
  appearance: none;
  -webkit-appearance: none;
  color: var(--vcp-text-main, #3E3A36);
  cursor: pointer;
  pointer-events: auto;
  text-align: left;
  font: inherit;
  transition: all 0.22s ease;
}

.review-rate-card:hover {
  transform: translateY(-3px);
  border-color: rgba(139, 92, 246, 0.26);
  background: rgba(255, 255, 255, 0.94) !important;
  box-shadow: 0 14px 34px rgba(139, 92, 246, 0.12), 0 0 1px rgba(0, 0, 0, 0.05) inset;
}

.glass-card {
  position: fixed !important;
  right: 24px !important;
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

.right-extra-card {
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

.review-rate-header,
.extra-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.review-rate-header {
  color: #7C3AED;
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
}

.rate-unit {
  color: var(--vcp-text-sub, #8C847A);
  font-size: 10px;
  opacity: 0.72;
}

.review-rate-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 7px;
}

.rate-item {
  min-width: 0;
  height: 32px;
  border-radius: 11px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.rate-item strong {
  font-size: 15px;
  line-height: 1;
  font-weight: 950;
  letter-spacing: -0.05em;
}

.rate-item span {
  font-size: 8px;
  line-height: 1;
  font-weight: 900;
  color: var(--vcp-text-sub, #8C847A);
  white-space: nowrap;
}

.rate-item.violet {
  background: rgba(139, 92, 246, 0.1);
  color: #7C3AED;
}

.rate-item.teal {
  background: rgba(74, 157, 154, 0.1);
  color: #2F7F7B;
}

.rate-item.amber {
  background: rgba(205, 133, 63, 0.12);
  color: #B45309;
}

.rate-item.rose {
  background: rgba(244, 63, 94, 0.09);
  color: #E11D48;
}

.extra-card-header.compact {
  justify-content: flex-end;
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
  margin-left: auto;
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
  align-items: flex-end;
  gap: 6px;
}

.extra-bar-stack i {
  width: 100%;
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

.review-overview-backdrop {
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

.review-overview-panel {
  width: min(1180px, calc(100vw - 64px));
  max-height: min(840px, calc(100vh - 64px));
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
}

.overview-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.overview-panel-title {
  font-size: 22px;
  font-weight: 950;
  color: var(--vcp-text-main, #3E3A36);
  letter-spacing: -0.04em;
}

.overview-panel-subtitle {
  margin-top: 6px;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 12px;
  font-weight: 800;
}

.overview-panel-close {
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

.overview-panel-close:hover {
  background: #7C3AED;
  color: #fff;
}

.overview-rate-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.overview-rate-strip div {
  height: 74px;
  border-radius: 18px;
  background: rgba(245, 244, 238, 0.72);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.overview-rate-strip strong {
  font-size: 26px;
  color: #7C3AED;
  line-height: 1;
}

.overview-rate-strip span {
  font-size: 11px;
  font-weight: 900;
  color: var(--vcp-text-sub, #8C847A);
}

.overview-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.overview-search,
.overview-filter-grid input,
.overview-filter-grid select {
  height: 34px;
  box-sizing: border-box;
  border: 1px solid rgba(62, 58, 54, 0.08);
  border-radius: 11px;
  background: rgba(245, 244, 238, 0.72);
  color: var(--vcp-text-main, #3E3A36);
  font-size: 12px;
  font-weight: 800;
  outline: none;
}

.overview-search {
  flex: 1;
  padding: 0 12px;
}

.overview-reset-btn {
  height: 34px;
  border: none;
  border-radius: 11px;
  padding: 0 14px;
  background: rgba(139, 92, 246, 0.1);
  color: #7C3AED;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.overview-advanced {
  margin-bottom: 12px;
  border-radius: 18px;
  background: rgba(245, 244, 238, 0.52);
  border: 1px solid rgba(62, 58, 54, 0.06);
  padding: 12px;
}

.overview-advanced summary {
  cursor: pointer;
  color: var(--vcp-text-main, #3E3A36);
  font-size: 12px;
  font-weight: 950;
  margin-bottom: 10px;
}

.overview-filter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.overview-filter-grid label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.overview-filter-grid label span {
  color: var(--vcp-text-sub, #8C847A);
  font-size: 10px;
  font-weight: 900;
}

.overview-filter-grid input,
.overview-filter-grid select {
  width: 100%;
  padding: 0 10px;
}

.overview-table-meta {
  display: flex;
  justify-content: space-between;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 11px;
  font-weight: 900;
  margin-bottom: 8px;
}

.overview-table-shell {
  min-height: 0;
  overflow: auto;
  border-radius: 18px;
  border: 1px solid rgba(62, 58, 54, 0.06);
  background: rgba(255, 255, 255, 0.58);
}

.review-overview-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 12px;
}

.review-overview-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px 10px;
  text-align: left;
  background: rgba(245, 244, 238, 0.96);
  color: var(--vcp-text-sub, #8C847A);
  font-size: 11px;
  font-weight: 950;
  white-space: nowrap;
}

.review-overview-table td {
  padding: 12px 10px;
  border-top: 1px solid rgba(62, 58, 54, 0.06);
  color: var(--vcp-text-main, #3E3A36);
  font-weight: 800;
  vertical-align: middle;
}

.review-overview-table tbody tr {
  cursor: pointer;
  transition: background 0.16s ease;
}

.review-overview-table tbody tr:hover {
  background: rgba(139, 92, 246, 0.06);
}

.review-overview-table tbody tr.due {
  background: rgba(139, 92, 246, 0.05);
}

.review-overview-table tbody tr.completed {
  opacity: 0.62;
}

.title-cell {
  width: 260px;
}

.table-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 950;
}

.table-subtitle {
  margin-top: 4px;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-chip,
.tag-cell span {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.1);
  color: #7C3AED;
  font-size: 10px;
  font-weight: 950;
  white-space: nowrap;
}

.tag-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-cell span {
  background: rgba(74, 157, 154, 0.1);
  color: #2F7F7B;
}

.overview-empty {
  padding: 38px !important;
  text-align: center;
  color: var(--vcp-text-sub, #8C847A) !important;
  font-size: 13px;
  font-weight: 900;
}

.review-overview-pop-enter-active,
.review-overview-pop-leave-active { transition: opacity 0.2s ease; }
.review-overview-pop-enter-active .review-overview-panel,
.review-overview-pop-leave-active .review-overview-panel { transition: transform 0.2s ease, opacity 0.2s ease; }
.review-overview-pop-enter-from,
.review-overview-pop-leave-to { opacity: 0; }
.review-overview-pop-enter-from .review-overview-panel,
.review-overview-pop-leave-to .review-overview-panel { opacity: 0; transform: translateY(-10px) scale(0.98); }

@media (max-width: 1280px) {
  .glass-card {
    right: 20px !important;
  }
}

@media (max-width: 920px) {
  .overview-rate-strip,
  .overview-filter-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .review-overview-panel {
    width: calc(100vw - 32px);
    padding: 18px;
  }
}
</style>
