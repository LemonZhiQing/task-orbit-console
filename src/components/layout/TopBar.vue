<template>
  <header class="topbar">
    <!-- 左侧：折叠按钮 + 页面标题 -->
    <div class="topbar-left">
      <el-button
        class="collapse-btn"
        :icon="appStore.sidebarCollapsed ? Expand : Fold"
        text
        @click="appStore.toggleSidebar"
      />
      <h2 class="page-title">{{ route.meta.title || 'TaskOrbit' }}</h2>
    </div>

    <!-- 右侧：界面控制 -->
    <div class="topbar-right">
      <el-tooltip content="背景动画开关" placement="bottom">
        <el-button text :icon="MagicStick" @click="appStore.toggleAnimations" />
      </el-tooltip>

      <el-tooltip :content="theme === 'dark' ? '切换亮色主题' : '切换暗色主题'" placement="bottom">
        <el-button text :icon="theme === 'dark' ? Sunny : Moon" @click="toggleTheme" />
      </el-tooltip>
    </div>
  </header>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'
import { Fold, Expand, MagicStick, Sunny, Moon } from '@element-plus/icons-vue'

const route = useRoute()
const appStore = useAppStore()
const { theme, toggleTheme } = useTheme()
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--topbar-height);
  padding: 0 var(--spacing-lg);
  background: var(--bg-topbar);
  border-bottom: 1px solid var(--border-lighter);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.collapse-btn {
  font-size: 18px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

/* 已清理多余颜色面板样式 */
</style>