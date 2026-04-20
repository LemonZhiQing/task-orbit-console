<template>
  <div class="vcp-compact-card">
    <!-- 顶部: 标题 + 优先级 -->
    <div class="card-header">
      <span class="task-title" :title="task.title">{{ task.title }}</span>
      <span class="task-priority">
        <el-icon v-for="i in priorityCount" :key="i" color="#F56C6C"><i-ep-opportunity /></el-icon>
      </span>
    </div>

    <!-- 标签区 -->
    <div class="card-tags">
      <el-tag size="small" type="info" class="tag">{{ task.properties.project }}</el-tag>
      <el-tag
        v-for="tag in task.knowledge_refs.tags.slice(0, 2)"
        :key="tag"
        size="small"
        class="tag"
      >
        {{ tag }}
      </el-tag>
      <span v-if="task.knowledge_refs.tags.length > 2" class="tag-more">...</span>
    </div>

    <!-- 中部: 进度条 -->
    <div class="card-progress">
      <el-progress
        :percentage="task.ai_meta.progress"
        :status="progressStatus"
        :stroke-width="6"
        :show-text="false"
      />
    </div>

    <!-- 底部: 负责人 + 倒计时 -->
    <div class="card-footer">
      <div class="agent-info">
        <el-avatar :size="20" style="background-color: #4A9D9A">{{ task.ai_meta.agent_in_charge.charAt(0) }}</el-avatar>
        <span class="agent-name">{{ task.ai_meta.agent_in_charge }}</span>
      </div>
      <div class="due-date">
        <el-icon><i-ep-clock /></el-icon>
        <span>{{ countdownText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ITaskItem } from '@/types/task';
import { Opportunity as IEpOpportunity, Clock as IEpClock } from '@element-plus/icons-vue';

const props = defineProps<{
  task: ITaskItem;
}>();

// 优先级火焰数量计算
const priorityCount = computed(() => {
  switch (props.task.properties.priority) {
    case 'P1': return 3;
    case 'P2': return 2;
    case 'P3': return 1;
    default: return 1;
  }
});

// 倒计时计算逻辑
const todayStr = new Date().toISOString().split('T')[0];
const isOverdue = computed(() => props.task.properties.plan_date < todayStr && props.task.properties.status !== 'done');

const countdownText = computed(() => {
  if (props.task.properties.status === 'done') return '已完成';
  const planDate = new Date(props.task.properties.plan_date);
  const today = new Date(todayStr);
  const diffTime = planDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `逾期 ${Math.abs(diffDays)} 天`;
  if (diffDays === 0) return '今天截止';
  return `剩余 ${diffDays} 天`;
});

const countdownType = computed(() => {
  if (props.task.properties.status === 'done') return 'success';
  if (isOverdue.value) return 'danger';
  const planDate = new Date(props.task.properties.plan_date);
  const today = new Date(todayStr);
  const diffTime = planDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1) return 'warning';
  return 'info';
});

// 进度条状态
const progressStatus = computed(() => {
  if (props.task.properties.status === 'done') return 'success';
  if (isOverdue.value) return 'exception';
  return ''; // 默认蓝色
});
</script>

<style scoped>
/* 核心卡片样式 */
.vcp-compact-card {
  background: #FFFFFF;
  border-radius: 8px;
  padding: 12px 14px; /* 【关键】调小 padding，让卡片变窄、变紧凑 */
  margin-bottom: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
  border: 1px solid #F0F0F0;
  cursor: grab;
  transition: all 0.2s ease;
}

/* ✨ 悬停时的丝滑微动效 */
.vcp-compact-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.vcp-compact-card:active {
  cursor: grabbing;
}

/* 头部排版 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px; /* 取代了原本的分割线 */
}

/* 【防溢出神器】处理标题过长导致的横向滚动 */
.task-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
  flex: 1;
  margin-right: 8px;
  
  /* 多行文本截断 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-priority {
  display: flex;
  gap: 2px;
  font-size: 14px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tag-more {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 24px;
}

/* 底部排版 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 左侧负责人信息 */
.agent-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.agent-name {
  font-size: 12px;
  color: #666;
}

/* 进度条 */
.card-progress {
  margin-bottom: 10px;
}

/* 右侧日期 */
.due-date {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #D4A373; /* 暖黄色，不刺眼 */
  background: #FFF9F2;
  padding: 2px 8px;
  border-radius: 12px;
}
</style>
