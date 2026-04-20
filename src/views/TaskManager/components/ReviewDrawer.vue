<template>
  <el-drawer
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="今日记忆挑战 🧠"
    size="400px"
    direction="rtl"
    class="review-drawer"
  >
    <div class="review-container">
      <template v-if="reviewTasks && reviewTasks.length > 0">
        <el-card
          v-for="task in reviewTasks"
          :key="task.id"
          class="review-card"
          shadow="hover"
        >
          <template #header>
            <div class="card-header">
              <span class="task-title">{{ task.title }}</span>
              <el-tag size="small" type="success" effect="light" round>
                Lv.{{ getStage(task) }}
              </el-tag>
            </div>
          </template>
          
          <div class="card-content">
            <!-- 备注信息 -->
            <p v-if="getMemo(task)" class="memo-text">
              <el-icon><Document /></el-icon>
              {{ getMemo(task) }}
            </p>
            
            <!-- 知识标签 (指向日记的指针) -->
            <div class="tags-container" v-if="getTags(task).length">
              <el-tag
                v-for="tag in getTags(task)"
                :key="tag"
                size="small"
                type="info"
                effect="plain"
                class="knowledge-tag"
              >
                #{{ tag }}
              </el-tag>
            </div>

            <!-- 外部链接引用 (视频/笔记等附件) -->
            <div class="urls-container" v-if="getUrls(task).length">
              <el-link 
                v-for="url in getUrls(task)" 
                :key="url"
                @click.prevent="handleLinkClick(url)"
                type="primary"
                class="reference-link"
                :underline="false"
              >
                <el-icon><Link /></el-icon> {{ formatUrlLabel(url) }}
              </el-link>
            </div>
          </div>

          <!-- 底部操作区 -->
          <div class="card-actions">
            <el-button 
              type="danger" 
              plain 
              size="default" 
              @click="handleForget(task)"
              class="action-btn"
            >
              ❌ 忘得精光
            </el-button>
            <el-button 
              type="success" 
              size="default" 
              @click="handleRemember(task)"
              class="action-btn"
            >
              ✅ 烂熟于心
            </el-button>
          </div>
        </el-card>
      </template>

      <el-empty 
        v-else 
        description="太棒啦！今天的复习任务全部清空~ 🎉" 
        :image-size="150"
      />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Document, Link } from '@element-plus/icons-vue'
import { useTaskStore } from '@/stores/taskStore'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['update:visible'])

const taskStore = useTaskStore()

// 绑定 Store 中的今日待复习任务 (稍后我们在 taskStore 里实现它)
const reviewTasks = computed(() => taskStore.todayReviewTasks || [])

// === 安全解析工具函数 ===
const getMeta = (task: any) => {
  try {
    const rawMeta = task.ai_meta_json || task.ai_meta;
    if (!rawMeta) return {}
    return typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
  } catch (e) {
    console.error('解析 ai_meta 失败', e)
    return {}
  }
}

// 专门解析 knowledge_refs_json 的函数
const getKnowledgeRefs = (task: any) => {
  try {
    const rawRefs = task.knowledge_refs_json || task.knowledge_refs;
    if (!rawRefs) return {}
    return typeof rawRefs === 'string' ? JSON.parse(rawRefs) : rawRefs;
  } catch (e) {
    console.error('解析 knowledge_refs 失败', e)
    return {}
  }
}

const getStage = (task: any) => {
  const meta = getMeta(task)
  return meta.review_info?.review_stage || 0
}

const getMemo = (task: any) => {
  const refs = getKnowledgeRefs(task)
  return refs.memo || task.memo || ''
}

const getTags = (task: any) => {
  const refs = getKnowledgeRefs(task)
  return refs.tags || []
}

const getUrls = (task: any) => {
  const refs = getKnowledgeRefs(task)
  return refs.external_urls || []
}

// 点击外链处理逻辑 (区分网页与本地文件)
const handleLinkClick = async (url: string) => {
  // 检查是否为本地文件协议或硬盘绝对路径
  if (url.startsWith('file://') || /^[a-zA-Z]:\\/.test(url) || /^\//.test(url)) {
    try {
      // 拦截默认跳转，将路径发送给后端的特权接口
      const response = await fetch('/api/tasks/open-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: url })
      });
      const res = await response.json();
      if (res.success) {
        ElMessage.success('魔法发动！文件已在您的电脑上打开 📁');
      } else {
        ElMessage.error(res.message || '文件打开失败，请检查路径是否正确哦');
      }
    } catch (error) {
      console.error('请求后端代开文件失败', error);
      ElMessage.error('无法连接到后台服务，本地文件打开失败');
    }
  } else {
    // 普通网址正常通过浏览器新标签打开
    window.open(url, '_blank');
  }
};

// 智能识别链接类型，给个友好的名字
const formatUrlLabel = (url: string) => {
  if (!url) return '参考链接';
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('bilibili.com') || lowerUrl.includes('b23.tv')) return 'B站视频教程';
  if (lowerUrl.includes('github.com')) return 'GitHub 仓库';
  if (lowerUrl.includes('juejin.cn')) return '掘金文章';
  if (lowerUrl.includes('zhihu.com')) return '知乎讨论';
  if (lowerUrl.startsWith('file://') || lowerUrl.endsWith('.md')) return '本地笔记材料';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'YouTube 视频';
  
  // 尝试提取域名
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return `参考资料 (${domain})`;
  } catch (e) {
    return '参考链接';
  }
}

// === 交互逻辑 ===
const handleRemember = async (task: any) => {
  try {
    // 调用 Store action 进行乐观更新 (稍后实现)
    if(taskStore.markReviewTask) {
      await taskStore.markReviewTask(task.id, true)
      ElMessage.success('知识更牢固了呢！')
    } else {
      ElMessage.warning('Store 方法暂未接入~')
    }
  } catch (error) {
    ElMessage.error('网络开了小差，请重试')
  }
}

const handleForget = async (task: any) => {
  try {
    if(taskStore.markReviewTask) {
      await taskStore.markReviewTask(task.id, false)
      ElMessage.warning('没关系，明天再复习一次！')
    } else {
      ElMessage.warning('Store 方法暂未接入~')
    }
  } catch (error) {
    ElMessage.error('网络开了小差，请重试')
  }
}
</script>

<style scoped>
.review-drawer :deep(.el-drawer__header) {
  margin-bottom: 0;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
  font-weight: bold;
}

.review-container {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.review-card {
  border-radius: 12px;
  border: 1px solid #ebeef5;
  transition: all 0.3s;
}

.review-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
}

.review-card :deep(.el-card__header) {
  padding: 12px 15px;
  background-color: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.review-card :deep(.el-card__body) {
  padding: 15px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-title {
  font-weight: 600;
  color: #2c3e50;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-content {
  min-height: 40px;
}

.memo-text {
  font-size: 13px;
  color: #606266;
  margin: 0 0 12px 0;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: #f8f9fa;
  padding: 8px 10px;
  border-radius: 6px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.knowledge-tag {
  border-radius: 4px;
}

.urls-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
  background: #f4f4f5;
  padding: 10px 12px;
  border-radius: 6px;
  border-left: 3px solid #909399;
}

.reference-link {
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-start;
  transition: all 0.2s;
}

.reference-link:hover {
  transform: translateX(3px);
  color: #409EFF;
}

.card-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  border-top: 1px dashed #ebeef5;
  padding-top: 15px;
}

.action-btn {
  flex: 1;
  border-radius: 8px;
}
</style>