<template>
  <el-drawer
    v-model="drawerVisible"
    title="任务详情"
    direction="rtl"
    size="400px"
    @close="handleClose"
  >
    <template #header>
      <div class="drawer-header">
        <span class="drawer-title">{{ task?.title || '任务详情' }}</span>
        <el-tag
          size="small"
          :type="task?.properties.status === 'done' ? 'success' : 'info'"
          effect="plain"
          style="margin-left: 10px;"
        >
          {{ getStatusText(task?.properties.status) }}
        </el-tag>
      </div>
    </template>

    <div class="drawer-content" v-if="task">
      <!-- 新区块: 基本信息快捷编辑 -->
      <div class="section-block">
        <div class="section-title">
          <el-icon><i-ep-edit /></el-icon> 任务属性
        </div>
        <el-form :model="task.properties" label-position="left" label-width="80px" size="small">
          <!-- 周期标签 -->
          <el-form-item label="周期标签">
            <el-select
              v-model="task.properties.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="例如：w12, m3, q1"
              style="width: 100%"
              @change="saveProperties"
            >
              <el-option label="本周 (w12)" value="w12" />
              <el-option label="下周 (w13)" value="w13" />
              <el-option label="本月 (m3)" value="m3" />
              <el-option label="下月 (m4)" value="m4" />
              <el-option label="第一季度 (q1)" value="q1" />
              <el-option label="今年 (y2026)" value="y2026" />
            </el-select>
          </el-form-item>

          <!-- 工作量统计 -->
          <el-form-item label="计划量">
            <el-input-number
              v-model="task.properties.metrics.plan_amount"
              :min="0"
              @change="saveProperties"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="已完成量">
            <el-input-number
              v-model="task.properties.metrics.completed_amount"
              :min="0"
              @change="saveProperties"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="优先级">
            <el-radio-group v-model="task.properties.priority" @change="saveProperties">
              <el-radio-button label="P1">P1 (高)</el-radio-button>
              <el-radio-button label="P2">P2 (中)</el-radio-button>
              <el-radio-button label="P3">P3 (低)</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="截止日期">
            <el-date-picker
              v-model="task.properties.plan_date"
              type="date"
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              @change="saveProperties"
            />
          </el-form-item>
          <el-form-item label="所属项目">
            <el-select
              v-model="task.properties.project"
              placeholder="选择或输入项目名称"
              filterable
              allow-create
              default-first-option
              style="width: 100%"
              @change="saveProperties"
            >
               <el-option
                  v-for="p in availableProjects"
                  :key="p.title"
                  :label="p.title"
                  :value="p.title"
               >
                 <span style="float: left">{{ p.title }}</span>
                 <span
                    v-if="p.tags.length > 0"
                    style="
                      float: right;
                      color: var(--el-text-color-secondary);
                      font-size: 12px;
                      background: var(--el-fill-color-light);
                      padding: 0 6px;
                      border-radius: 10px;
                    "
                  >
                    {{ p.tags.join(', ') }}
                  </span>
               </el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="负责人">
             <el-select v-model="task.ai_meta.agent_in_charge" placeholder="指派负责人" style="width: 100%" @change="saveAiMeta">
                <el-option label="晴天" value="晴天" />
                <el-option label="系统" value="System" />
             </el-select>
          </el-form-item>
          <el-form-item label="番茄数">
            <el-input-number
              v-model="task.ai_meta.pomodoro_spent"
              :min="0"
              @change="saveAiMeta"
              style="width: 100%"
              size="small"
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- 区块1: AI 互动区 -->
      <div class="section-block ai-interaction-block">
        <div class="section-title">
          <el-icon><i-ep-chat-dot-round /></el-icon> AI 催办与互动
        </div>
        <div class="agent-message">
          <div class="agent-avatar">
            <el-avatar :size="32" style="background-color: #409EFF">{{ task.ai_meta.agent_in_charge.charAt(0) }}</el-avatar>
          </div>
          <div class="message-content">
            <div class="agent-name">{{ task.ai_meta.agent_in_charge }}</div>
            <div class="message-bubble" v-if="task.properties.status === 'done'">
              主人太棒啦！这个任务已经完美完成了哦~ 💖
            </div>
            <div class="message-bubble" v-else-if="isOverdue">
              呜呜，主人，这个任务已经逾期啦！快点来处理嘛，不要让我一直担心~ 😭
            </div>
            <div class="message-bubble" v-else>
              主人加油！目前进度 {{ task.ai_meta.progress }}%，还有 {{ remainingDays }} 天，我一直在看着你哦！💪
            </div>
          </div>
        </div>
      </div>

      <!-- 区块2: 轻量备注区 -->
      <div class="section-block">
        <div class="section-title">
          <el-icon><i-ep-document /></el-icon> 备注 & Checklist
        </div>
        <el-input
          v-model="localMemo"
          type="textarea"
          :rows="6"
          placeholder="可以在这里写下简单的备注或勾选列表..."
          @blur="saveMemo"
        />
        <div class="save-hint" v-if="memoSaved">已保存</div>
      </div>

      <!-- 区块3: 知识关联卡片 -->
      <div class="section-block">
        <div class="section-title">
          <el-icon><i-ep-link /></el-icon> 知识关联
        </div>
        
        <div class="refs-container">
          <!-- Tags -->
          <div class="ref-group" v-if="task.knowledge_refs.tags.length > 0">
            <div class="ref-label">关联标签</div>
            <div class="ref-tags">
              <el-tag 
                v-for="tag in task.knowledge_refs.tags" 
                :key="tag" 
                size="small" 
                class="ref-tag"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>
          
          <!-- Diaries (模拟) -->
          <div class="ref-group" v-if="task.knowledge_refs.diary_ids.length > 0">
            <div class="ref-label">关联日记</div>
            <div class="ref-list">
              <div 
                v-for="id in task.knowledge_refs.diary_ids" 
                :key="id" 
                class="ref-item"
              >
                <el-icon><i-ep-document-copy /></el-icon> 日记条目: {{ id.substring(0, 8) }}...
              </div>
            </div>
          </div>

          <div class="empty-refs" v-if="task.knowledge_refs.tags.length === 0 && task.knowledge_refs.diary_ids.length === 0">
            暂无知识关联
          </div>
        </div>
      </div>

      <!-- 任务进度调节 -->
      <div class="section-block">
         <div class="section-title">
          <el-icon><i-ep-odometer /></el-icon> 进度调节
        </div>
        <div class="progress-slider">
          <!-- 改为禁用状态的进度条，展示由计算属性得出的百分比 -->
          <el-progress
            :percentage="computedProgress"
            :stroke-width="12"
            status="success"
            striped
            striped-flow
          />
        </div>
      </div>

    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { ITaskItem } from '@/types/task';
