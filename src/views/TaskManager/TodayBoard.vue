<template>
  <div class="today-board-container">
    <div class="kanban-wrapper">
      <div class="kanban-column" v-for="col in columns" :key="col.key">
        <div class="col-header">
          <div class="col-title">{{ col.label }} <span class="count">{{ columnLists[col.key].length }}</span></div>
          <button class="ghost-add-btn" @click="quickAdd(col.key)" title="极速新建任务">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
        <draggable 
          v-model="columnLists[col.key]" 
          group="tasks" 
          item-key="id" 
          class="task-list" 
          @change="onDragChange(col.key)"
          ghost-class="ghost-card"
          drag-class="drag-card"
        >
          <template #item="{ element }">
            <TaskCard :task="element" @click="openDetail(element)" />
          </template>
        </draggable>
      </div>
    </div>

    <DetailDrawer :visible="isDrawerOpen" :task-id="selectedTaskId" @close="isDrawerOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import draggable from 'vuedraggable'
import TaskCard from './components/TaskCard.vue'
import DetailDrawer from './components/DetailDrawer.vue'
import { useTaskStore } from '@/stores/taskStore'
import type { ITaskItem, KanbanColumn } from '@/types/task'

const taskStore = useTaskStore()
const isDrawerOpen = ref(false)
const selectedTaskId = ref<string | null>(null)

const columns: { key: KanbanColumn, label: string }[] = [
  { key: 'todo', label: '待办' },
  { key: 'in_progress', label: '进行中' },
  { key: 'done', label: '已完成' }
]

const columnLists = computed<Record<KanbanColumn, ITaskItem[]>>({
  get: () => ({
    todo: [...taskStore.tasksByColumn.todo],
    in_progress: [...taskStore.tasksByColumn.in_progress],
    done: [...taskStore.tasksByColumn.done]
  }),
  set: () => {}
})

onMounted(() => {
  taskStore.hydrateFromServer().catch(() => {})
})

const openDetail = (task: ITaskItem) => {
  selectedTaskId.value = task.id
  isDrawerOpen.value = true
}

const quickAdd = (col: KanbanColumn) => {
  const now = new Date()
  const defaultDate = new Date()
  if (now.getHours() >= 21) {
    defaultDate.setDate(defaultDate.getDate() + 1)
  }

  const timestamp = defaultDate.getTime()
  const newTask = taskStore.createTask({ 
    title: '', 
    kanban_col: col,
    period: 'daily',
    plan_date: timestamp,
    due_date: timestamp
  })
  openDetail(newTask)
}

const onDragChange = (col: KanbanColumn) => {
  taskStore.setColumnTasks(col, columnLists.value[col])
}
</script>

<style scoped>
.today-board-container { height: calc(100vh - var(--topbar-height, 72px)); display: flex; flex-direction: column; padding: 24px 40px; box-sizing: border-box; overflow: hidden; position: relative; }
.kanban-wrapper { display: flex; gap: 24px; height: 100%; align-items: flex-start; }
.kanban-column { flex: 1; min-width: 320px; background: var(--vcp-bg-column, #f5f4ee); border-radius: 16px; display: flex; flex-direction: column; max-height: 100%; overflow: hidden; transition: background 0.3s ease; }
.col-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; font-weight: 600; color: var(--vcp-text-main); font-size: 15px; }
.col-title { display: flex; align-items: center; }
.count { margin-left: 10px; color: var(--vcp-text-sub); font-size: 12px; font-weight: 500; background: rgba(62, 58, 54, 0.08); padding: 2px 8px; border-radius: 12px; }
.ghost-add-btn { background: transparent; border: none; color: var(--vcp-text-sub); cursor: pointer; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
.ghost-add-btn:hover { background: rgba(62, 58, 54, 0.08); color: var(--vcp-text-main); }
.task-list { flex: 1; padding: 0 20px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; min-height: 120px; }
.task-list::-webkit-scrollbar { width: 4px !important; background: transparent !important; }
.task-list::-webkit-scrollbar-thumb { background: transparent !important; border-radius: 4px !important; transition: background 0.3s !important; }
.kanban-column:hover .task-list::-webkit-scrollbar-thumb { background: rgba(62, 58, 54, 0.1) !important; }
.task-list::-webkit-scrollbar-thumb:hover { background: rgba(62, 58, 54, 0.25) !important; }
.ghost-card { opacity: 0.4; background: rgba(62, 58, 54, 0.05) !important; border: 1px dashed rgba(62, 58, 54, 0.2) !important; }
.drag-card { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important; transform: rotate(2deg); }
</style>