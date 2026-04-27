<template>
  <div class="review-ritual-container">
    <div class="ritual-bg-orb orb-one"></div>
    <div class="ritual-bg-orb orb-two"></div>

    <template v-if="reviewList.length > 0 || hasStarted">
      <section class="ritual-shell">
        <header class="ritual-hero">
          <div>
            <div class="ritual-kicker">🧠 Review Ritual</div>
            <h1>复习仪式</h1>
            <p>先主动回忆，再揭示答案，让每一次点击都形成记忆闭环。</p>
          </div>

          <div class="session-panel">
            <div class="session-stat primary">
              <strong>{{ remainingCount }}</strong>
              <span>剩余</span>
            </div>
            <div class="session-stat success">
              <strong>{{ rememberedCount }}</strong>
              <span>记住</span>
            </div>
            <div class="session-stat danger">
              <strong>{{ forgottenCount }}</strong>
              <span>忘记</span>
            </div>
          </div>
        </header>

        <template v-if="currentTask">
          <div class="progress-zone">
            <div class="progress-meta">
              <span>本轮进度</span>
              <strong>{{ completedCount }} / {{ sessionTotal }}</strong>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
            </div>
          </div>

          <Transition name="card-flip" mode="out-in">
            <article class="immersive-card" :key="`${currentTask.id}-${isAnswerRevealed}`">
              <div class="card-topline">
                <span class="stage-pill">阶段 {{ currentStage }}</span>
                <span class="source-pill">{{ periodName(currentTask.period) }}</span>
                <span v-if="currentTask.creator_agent" class="source-pill agent">🤖 {{ currentTask.creator_agent }}</span>
              </div>

              <div class="card-eyebrow">{{ isAnswerRevealed ? '答案与要点' : '请先主动回忆' }}</div>
              <h2 class="card-title">{{ currentTask.title || '未命名复习卡片' }}</h2>

              <div v-if="knowledgeTags.length" class="knowledge-tags">
                <span v-for="tag in knowledgeTags" :key="tag"># {{ tag }}</span>
              </div>

              <div v-if="!isAnswerRevealed" class="recall-box">
                <div class="recall-icon">?</div>
                <p>闭眼或在心里复述关键点，准备好后再揭示提示。</p>
                <button class="reveal-btn" type="button" @click="revealAnswer">显示提示 / 答案</button>
              </div>

              <div v-else class="answer-box">
                <p v-if="currentMemo">{{ currentMemo }}</p>
                <p v-else class="muted-answer">这张卡片没有额外备注。请根据标题完成自我回忆，并按真实掌握程度标记。</p>
              </div>

              <footer class="card-footnote">
                <span>历史复习 {{ reviewHistoryCount }} 次</span>
                <span>{{ nextReviewHint }}</span>
              </footer>
            </article>
          </Transition>

          <div v-if="errorMessage" class="error-toast">{{ errorMessage }}</div>

          <div class="action-zone">
            <div class="shortcut-hints">
              <span><kbd>Space</kbd> 显示答案</span>
              <span><kbd>←</kbd> 忘记</span>
              <span><kbd>→</kbd> 记住</span>
            </div>

            <div class="action-buttons">
              <button class="btn-forgot" type="button" :disabled="isMarking" @click="handleMark(false)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span>
                  忘记了
                  <small>回到阶段 0</small>
                </span>
              </button>
              <button class="btn-remember" type="button" :disabled="isMarking" @click="handleMark(true)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>
                  记住了
                  <small>{{ rememberActionHint }}</small>
                </span>
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="completion-card">
            <div class="celebration-icon">🎉</div>
            <div class="ritual-kicker">Session Complete</div>
            <h2>本轮复习完成</h2>
            <p>你已经清空今天的到期复习，记忆曲线又被稳稳托住了一次。</p>

            <div class="completion-grid">
              <div><strong>{{ completedCount }}</strong><span>已复习</span></div>
              <div><strong>{{ rememberedCount }}</strong><span>记住</span></div>
              <div><strong>{{ forgottenCount }}</strong><span>忘记</span></div>
              <div><strong>{{ rememberRate }}%</strong><span>记住率</span></div>
            </div>
          </div>
        </template>
      </section>
    </template>

    <template v-else>
      <div class="empty-celebration">
        <div class="celebration-icon">🌙</div>
        <div class="ritual-kicker">All Clear</div>
        <h2>今天没有待复习内容</h2>
        <p>复习雷达暂时安静。等下一批知识到期时，再回来完成一次轻量仪式。</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import type { ITaskItem, TaskPeriod } from '@/types/task'

