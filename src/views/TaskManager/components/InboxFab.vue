<template>
  <div class="inbox-fab-container">
    <!-- 抽屉部分 -->
    <transition name="fade-slide">
      <div v-if="isOpen" class="inbox-drawer">
        <div class="inbox-header">
          <span>碎片缓存池</span>
          <span class="count-badge">{{ inboxList.length }}</span>
        </div>
        
        <div class="inbox-input-wrapper">
          <input 
            v-model="newItem" 
            @keyup.enter="handleEnter"
            placeholder="记录你的新念头... (Enter)"
            class="inbox-input"
          />
        </div>

        <div class="inbox-list">
          <div v-for="item in inboxList" :key="item.id" class="inbox-item">
            <div class="item-content">{{ item.content }}</div>
            <div class="item-actions">
              <span class="item-time">{{ formatTime(item.created_at) }}</span>
              <button class="btn-convert" @click="promote(item.id)">↗ 转为任务</button>
            </div>
          </div>
          <div v-if="inboxList.length === 0" class="empty-inbox">
            暂无灵感碎片，快记下点什么吧~
          </div>
        </div>
      </div>
    </transition>

    <!-- 悬浮球本体 -->
    <button class="fab-btn" :class="{ 'is-open': isOpen }" @click="isOpen = !isOpen">
      <svg v-if="!isOpen" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      <svg v-else viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTaskStore } from '@/stores/taskStore'

const store = useTaskStore()
const isOpen = ref(false)
const newItem = ref('')
const inboxList = store.inboxList

const handleEnter = () => {
  if (newItem.value.trim()) {
    store.addInboxItem(newItem.value)
    newItem.value = ''
  }
}

const promote = (id: string) => {
  store.promoteInboxToTask(id)
}

const formatTime = (ts: number) => {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.inbox-fab-container {
  position: fixed;
  bottom: 32px;
  right: 32px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
}

/* 🎨 色彩统一：融入护眼青色主题 */
.fab-btn {
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: var(--color-primary, #4A9D9A);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(74, 157, 154, 0.4);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.fab-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(74, 157, 154, 0.5);
}
.fab-btn.is-open {
  background: var(--vcp-text-main, #3E3A36);
  box-shadow: 0 4px 12px rgba(62, 58, 54, 0.3);
  transform: rotate(90deg);
}

.inbox-drawer {
  width: 320px;
  background: var(--vcp-bg-card, #FFFFFF);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(62, 58, 54, 0.08);
  border: 1px solid rgba(62, 58, 54, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.inbox-header {
  padding: 16px 20px;
  background: var(--vcp-bg-column, #F5F4EE);
  font-weight: 600;
  color: var(--vcp-text-main);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.count-badge {
  background: rgba(62, 58, 54, 0.08);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.inbox-input-wrapper {
  padding: 16px;
  border-bottom: 1px solid rgba(62, 58, 54, 0.06);
}
.inbox-input {
  width: 100%;
  border: none;
  background: rgba(62, 58, 54, 0.04);
  padding: 10px 14px;
  border-radius: 8px;
  outline: none;
  color: var(--vcp-text-main);
  transition: background 0.2s;
}
.inbox-input:focus {
  background: rgba(62, 58, 54, 0.08);
}

.inbox-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.inbox-list::-webkit-scrollbar { width: 4px; }
.inbox-list::-webkit-scrollbar-thumb { background: rgba(62, 58, 54, 0.1); border-radius: 4px; }

.inbox-item {
  padding: 12px;
  background: var(--vcp-bg-column, #F5F4EE);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item-content {
  font-size: 13px;
  color: var(--vcp-text-main);
  line-height: 1.4;
}
.item-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.item-time {
  font-size: 11px;
  color: var(--vcp-text-sub);
}
.btn-convert {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary, #4A9D9A);
  background: rgba(74, 157, 154, 0.1);
  border: none;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-convert:hover {
  background: var(--color-primary, #4A9D9A);
  color: white;
}

.empty-inbox {
  padding: 30px 0;
  text-align: center;
  color: var(--vcp-text-sub);
  font-size: 13px;
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: bottom right;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
</style>