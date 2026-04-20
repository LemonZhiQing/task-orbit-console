<template>
  <div class="all-tasks-view">
    <el-card shadow="never" class="table-card">
      
      <!-- 搜索与高级过滤栏 -->
      <div class="filter-bar">
         <el-input
            v-model="store.searchQuery"
            placeholder="搜索任务标题或项目名称..."
            class="search-input"
            clearable
            :prefix-icon="IEpSearch"
         />
         <div class="filter-actions">
           <!-- 使用深灰色，避免与白底背景冲突导致看不清 -->
           <el-dropdown trigger="click">
             <el-button type="info" plain :icon="IEpFilter">
               快速过滤
             </el-button>
             <template #dropdown>
               <el-dropdown-menu>
                 <el-dropdown-item @click="setFilterStatus('')">全部任务</el-dropdown-item>
                 <el-dropdown-item divided @click="setFilterStatus('todo')">仅看待办</el-dropdown-item>
                 <el-dropdown-item @click="setFilterStatus('in_progress')">仅看进行中</el-dropdown-item>
                 <el-dropdown-item @click="setFilterStatus('done')">仅看已完成</el-dropdown-item>
               </el-dropdown-menu>
             </template>
           </el-dropdown>
         </div>
      </div>

      <!-- 数据表格 -->
      <el-table
        :data="displayTasks"
        style="width: 100%"
        height="calc(100vh - 350px)"
        row-key="id"
        stripe
        highlight-current-row
        @row-click="handleRowClick"
      >
        <el-table-column prop="title" label="任务名称" min-width="250" show-overflow-tooltip>
           <template #default="{ row }">
              <span class="task-title">{{ row.title }}</span>
           </template>
        </el-table-column>
        
        <el-table-column prop="properties.status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.properties.status)" size="small" effect="light">
              {{ getStatusText(row.properties.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="properties.plan_date" label="计划日期" width="120" sortable />
        
        <el-table-column prop="properties.project" label="所属项目" width="150" show-overflow-tooltip />

        <el-table-column label="优先级" width="90" sortable sort-by="properties.priority">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.properties.priority)" size="small" effect="plain">
              {{ row.properties.priority }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="进度" width="150">
          <template #default="{ row }">
             <div class="progress-col">
               <span class="progress-text">{{ row.ai_meta.progress }}%</span>
               <el-progress 
                  :percentage="row.ai_meta.progress" 
                  :show-text="false" 
                  :status="row.ai_meta.progress === 100 ? 'success' : ''"
                  style="width: 80px"
               />
             </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <!-- 统一采用更明显的 primary 颜色 -->
            <el-button link type="primary" style="color: var(--el-color-primary);" size="small" @click.stop="handleRowClick(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
           <el-empty description="暂无任务数据" />
        </template>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTaskStore } from '@/stores/taskStore';
import type { ITaskItem } from '@/types/task';
import { Search as IEpSearch, Filter as IEpFilter } from '@element-plus/icons-vue';

const store = useTaskStore();
const currentStatusFilter = ref(''); // 空代表不过滤状态

// 结合顶部搜索框和状态过滤
const displayTasks = computed(() => {
  let tasks = store.filteredTasks;
  if (currentStatusFilter.value) {
    tasks = tasks.filter(t => t.properties.status === currentStatusFilter.value);
  }
  return tasks;
});

const setFilterStatus = (status: string) => {
  currentStatusFilter.value = status;
};

const emit = defineEmits<{
  (e: 'open-detail', task: ITaskItem): void
}>();

const handleRowClick = (row: ITaskItem) => {
  emit('open-detail', row);
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'todo': return '待办';
    case 'in_progress': return '进行中';
    case 'done': return '已完成';
    default: return '未知';
  }
};

const getStatusType = (status: string) => {
  switch (status) {
    case 'todo': return 'info';
    case 'in_progress': return 'primary';
    case 'done': return 'success';
    default: return 'info';
  }
};

const getPriorityType = (priority: string) => {
  switch (priority) {
    case 'P1': return 'danger';
    case 'P2': return 'warning';
    case 'P3': return 'info';
    default: return 'info';
  }
};
</script>

<style scoped>
.all-tasks-view {
  height: 100%;
}

.table-card {
  height: 100%;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.table-card :deep(.el-card__body) {
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  gap: 15px;
}

.search-input {
  max-width: 350px;
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.task-title {
  font-weight: 500;
  color: var(--el-text-color-primary);
  cursor: pointer;
}

.task-title:hover {
  color: var(--el-color-primary);
}

.progress-col {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-text {
  font-size: 12px;
  color: var(--el-text-color-regular);
  min-width: 30px;
}
</style>