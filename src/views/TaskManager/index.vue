<template>
  <div class="task-manager-page">
    <Dashboard />
    <LongTermPanel />
    <ToolBar @create="openCreateDialog" />
    
    <!-- 过滤与搜索区可以整合进 ToolBar，或者为了总列表在此处加一个快捷过滤器 -->
    <div class="view-container" v-loading="store.isLoading">
      <!-- 总列表视图 (AllTasksView)，与看板视图切换使用 -->
      <component :is="viewComponent" @open-detail="openDetailDrawer" />
    </div>

    <TaskCreateDialog ref="createDialogRef" />
    <DetailDrawer ref="detailDrawerRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useTaskStore } from '@/stores/taskStore';
import Dashboard from './components/Dashboard.vue';
import LongTermPanel from './components/LongTermPanel.vue';
import ToolBar from './components/ToolBar.vue';
import TableView from './components/views/TableView.vue';
import KanbanView from './components/views/KanbanView.vue';
import AllTasksView from './components/views/AllTasksView.vue'; // 我们稍后新建这个视图
import TaskCreateDialog from './components/TaskCreateDialog.vue';
import DetailDrawer from './components/shared/DetailDrawer.vue';
import type { ITaskItem } from '@/types/task';

const store = useTaskStore();
const createDialogRef = ref();
const detailDrawerRef = ref();

const openCreateDialog = () => {
  createDialogRef.value?.open();
};

const openDetailDrawer = (task: ITaskItem) => {
  detailDrawerRef.value?.open(task);
};

const viewComponent = computed(() => {
  if (store.currentView === 'kanban') return KanbanView;
  if (store.currentView === 'all_list') return AllTasksView;
  return TableView; // 默认或者其他的列表视图
});

onMounted(() => {
  store.loadTasks();
});
</script>

<style scoped>
.task-manager-page {
  padding: 20px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* 给整个任务管理页面添加上下滚动条 */
}

/* 美化整个页面的滚动条 */
.task-manager-page::-webkit-scrollbar {
  width: 8px;
}
.task-manager-page::-webkit-scrollbar-track {
  background: transparent;
}
.task-manager-page::-webkit-scrollbar-thumb {
  background-color: #E0E0E0;
  border-radius: 10px;
}
.task-manager-page::-webkit-scrollbar-thumb:hover {
  background-color: #C5C5C5;
}

.view-container {
  flex: 1;
  overflow: visible; /* 改为 visible 允许内容撑开页面 */
}
</style>