import { useTaskStore } from '@/stores/taskStore';
import {
  ChatDotRound as IEpChatDotRound,
  Document as IEpDocument,
  Link as IEpLink,
  DocumentCopy as IEpDocumentCopy,
  Odometer as IEpOdometer,
  Edit as IEpEdit
} from '@element-plus/icons-vue';

const store = useTaskStore();
const drawerVisible = ref(false);
const task = ref<ITaskItem | null>(null);

// 动态获取当前选定周期标签下的所有项目（长期任务名）
const availableProjects = computed(() => {
    let projectsMap = new Map<string, { title: string, tags: string[] }>();
    
    store.taskList.forEach((t: ITaskItem) => {
      // 1. 如果这个任务本身是一个大项目（有计划量且带有周期标签）
      if (t.properties.tags && t.properties.tags.length > 0 && (t.properties.metrics?.plan_amount || 0) > 0) {
          projectsMap.set(t.title, { title: t.title, tags: t.properties.tags });
      }
      // 2. 顺便收集系统中曾经出现过的所有项目归属名称（即使没有周期标签）
      if (t.properties.project && t.properties.project.trim() !== '') {
          if (!projectsMap.has(t.properties.project)) {
             projectsMap.set(t.properties.project, { title: t.properties.project, tags: [] });
          }
      }
    });
    
    return Array.from(projectsMap.values());
});

const localMemo = ref('');
const memoSaved = ref(false);

const localProgress = ref(0);

// 将原本拖动的进度改为基于 metrics 计算的进度
const computedProgress = computed(() => {
  if (!task.value || !task.value.properties.metrics) return 0;
  const plan = task.value.properties.metrics.plan_amount || 0;
  const completed = task.value.properties.metrics.completed_amount || 0;
  if (plan === 0) return 0;
  return Math.min(100, Math.round((completed / plan) * 100));
});

const open = (taskData: ITaskItem) => {
  task.value = JSON.parse(JSON.stringify(taskData));
  if (task.value) {
      // 确保 metrics 和 tags 对象存在，防止旧数据报错
      if (!task.value.properties.metrics) {
        task.value.properties.metrics = { plan_amount: 0, completed_amount: 0, unit: '', estimated_days: 0 };
      }
      if (!task.value.properties.tags) {
        task.value.properties.tags = [];
      }
      localMemo.value = task.value.memo || '';
  }
  drawerVisible.value = true;
};

