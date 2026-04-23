<template>
  <div class="today-board-container">
    <div class="kanban-wrapper">
      
      <!-- 待办 -->
      <div class="kanban-column">
        <div class="col-header">
          <div class="col-title">待办 <span class="count">{{ taskStore.tasksByColumn.todo.length }}</span></div>
          <button class="ghost-add-btn" @click="quickAdd('todo')" title="极速新建任务">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <draggable 
          :list="taskStore.tasksByColumn.todo" 
          group="tasks" 
          item-key="id" 
          class="task-list" 
          @change="onDragChange($event, 'todo')"
          ghost-class="ghost-card"
          drag-class="drag-card"
        >
          <template #item="{ element }">
            <TaskCard :task="element" @click="openDetail(element)" />
          </template>
        </draggable>
      </div>

      <!-- 进行中 -->
      <div class="kanban-column">
        <div class="col-header">
          <div class="col-title">进行中 <span class="count">{{ taskStore.tasksByColumn.in_progress.length }}</span></div>
          <button class="ghost-add-btn" @click="quickAdd('in_progress')" title="极速新建任务">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <draggable 
          :list="taskStore.tasksByColumn.in_progress" 
          group="tasks" 
          item-key="id" 
          class="task-list" 
          @change="onDragChange($event, 'in_progress')"
          ghost-class="ghost-card"
          drag-class="drag-card"
        >
          <template #item="{ element }">
            <TaskCard :task="element" @click="openDetail(element)" />
          </template>
        </draggable>
      </div>

      <!-- 已完成 -->
      <div class="kanban-column">
        <div class="col-header">
          <div class="col-title">已完成 <span class="count">{{ taskStore.tasksByColumn.done.length }}</span></div>
          <button class="ghost-add-btn" @click="quickAdd('done')" title="极速新建任务">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <draggable 
          :list="taskStore.tasksByColumn.done" 
          group="tasks" 
          item-key="id" 
          class="task-list" 
          @change="onDragChange($event, 'done')"
          ghost-class="ghost-card"
          drag-class="drag-card"
        >
          <template #item="{ element }">
            <TaskCard :task="element" @click="openDetail(element)" />
          </template>
        </draggable>
      </div>

    </div>

    <!-- 沉浸式详情抽屉 -->
    <DetailDrawer :visible="isDrawerOpen" :task-id="selectedTaskId" @close="isDrawerOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import draggable from 'vuedraggable'
import TaskCard from './components/TaskCard.vue'
import DetailDrawer from './components/DetailDrawer.vue'
import { useTaskStore } from '@/stores/taskStore'
import type { ITaskItem, KanbanColumn } from '@/types/task'

const taskStore = useTaskStore()
const isDrawerOpen = ref(false)
const selectedTaskId = ref<string | null>(null)

onMounted(() => {
  const hasMock = taskStore.taskList.some(t => t.title.includes('测试集'))
  if (!hasMock) {
    taskStore.forceInjectMockData()
  }
})

const openDetail = (task: ITaskItem) => {
  selectedTaskId.value = task.id
  isDrawerOpen.value = true
}

const quickAdd = (col: string) => {
  const now = new Date()
  const defaultDate = new Date()
  if (now.getHours() >= 21) {
    defaultDate.setDate(defaultDate.getDate() + 1)
  }

  const timestamp = defaultDate.getTime()

  const newTask = taskStore.createTask({ 
    title: '', 
    kanban_col: col as KanbanColumn,
    period: 'daily',
    plan_date: timestamp,
    due_date: timestamp
  })
  openDetail(newTask)
}

const onDragChange = (evt: any, col: string) => {
  if (evt.added) {
    taskStore.moveTaskColumn(evt.added.element.id, col as KanbanColumn)
  }
}
</script>

<style scoped>
.today-board-container {
  height: calc(100vh - var(--topbar-height, 72px));
  display: flex;
  flex-direction: column;
  padding: 24px 40px;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.kanban-wrapper {
  display: flex;
  gap: 24px;
  height: 100%;
  align-items: flex-start;
}

.kanban-column {
  flex: 1;
  min-width: 320px;
  background: var(--vcp-bg-column, #f5f4ee);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  overflow: hidden;
  transition: background 0.3s ease;
}

.col-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  font-weight: 600;
  color: var(--vcp-text-main);
  font-size: 15px;
}

.col-title {
  display: flex;
  align-items: center;
}

.count {
  margin-left: 10px;
  color: var(--vcp-text-sub);
  font-size: 12px;
  font-weight: 500;
  background: rgba(62, 58, 54, 0.08);
  padding: 2px 8px;
  border-radius: 12px;
}

.ghost-add-btn {
  background: transparent;
  border: none;
  color: var(--vcp-text-sub);
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.ghost-add-btn:hover {
  background: rgba(62, 58, 54, 0.08);
  color: var(--vcp-text-main);
}

.task-list {
  flex: 1;
  padding: 0 20px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 120px;
}

/* ✨ 看板专属隐身魔法：加上 !important 夺取权重 ✨ */
.task-list::-webkit-scrollbar { 
  width: 4px !important; 
  background: transparent !important; 
}
.task-list::-webkit-scrollbar-thumb { 
  background: transparent !important; 
  border-radius: 4px !important; 
  transition: background 0.3s !important; 
}
.kanban-column:hover .task-list::-webkit-scrollbar-thumb { 
  background: rgba(62, 58, 54, 0.1) !important; 
}
.task-list::-webkit-scrollbar-thumb:hover { 
  background: rgba(62, 58, 54, 0.25) !important; 
}

.ghost-card {
  opacity: 0.4;
  background: rgba(62, 58, 54, 0.05) !important;
  border: 1px dashed rgba(62, 58, 54, 0.2) !important;
}
.drag-card {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
  transform: rotate(2deg);
}
</style>