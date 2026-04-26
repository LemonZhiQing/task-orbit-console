<template>
  <div class="task-manager-layout">
    <div class="aurora-layer">
      <div class="aurora-blob blob-1"></div>
      <div class="aurora-blob blob-2"></div>
      <div class="aurora-blob blob-3"></div>
    </div>

    <div class="main-workspace">
      <router-view v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </router-view>
    </div>

    <TaskOverviewFloat />
    <InboxFab />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTaskStore } from '@/stores/taskStore'
import InboxFab from './components/InboxFab.vue'
import TaskOverviewFloat from './components/TaskOverviewFloat.vue'

const route = useRoute()
const store = useTaskStore()

watch(
  () => route.meta.taskView,
  view => {
    if (view === 'today' || view === 'planning' || view === 'review') {
      store.currentView = view
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.task-manager-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vcp-bg-body, #FCFBF7);
  overflow: hidden;
  position: relative;
  transition: background-color 0.4s ease;
  padding-top: 12px; 
}

.aurora-layer {
  position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
}
.aurora-blob {
  position: absolute; border-radius: 50%; filter: blur(80px);
  will-change: transform; transition: background 0.5s ease;
}

.blob-1 {
  top: -15%; left: -10%; width: 45%; height: 50%;
  background: radial-gradient(ellipse, rgba(245, 158, 11, 0.15) 0%, transparent 70%);
  animation: aurora-drift-1 14s ease-in-out infinite alternate;
}
.blob-2 {
  top: -10%; right: -15%; width: 40%; height: 45%;
  background: radial-gradient(ellipse, rgba(244, 63, 94, 0.12) 0%, transparent 70%);
  animation: aurora-drift-2 16s ease-in-out infinite alternate;
}
.blob-3 {
  bottom: -20%; left: 15%; width: 35%; height: 40%;
  background: radial-gradient(ellipse, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
  animation: aurora-drift-1 20s ease-in-out infinite alternate-reverse;
}

@keyframes aurora-drift-1 { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(4%, 3%) scale(1.05); } }
@keyframes aurora-drift-2 { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(-3%, 4%) scale(1.03); } }

[data-theme='dark'] .blob-1 { background: radial-gradient(ellipse, rgba(14, 165, 233, 0.20) 0%, transparent 70%); }
[data-theme='dark'] .blob-2 { background: radial-gradient(ellipse, rgba(139, 92, 246, 0.15) 0%, transparent 70%); }
[data-theme='dark'] .blob-3 { background: radial-gradient(ellipse, rgba(16, 185, 129, 0.12) 0%, transparent 70%); }

.main-workspace {
  flex: 1; position: relative; overflow: hidden; z-index: 1;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from { opacity: 0; transform: translateY(10px); }
.fade-leave-to { opacity: 0; transform: translateY(-10px); }
</style>