const REVIEW_INTERVAL_LABELS = ['1 天后', '2 天后', '4 天后', '7 天后', '15 天后', '30 天后', '3 个月后', '半年后', '1 年后', '3 年后']

const store = useTaskStore()
const currentIndex = ref(0)
const isAnswerRevealed = ref(false)
const isMarking = ref(false)
const errorMessage = ref('')
const hasStarted = ref(false)
const sessionTotal = ref(0)
const rememberedCount = ref(0)
const forgottenCount = ref(0)

onMounted(() => {
  store.hydrateFromServer().catch(() => {})
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const reviewList = computed(() => store.todayReviewTasks || [])

watch(reviewList, list => {
  if (!hasStarted.value) {
    sessionTotal.value = list.length
  }
  if (currentIndex.value >= list.length) {
    currentIndex.value = 0
  }
}, { immediate: true })

const currentTask = computed<ITaskItem | null>(() => reviewList.value[currentIndex.value] || null)
const completedCount = computed(() => rememberedCount.value + forgottenCount.value)
const remainingCount = computed(() => Math.max(0, reviewList.value.length))
const currentStage = computed(() => currentTask.value?.review_info?.stage || 0)
const reviewHistoryCount = computed(() => currentTask.value?.review_history?.length || 0)
const rememberRate = computed(() => completedCount.value ? Math.round((rememberedCount.value / completedCount.value) * 100) : 100)

const currentMeta = computed(() => {
  if (!currentTask.value?.ai_meta_json) return null
  try {
    return JSON.parse(currentTask.value.ai_meta_json)
  } catch {
    return null
  }
})

const currentMemo = computed(() => {
  const meta = currentMeta.value
  return meta?.review_info?.memo || meta?.memo || currentTask.value?.memo || ''
})

const knowledgeTags = computed(() => [
  ...(currentTask.value?.knowledge_tags || []),
  ...(currentTask.value?.tags || [])
].filter(Boolean).slice(0, 5))

const progressPercent = computed(() => {
  if (sessionTotal.value === 0) return 0
  return Math.min(100, Math.round((completedCount.value / sessionTotal.value) * 100))
})

const nextReviewHint = computed(() => {
  if (!currentTask.value) return ''
  const date = currentTask.value.review_info?.next_review_date
  return date ? `本次到期：${date}` : '本次未设置到期日'
})

const rememberActionHint = computed(() => {
  const nextStage = currentStage.value + 1
  const nextInterval = REVIEW_INTERVAL_LABELS[nextStage] || '3 年后'
  return `阶段 ${nextStage} · ${nextInterval}`
})

const periodName = (period?: TaskPeriod) => ({
  daily: '今日任务',
  short_term: '短期目标',
  long_term: '长期宏图',
  routine: '常驻习惯'
}[period || 'daily'] || '复习任务')

const revealAnswer = () => {
  isAnswerRevealed.value = true
}

const handleMark = async (remembered: boolean) => {
  if (!currentTask.value || isMarking.value) return
  if (!isAnswerRevealed.value) {
    revealAnswer()
    return
  }

  isMarking.value = true
  errorMessage.value = ''
  hasStarted.value = true
  if (sessionTotal.value === 0) sessionTotal.value = reviewList.value.length

  try {
    await store.markReviewTask(currentTask.value.id, remembered)
    if (remembered) rememberedCount.value += 1
    else forgottenCount.value += 1
    isAnswerRevealed.value = false
    if (currentIndex.value >= reviewList.value.length) currentIndex.value = 0
  } catch (error) {
    errorMessage.value = '标记复习结果失败，请稍后再试。'
  } finally {
    isMarking.value = false
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!currentTask.value || isMarking.value) return
  if (event.code === 'Space') {
    event.preventDefault()
    revealAnswer()
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    handleMark(false)
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    handleMark(true)
  }
}
</script>

<style scoped>
.review-ritual-container {
  position: relative;
  min-height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 42px 28px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 18% 18%, rgba(139, 92, 246, 0.12), transparent 30%),
    radial-gradient(circle at 82% 20%, rgba(74, 157, 154, 0.12), transparent 28%),
    linear-gradient(135deg, rgba(255, 253, 247, 0.95), rgba(250, 250, 248, 0.98));
}

.ritual-bg-orb {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 999px;
  filter: blur(18px);
  opacity: 0.52;
  pointer-events: none;
}

.orb-one {
  left: 12%;
  bottom: 10%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.18), transparent 68%);
}

