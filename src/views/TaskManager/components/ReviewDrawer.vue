<template>
  <el-drawer
    v-model="visible"
    title="待复习任务"
    size="420px"
    direction="rtl"
    class="review-drawer"
  >
    <div class="review-container" v-if="tasks.length">
      <el-card v-for="task in tasks" :key="task.id" class="review-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span class="task-title">{{ task.title }}</span>
            <el-tag size="small" type="warning">复习</el-tag>
          </div>
        </template>

        <div class="review-body">
          <p v-if="getMemo(task)" class="memo">{{ getMemo(task) }}</p>

          <div v-if="getUrls(task).length" class="link-list">
            <div
              v-for="url in getUrls(task)"
              :key="url"
              class="link-item"
              @click="handleLinkClick(url)"
            >
              {{ formatUrlLabel(url) }}
            </div>
          </div>

          <div class="actions">
            <el-button type="success" plain @click="handleRemember(task)">记住了</el-button>
            <el-button type="warning" plain @click="handleForget(task)">没记住</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <el-empty v-else description="今天没有待复习任务" />
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useTaskStore } from '@/stores/taskStore'
import { taskApi } from '@/api/task'

const visible = defineModel<boolean>({ default: false })
const taskStore = useTaskStore()
const tasks = computed(() => taskStore.todayReviewTasks)

const getKnowledgeRefs = (task: any) => task?.knowledge_refs || { tags: [], diary_ids: [], external_urls: [] }
const getMemo = (task: any) => task?.memo || ''
const getUrls = (task: any) => getKnowledgeRefs(task).external_urls || []

const handleLinkClick = async (url: string) => {
  if (url.startsWith('file://') || /^[a-zA-Z]:\\/.test(url) || /^\//.test(url)) {
    try {
      const res = await taskApi.openLocal(url)
      if (res.success) {
        ElMessage.success('魔法发动！文件已在您的电脑上打开 📁')
      } else {
        ElMessage.error(res.message || '文件打开失败，请检查路径是否正确哦')
      }
    } catch (error) {
      console.error('请求后端代开文件失败', error)
      ElMessage.error('无法连接到后台服务，本地文件打开失败')
    }
  } else {
    window.open(url, '_blank')
  }
}

const formatUrlLabel = (url: string) => {
  if (!url) return '参考链接'
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('bilibili.com') || lowerUrl.includes('b23.tv')) return 'B站视频教程'
  if (lowerUrl.includes('github.com')) return 'GitHub 仓库'
  if (lowerUrl.includes('juejin.cn')) return '掘金文章'
  if (lowerUrl.includes('zhihu.com')) return '知乎讨论'
  if (lowerUrl.startsWith('file://') || lowerUrl.endsWith('.md')) return '本地笔记材料'
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YouTube 视频'

  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return `参考资料 (${domain})`
  } catch (e) {
    return '参考链接'
  }
}

const handleRemember = async (task: any) => {
  try {
    await taskStore.markReviewTask(task.id, true)
    ElMessage.success('知识更牢固了呢！')
  } catch (error) {
    ElMessage.error('网络开了小差，请重试')
  }
}

const handleForget = async (task: any) => {
  try {
    await taskStore.markReviewTask(task.id, false)
    ElMessage.warning('没关系，明天再复习一次！')
  } catch (error) {
    ElMessage.error('网络开了小差，请重试')
  }
}
</script>

<style scoped>
.review-container {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.review-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.task-title {
  font-weight: 600;
}

.review-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.memo {
  margin: 0;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.link-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-item {
  color: var(--el-color-primary);
  cursor: pointer;
  word-break: break-all;
}

.link-item:hover {
  text-decoration: underline;
}

.actions {
  display: flex;
  gap: 10px;
}
</style>
