<template>
  <div class="review-ritual-container">

    <!-- 有待复习内容 -->
    <template v-if="reviewList.length > 0">
      <!-- 进度指示 -->
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div class="progress-text">{{ currentIndex + 1 }} / {{ reviewList.length }}</div>

      <!-- 单张沉浸卡片 -->
      <Transition name="card-flip" mode="out-in">
        <div class="immersive-card" :key="currentTask?.id">
          <div class="card-eyebrow">知识回顾</div>
          <h2 class="card-title">{{ currentTask?.title }}</h2>
          <div v-if="currentMemo" class="card-memo">{{ currentMemo }}</div>
        </div>
      </Transition>

      <!-- 双按钮 -->
      <div class="action-buttons">
        <button class="btn-forgot" @click="handleMark(false)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          忘记了
        </button>
        <button class="btn-remember" @click="handleMark(true)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          记住了
        </button>
      </div>
    </template>

    <!-- 全部复习完毕 / 无内容 -->
    <template v-else>
      <div class="empty-celebration">
        <div class="celebration-icon">🎉</div>
        <h2>太棒了！</h2>
        <p>今天没有需要复习的内容了，去休息一下吧~</p>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/taskStore'

const store = useTaskStore()
const currentIndex = ref(0)

onMounted(() => {
  store.hydrateFromServer().catch(() => {})
})

const reviewList = computed(() => store.reviewTasks || [])

const currentTask = computed(() => reviewList.value[currentIndex.value] || null)

const currentMemo = computed(() => {
  if (!currentTask.value?.ai_meta_json) return ''
  try {
    const meta = JSON.parse(currentTask.value.ai_meta_json)
    return meta.review_info?.memo || ''
  } catch { return '' }
})

const progressPercent = computed(() => {
  if (reviewList.value.length === 0) return 0
  return ((currentIndex.value) / reviewList.value.length) * 100
})

const handleMark = async (remembered: boolean) => {
  if (!currentTask.value) return
  await store.markReviewTask(currentTask.value.id, remembered)
  // 移除后列表自动缩短，index 不变即自动显示下一张
  if (currentIndex.value >= reviewList.value.length) {
    currentIndex.value = 0
  }
}
</script>

<style scoped>
.review-ritual-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 32px;
}

/* 进度条 */
.progress-bar {
  width: 200px; height: 4px;
  background: var(--vcp-bg-column, #F1F5F9);
  border-radius: 2px; overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary, #6366F1), #8B5CF6);
  border-radius: 2px;
  transition: width 0.4s ease;
}
.progress-text {
  font-size: 13px; color: var(--vcp-text-sub, #94A3B8); font-weight: 500;
  margin-top: -20px;
}

/* 沉浸卡片 */
.immersive-card {
  background: var(--vcp-bg-card, #FFFFFF);
  border: 1px solid var(--color-border, #E2E8F0);
  border-radius: 16px;
  padding: 48px 40px;
  max-width: 560px; width: 100%;
  text-align: center;
  box-shadow: 0 8px 30px rgba(0,0,0,0.06);
}
.card-eyebrow {
  font-size: 13px; color: var(--color-primary, #6366F1);
  font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
  margin-bottom: 16px;
}
.card-title {
  font-size: 24px; font-weight: 600;
  color: var(--vcp-text-main, #0F172A);
  margin: 0 0 16px 0; line-height: 1.4;
}
.card-memo {
  font-size: 14px; color: var(--vcp-text-sub, #64748B);
  line-height: 1.6; padding: 16px;
  background: var(--vcp-bg-column, #F8FAFC);
  border-radius: 8px;
}

/* 双按钮 */
.action-buttons {
  display: flex; gap: 20px;
}
.action-buttons button {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 32px; border-radius: 12px;
  font-size: 15px; font-weight: 600;
  cursor: pointer; border: none;
  transition: all 0.2s ease;
}
.btn-forgot {
  background: #FEF2F2; color: #DC2626;
  border: 1px solid #FECACA;
}
.btn-forgot:hover { background: #FEE2E2; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(220,38,38,0.15); }

.btn-remember {
  background: var(--color-primary, #6366F1); color: white;
  box-shadow: 0 4px 12px rgba(99,102,241,0.3);
}
.btn-remember:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99,102,241,0.4); }

/* 完成庆祝 */
.empty-celebration {
  text-align: center;
  padding: 60px 40px;
  background: var(--vcp-bg-card, #FFFFFF);
  border: 1px solid var(--color-border, #E2E8F0);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}
.celebration-icon { font-size: 64px; margin-bottom: 16px; }
.empty-celebration h2 { margin: 0 0 8px 0; font-size: 24px; color: var(--vcp-text-main, #0F172A); }
.empty-celebration p { margin: 0; font-size: 15px; color: var(--vcp-text-sub, #64748B); }

/* 翻卡动画 */
.card-flip-enter-active, .card-flip-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.card-flip-enter-from { opacity: 0; transform: translateX(30px) scale(0.97); }
.card-flip-leave-to { opacity: 0; transform: translateX(-30px) scale(0.97); }
</style>