.orb-two {
  right: 10%;
  top: 18%;
  background: radial-gradient(circle, rgba(34, 197, 94, 0.12), transparent 66%);
}

.ritual-shell {
  position: relative;
  z-index: 1;
  width: min(980px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.ritual-hero {
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.ritual-kicker {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7C3AED;
  margin-bottom: 8px;
}

.ritual-hero h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1;
  color: var(--vcp-text-main, #3E3A36);
  letter-spacing: -0.04em;
}

.ritual-hero p {
  margin: 10px 0 0;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 14px;
  font-weight: 700;
}

.session-panel {
  display: grid;
  grid-template-columns: repeat(3, 88px);
  gap: 10px;
}

.session-stat {
  height: 72px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.86);
  box-shadow: 0 14px 30px rgba(62, 58, 54, 0.07);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  backdrop-filter: blur(16px);
}

.session-stat strong {
  font-size: 26px;
  line-height: 1;
  letter-spacing: -0.05em;
}

.session-stat span {
  font-size: 11px;
  font-weight: 900;
  color: var(--vcp-text-sub, #8C847A);
}

.session-stat.primary strong { color: #7C3AED; }
.session-stat.success strong { color: #059669; }
.session-stat.danger strong { color: #E11D48; }

.progress-zone {
  width: min(620px, 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--vcp-text-sub, #8C847A);
  font-weight: 900;
}

.progress-bar {
  height: 8px;
  background: rgba(62, 58, 54, 0.07);
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8B5CF6, #22C55E);
  border-radius: 999px;
  transition: width 0.35s ease;
}

.immersive-card {
  width: min(680px, 100%);
  min-height: 360px;
  box-sizing: border-box;
  padding: 30px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 28px 70px rgba(62, 58, 54, 0.12);
  backdrop-filter: blur(22px);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.card-topline {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.stage-pill,
.source-pill {
  padding: 7px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  background: rgba(139, 92, 246, 0.1);
  color: #7C3AED;
}

.source-pill {
  background: rgba(62, 58, 54, 0.06);
  color: var(--vcp-text-sub, #8C847A);
}

.source-pill.agent {
  background: rgba(74, 157, 154, 0.1);
  color: #2F7F7B;
}

.card-eyebrow {
  font-size: 12px;
  color: #7C3AED;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 12px;
}

.card-title {
  max-width: 92%;
  font-size: 28px;
  font-weight: 900;
  color: var(--vcp-text-main, #3E3A36);
  margin: 0;
  line-height: 1.35;
  letter-spacing: -0.03em;
}

.knowledge-tags {
  margin-top: 14px;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.knowledge-tags span {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(236, 72, 153, 0.08);
  color: #BE185D;
  font-size: 11px;
  font-weight: 900;
}

.recall-box,
.answer-box {
  margin-top: 26px;
  width: min(520px, 100%);
  border-radius: 22px;
  background: rgba(245, 244, 238, 0.78);
  border: 1px solid rgba(62, 58, 54, 0.06);
  padding: 22px;
  box-sizing: border-box;
}

.recall-icon {
  width: 46px;
  height: 46px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.16), rgba(34, 197, 94, 0.12));
  display: grid;
  place-items: center;
  color: #7C3AED;
  font-size: 26px;
  font-weight: 900;
}

.recall-box p,
.answer-box p {
  margin: 0;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 14px;
  line-height: 1.7;
  font-weight: 700;
  white-space: pre-wrap;
}

.answer-box p {
  color: var(--vcp-text-main, #3E3A36);
  text-align: left;
}

.answer-box .muted-answer {
  text-align: center;
  color: var(--vcp-text-sub, #8C847A);
}

.reveal-btn {
  margin-top: 18px;
  height: 42px;
  padding: 0 20px;
  border: none;
  border-radius: 999px;
  background: #7C3AED;
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 12px 22px rgba(124, 58, 237, 0.22);
}

.card-footnote {
  width: 100%;
  margin-top: auto;
  padding-top: 18px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 11px;
  font-weight: 900;
}

.action-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.shortcut-hints {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 12px;
  font-weight: 800;
}

kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 6px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(62, 58, 54, 0.12);
  color: var(--vcp-text-main, #3E3A36);
  font-size: 11px;
  box-shadow: 0 3px 0 rgba(62, 58, 54, 0.08);
}

.action-buttons {
  display: flex;
  gap: 16px;
}

.action-buttons button {
  min-width: 170px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 18px;
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.action-buttons button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.action-buttons small {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  font-weight: 900;
  opacity: 0.72;
}

.btn-forgot {
  background: rgba(254, 242, 242, 0.94);
  color: #DC2626;
  border-color: rgba(254, 202, 202, 0.95);
}

.btn-forgot:hover:not(:disabled) {
  background: #FEE2E2;
  transform: translateY(-2px);
  box-shadow: 0 12px 22px rgba(220, 38, 38, 0.12);
}

.btn-remember {
  background: linear-gradient(135deg, #4A9D9A, #059669);
  color: #fff;
  box-shadow: 0 12px 24px rgba(5, 150, 105, 0.22);
}

.btn-remember:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(5, 150, 105, 0.28);
}

.error-toast {
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(254, 242, 242, 0.94);
  color: #DC2626;
  font-size: 12px;
  font-weight: 900;
}

.completion-card,
.empty-celebration {
  position: relative;
  z-index: 1;
  width: min(620px, 100%);
  box-sizing: border-box;
  text-align: center;
  padding: 48px 42px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 30px;
  box-shadow: 0 28px 70px rgba(62, 58, 54, 0.12);
  backdrop-filter: blur(22px);
}

.celebration-icon {
  font-size: 64px;
  margin-bottom: 18px;
}

.completion-card h2,
.empty-celebration h2 {
  margin: 0;
  font-size: 30px;
  color: var(--vcp-text-main, #3E3A36);
  letter-spacing: -0.04em;
}

.completion-card p,
.empty-celebration p {
  margin: 12px auto 0;
  max-width: 420px;
  color: var(--vcp-text-sub, #8C847A);
  font-size: 14px;
  line-height: 1.7;
  font-weight: 700;
}

.completion-grid {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.completion-grid div {
  height: 82px;
  border-radius: 18px;
  background: rgba(245, 244, 238, 0.72);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.completion-grid strong {
  font-size: 26px;
  color: #4A9D9A;
  line-height: 1;
}

.completion-grid span {
  color: var(--vcp-text-sub, #8C847A);
  font-size: 11px;
  font-weight: 900;
}

.card-flip-enter-active,
.card-flip-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.card-flip-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.card-flip-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.98);
}

@media (max-width: 820px) {
  .review-ritual-container {
    padding: 28px 18px;
  }

  .ritual-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .session-panel,
  .completion-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .completion-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .action-buttons {
    width: 100%;
    flex-direction: column;
  }

  .action-buttons button {
    width: 100%;
  }

  .card-footnote {
    flex-direction: column;
    align-items: center;
  }
}
</style>
