<template>
  <el-dialog
    v-model="dialogVisible"
    title="新建任务"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      label-position="right"
    >
      <el-form-item label="任务名称" prop="title">
        <el-input v-model="form.title" placeholder="请输入任务名称" />
      </el-form-item>

      <el-form-item label="所属项目" prop="properties.project">
        <el-select
          v-model="form.properties.project"
          placeholder="选择或输入项目名称"
          filterable
          allow-create
          default-first-option
          style="width: 100%"
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

      <el-form-item label="计划日期" prop="properties.plan_date">
        <el-date-picker
          v-model="form.properties.plan_date"
          type="date"
          placeholder="选择日期"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>

      <el-row>
        <el-col :span="12">
          <el-form-item label="优先级" prop="properties.priority">
            <el-select v-model="form.properties.priority" style="width: 100%">
              <el-option label="P1 (高)" value="P1" />
              <el-option label="P2 (中)" value="P2" />
              <el-option label="P3 (低)" value="P3" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="负责人" prop="ai_meta.agent_in_charge">
             <el-select v-model="form.ai_meta.agent_in_charge" placeholder="指派负责人" style="width: 100%">
                <el-option label="晴天" value="晴天" />
                <el-option label="系统" value="System" />
             </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="周期标签" prop="properties.tags">
            <el-select
              v-model="form.properties.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="例如：w12, m3, q1"
              style="width: 100%"
            >
              <el-option label="本周 (w12)" value="w12" />
              <el-option label="下周 (w13)" value="w13" />
              <el-option label="本月 (m3)" value="m3" />
              <el-option label="下月 (m4)" value="m4" />
              <el-option label="第一季度 (q1)" value="q1" />
              <el-option label="今年 (y2026)" value="y2026" />
            </el-select>
      </el-form-item>

      <el-row>
          <el-col :span="12">
            <el-form-item label="计划量" prop="properties.metrics.plan_amount">
              <el-input-number
                v-model="form.properties.metrics.plan_amount"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="已完成量" prop="properties.metrics.completed_amount">
              <el-input-number
                v-model="form.properties.metrics.completed_amount"
                :min="0"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
      </el-row>

      <el-row>
        <el-col :span="12">
          <el-form-item label="番茄数" prop="ai_meta.pomodoro_spent">
            <el-input-number
              v-model="form.ai_meta.pomodoro_spent"
              :min="0"
              style="width: 100%"
              placeholder="已花番茄钟"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="备注" prop="memo">
        <el-input
          v-model="form.memo"
          type="textarea"
          :rows="3"
          placeholder="轻量短备注或 Checklist"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm(formRef)" :loading="submitting">
          确定
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { useTaskStore } from '@/stores/taskStore';
import type { ITaskItem } from '@/types/task';
import { ElMessage } from 'element-plus';

const store = useTaskStore();
const dialogVisible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

// 动态获取当前选定周期标签下的所有项目（长期任务名）
const availableProjects = computed(() => {
    let projectsMap = new Map<string, { title: string, tags: string[] }>();
    
    store.taskList.forEach(t => {
      // 1. 如果这个任务本身是一个大项目（有计划量且带有周期标签）
      if (t.properties.tags && t.properties.tags.length > 0 && t.properties.metrics?.plan_amount > 0) {
          projectsMap.set(t.title, { title: t.title, tags: t.properties.tags });
      }
      // 2. 顺便收集系统中曾经出现过的所有项目归属名称
      if (t.properties.project && t.properties.project.trim() !== '') {
          if (!projectsMap.has(t.properties.project)) {
             projectsMap.set(t.properties.project, { title: t.properties.project, tags: [] });
          }
      }
    });
    
    return Array.from(projectsMap.values());
});

const getInitialForm = () => ({
  title: '',
  properties: {
    status: 'todo' as const,
    plan_date: new Date().toISOString().split('T')[0],
    project: '',
    priority: 'P2' as const,
    task_nature: '常规',
    tags: [],
    metrics: {
      plan_amount: 0,
      completed_amount: 0,
      unit: '番茄',
      estimated_days: 1
    }
  },
  ai_meta: {
    progress: 0,
    agent_in_charge: '晴天',
    pomodoro_spent: 0,
    reminder_rule: 'daily' as const
  },
  knowledge_refs: {
    tags: [],
    diary_ids: [],
    external_urls: []
  },
  memo: ''
});

const form = reactive(getInitialForm());

const rules = reactive<FormRules>({
  title: [
    { required: true, message: '请输入任务名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
  ],
  'properties.plan_date': [
    { required: true, message: '请选择计划执行日', trigger: 'change' },
  ],
});

const open = () => {
  Object.assign(form, getInitialForm());
  dialogVisible.value = true;
};

defineExpose({ open });

const handleClose = () => {
  formRef.value?.resetFields();
};

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;
  await formEl.validate(async (valid, fields) => {
    if (valid) {
      submitting.value = true;
      try {
        // 创建任务前，基于计划量和完成量自动计算进度
        const plan = form.properties.metrics.plan_amount || 0;
        const completed = (form.properties.metrics as any).completed_amount || 0;
        let initialProgress = 0;
        if (plan > 0) {
            initialProgress = Math.min(100, Math.round((completed / plan) * 100));
        }
        
        const newTaskData = JSON.parse(JSON.stringify(form));
        newTaskData.ai_meta.progress = initialProgress;

        const newTask: ITaskItem = {
          ...newTaskData,
          id: `${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${form.title}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await store.createTask(newTask);
        ElMessage.success('任务创建成功');
        dialogVisible.value = false;
      } catch (error) {
        ElMessage.error('创建任务失败');
        console.error(error);
      } finally {
        submitting.value = false;
      }
    } else {
      console.log('error submit!', fields);
    }
  });
};
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