defineExpose({ open });

const handleClose = () => {
  task.value = null;
  memoSaved.value = false;
};

// 工具函数
const getStatusText = (status?: string) => {
  switch(status) {
    case 'todo': return '待办';
    case 'in_progress': return '进行中';
    case 'done': return '已完成';
    default: return '未知';
  }
};

const isOverdue = computed(() => {
  if (!task.value || task.value.properties.status === 'done') return false;
  const todayStr = new Date().toISOString().split('T')[0];
  return task.value.properties.plan_date < todayStr;
});

const remainingDays = computed(() => {
  if (!task.value) return 0;
  const planDate = new Date(task.value.properties.plan_date);
  const today = new Date(new Date().toISOString().split('T')[0]);
  const diffTime = planDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// 保存逻辑
const saveProperties = async () => {
    if (!task.value) return;
    
    // 如果修改了 plan_amount 或 completed_amount，同步更新 ai_meta.progress
    // 以便让看板外层的卡片也能读取到最新的计算进度
    task.value.ai_meta.progress = computedProgress.value;

    try {
        await store.updateTaskPartial(task.value.id, {
            properties: task.value.properties,
            ai_meta: task.value.ai_meta
        });
        // 乐观更新 Store
        const storeTask = store.taskList.find(t => t.id === task.value?.id);
        if (storeTask) {
            storeTask.properties = { ...task.value.properties };
            storeTask.ai_meta.progress = task.value.ai_meta.progress;
            
            // 如果计算进度到达 100%，自动变为已完成状态
            if (task.value.ai_meta.progress === 100 && storeTask.properties.status !== 'done') {
                store.updateTaskStatus(storeTask.id, 'done');
                if (task.value) task.value.properties.status = 'done';
            }
        }
    } catch (error) {
        console.error('保存属性失败', error);
    }
};

const saveAiMeta = async () => {
    if (!task.value) return;
    try {
        await store.updateTaskPartial(task.value.id, {
            ai_meta: task.value.ai_meta
        });
        // 乐观更新 Store
        const storeTask = store.taskList.find(t => t.id === task.value?.id);
        if (storeTask) {
            storeTask.ai_meta = { ...task.value.ai_meta };
        }
    } catch (error) {
        console.error('保存AI元数据失败', error);
    }
};

let memoTimeout: number;
const saveMemo = async () => {
  if (!task.value) return;
  
  // 乐观更新 Store
  const storeTask = store.taskList.find(t => t.id === task.value?.id);
  if (storeTask) {
    storeTask.memo = localMemo.value;
  }

  try {
    await store.updateTaskPartial(task.value.id, { memo: localMemo.value });
    memoSaved.value = true;
    clearTimeout(memoTimeout);
    memoTimeout = window.setTimeout(() => {
      memoSaved.value = false;
    }, 2000);
  } catch (error) {
    console.error('保存备注失败', error);
  }
};


</script>

<style scoped>
.drawer-header {
  display: flex;
  align-items: center;
}

.drawer-title {
  font-size: 16px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.drawer-content {
  padding: 0 20px 20px;
}

.section-block {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: bold;
  color: var(--el-text-color-regular);
  margin-bottom: 12px;
}

/* AI 互动区 */
.ai-interaction-block {
  background-color: #F8FAFC;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #E2E8F0;
}

.agent-message {
  display: flex;
  gap: 12px;
}

.agent-avatar {
  flex-shrink: 0;
}

.message-content {
  flex: 1;
}

.agent-name {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.message-bubble {
  background-color: white;
  padding: 10px 12px;
  border-radius: 0 12px 12px 12px;
  font-size: 13px;
  color: var(--el-text-color-primary);
  line-height: 1.5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* 备注区 */
.save-hint {
  font-size: 12px;
  color: var(--el-color-success);
  margin-top: 4px;
  text-align: right;
  height: 16px;
}

/* 知识关联区 */
.refs-container {
  background-color: #FAFAFA;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 12px;
}

.ref-group {
  margin-bottom: 12px;
}

.ref-group:last-child {
  margin-bottom: 0;
}

.ref-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.ref-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ref-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.ref-item:hover {
  background-color: var(--el-color-primary-light-8);
}

.empty-refs {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  text-align: center;
  padding: 10px 0;
}

.progress-slider {
    padding: 0 10px;
}
</style>
