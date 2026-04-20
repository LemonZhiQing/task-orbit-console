<template>
  <div class="kanban-board" style="display: flex; gap: 20px; align-items: flex-start; padding: 20px 0;">
    <!-- 看板列 -->
    <div 
      class="kanban-column" 
      v-for="col in columns" 
      :key="col.status"
      style="background: #F1F5F9; border-radius: 8px; width: 33.33%; min-height: 500px; padding: 15px;"
    >
      <!-- 列标题 -->
      <div class="column-header" style="font-weight: bold; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>{{ col.icon }}</span>
          <span style="font-size: 16px; color: #334155;">{{ col.label }}</span>
        </div>
        <el-tag type="info" size="small" round>{{ col.list.length }}</el-tag>
      </div>

      <!-- 拖拽区域 -->
      <draggable
        v-model="col.list"
        group="tasks"
        item-key="id"
        animation="200"
        ghost-class="ghost-card"
        @change="(evt: any) => handleDragChange(evt, col.status)"
        class="task-list-wrapper"
      >
        <template #item="{ element }">
          <div style="margin-bottom: 12px; cursor: grab;">
            <TaskCard :task="element" @click="openDetailDrawer(element)" />
          </div>
        </template>
        <!-- 空状态占位 -->
        <template #footer v-if="col.list.length === 0">
          <div style="padding: 20px; text-align: center; color: #94A3B8; font-size: 14px; border: 2px dashed #CBD5E1; border-radius: 8px;">
            拖拽任务到这里
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive, onMounted } from 'vue';
import draggable from 'vuedraggable';
import { useTaskStore } from '@/stores/taskStore';
import TaskCard from '../shared/TaskCard.vue';

const store = useTaskStore();

// 核心避坑: 建立本地 Ref 副本, 避免直接修改 computed 只读属性
const localTodo = ref([...store.todoTasks]);
const localInProgress = ref([...store.inProgressTasks]);
const localDone = ref([...store.doneTasks]);

// 监听 Store 变化，同步到本地副本
watch(() => store.todoTasks, (v) => { localTodo.value = [...v]; }, { deep: true });
watch(() => store.inProgressTasks, (v) => { localInProgress.value = [...v]; }, { deep: true });
watch(() => store.doneTasks, (v) => { localDone.value = [...v]; }, { deep: true });

const columns = reactive([
  { status: 'todo', label: '待办', icon: '🕒', list: localTodo },
  { status: 'in_progress', label: '进行中', icon: '🔥', list: localInProgress },
  { status: 'done', label: '已完成', icon: '✅', list: localDone },
]);

const emit = defineEmits<{
  (e: 'open-detail', task: any): void
}>();

// 处理拖拽改变
const handleDragChange = (evt: any, newStatus: string) => {
  if (evt.added) {
    // 触发 store 的乐观更新
    store.updateTaskStatus(evt.added.element.id, newStatus as any);
  }
};

// 点击卡片打开详情
const openDetailDrawer = (task: any) => {
  emit('open-detail', task);
};

onMounted(() => {
    store.loadTasks()
})
</script>

<style scoped>
.kanban-board {
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden; /* 这里保持隐藏，由父页面处理垂直滚动 */
}

.kanban-column {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  height: auto; /* 允许列根据内容撑开 */
}

.task-list-wrapper {
  /* 去掉固定高度和滚动条限制，让卡片自然撑开列的高度 */
  flex: 1;
  padding: 0 8px;
}


.ghost-card {
  opacity: 0.4;
  background-color: #E2E8F0;
  border: 2px dashed #94A3B8;
  border-radius: 8px;
}
</style>
