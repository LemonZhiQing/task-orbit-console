<template>
  <div class="toolbar-container">
    <div class="left-actions">
      <el-button type="primary" :icon="Plus" @click="handleCreate">新建任务</el-button>
    </div>
    
    <div class="right-actions">
      <el-input
        v-model="store.searchQuery"
        placeholder="搜索任务或项目..."
        :prefix-icon="Search"
        clearable
        class="search-input"
      />
      
      <el-radio-group v-model="store.currentView" size="default">
        <el-radio-button label="kanban">
          <el-icon><i-ep-data-board /></el-icon> 看板
        </el-radio-button>
        <el-radio-button label="all_list">
          <el-icon><i-ep-tickets /></el-icon> 总列表
        </el-radio-button>
      </el-radio-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTaskStore } from '@/stores/taskStore';
import { Plus, Search, DataBoard as IEpDataBoard, List as IEpList, Tickets as IEpTickets } from '@element-plus/icons-vue';

const store = useTaskStore();

const emit = defineEmits<{
  (e: 'create'): void
}>();

const handleCreate = () => {
  emit('create');
};
</script>

<style scoped>
.toolbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background-color: var(--el-bg-color-overlay);
  padding: 15px 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.left-actions {
  display: flex;
  align-items: center;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.search-input {
  width: 250px;
}
</style>
