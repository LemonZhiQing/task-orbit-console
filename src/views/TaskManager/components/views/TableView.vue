<template>
  <div class="table-view-container">
    <el-table 
      :data="store.filteredTasks" 
      style="width: 100%" 
      border
      stripe
      @row-click="handleRowClick"
    >
      <!-- 优先级列 -->
      <el-table-column label="优先级" width="80" align="center" sortable sort-by="properties.priority">
        <template #default="scope">
          <el-icon v-for="i in getPriorityCount(scope.row.properties.priority)" :key="i" color="#F56C6C">
            <i-ep-opportunity />
          </el-icon>
        </template>
      </el-table-column>

      <!-- 任务名称 -->
      <el-table-column prop="title" label="任务名称" min-width="200" show-overflow-tooltip>
        <template #default="scope">
          <div style="font-weight: 500;">{{ scope.row.title }}</div>
        </template>
      </el-table-column>

      <!-- 状态列 -->
      <el-table-column prop="properties.status" label="状态" width="120" :filters="statusFilters" :filter-method="filterStatus">
        <template #default="scope">
          <el-select 
            v-model="scope.row.properties.status" 
            size="small"
            @change="(val: any) => handleStatusChange(scope.row.id, val)"
            @click.stop
          >
            <el-option label="🕒 待办" value="todo" />
            <el-option label="🔥 进行中" value="in_progress" />
            <el-option label="✅ 已完成" value="done" />
          </el-select>
        </template>
      </el-table-column>

      <!-- 计划日期 -->
      <el-table-column prop="properties.plan_date" label="计划执行日" width="120" sortable align="center" />

      <!-- 项目归属 -->
      <el-table-column prop="properties.project" label="所属项目" width="120" show-overflow-tooltip>
        <template #default="scope">
          <el-tag size="small" type="info">{{ scope.row.properties.project }}</el-tag>
        </template>
      </el-table-column>

      <!-- 任务性质 -->
      <el-table-column prop="properties.task_nature" label="性质" width="100" align="center">
        <template #default="scope">
          <el-tag size="small" effect="plain">{{ scope.row.properties.task_nature }}</el-tag>
        </template>
      </el-table-column>

      <!-- 计划量 -->
      <el-table-column label="计划量" width="100" align="center">
        <template #default="scope">
          {{ scope.row.properties.metrics.plan_amount }} {{ scope.row.properties.metrics.unit }}
        </template>
      </el-table-column>

      <!-- 进度条 -->
      <el-table-column label="进度" min-width="150">
        <template #default="scope">
          <el-progress 
            :percentage="scope.row.ai_meta.progress" 
            :status="scope.row.properties.status === 'done' ? 'success' : ''"
          />
        </template>
      </el-table-column>
      
      <!-- 负责人 -->
      <el-table-column prop="ai_meta.agent_in_charge" label="负责人" width="100" align="center">
         <template #default="scope">
            <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
              <el-avatar :size="20" style="background-color: #409EFF">{{ scope.row.ai_meta.agent_in_charge.charAt(0) }}</el-avatar>
              <span>{{ scope.row.ai_meta.agent_in_charge }}</span>
            </div>
         </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { useTaskStore } from '@/stores/taskStore';
import { Opportunity as IEpOpportunity } from '@element-plus/icons-vue';
import { onMounted } from 'vue';

const store = useTaskStore();

const emit = defineEmits<{
  (e: 'open-detail', task: any): void
}>();

const getPriorityCount = (priority: string) => {
  switch (priority) {
    case 'P1': return 3;
    case 'P2': return 2;
    case 'P3': return 1;
    default: return 1;
  }
};

const statusFilters = [
  { text: '待办', value: 'todo' },
  { text: '进行中', value: 'in_progress' },
  { text: '已完成', value: 'done' },
];

const filterStatus = (value: string, row: any) => {
  return row.properties.status === value;
};

const handleStatusChange = (taskId: string, newStatus: string) => {
  store.updateTaskStatus(taskId, newStatus as any);
};

const handleRowClick = (row: any) => {
  emit('open-detail', row);
};

onMounted(() => {
    store.loadTasks()
})
</script>

<style scoped>
.table-view-container {
  background-color: var(--el-bg-color-overlay);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

:deep(.el-table__row) {
  cursor: pointer;
}
</style>
