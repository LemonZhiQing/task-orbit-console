<template>
  <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
    <!-- Logo 区域 -->
    <div class="sidebar-header">
      <img src="/VCPLogo2.png" alt="TaskOrbit" class="logo" />
      <span v-show="!appStore.sidebarCollapsed" class="brand-text">TaskOrbit</span>
    </div>

    <!-- 搜索框 -->
    <div v-show="!appStore.sidebarCollapsed" class="sidebar-search">
      <el-input
        v-model="searchQuery"
        placeholder="搜索功能页面..."
        :prefix-icon="Search"
        size="small"
        clearable
      />
    </div>

    <!-- 导航菜单 -->
    <el-scrollbar class="sidebar-menu-wrapper">
      <el-menu
        :default-active="currentRoute"
        :collapse="appStore.sidebarCollapsed"
        :collapse-transition="false"
        router
      >
        <template v-for="item in filteredMenuItems" :key="item.path || item.groupTitle">
          <!-- 分组标题 -->
          <div v-if="item.groupTitle && !item.path" class="menu-group-title" v-show="!appStore.sidebarCollapsed">
            {{ item.groupTitle }}
          </div>

          <el-menu-item v-if="item.path" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>
    </el-scrollbar>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { Search } from '@element-plus/icons-vue'

const route = useRoute()
const appStore = useAppStore()
const searchQuery = ref('')

const currentRoute = computed(() => route.path)

// 侧边栏菜单项定义：前端仅保留任务管理入口
const menuItems = [
  { path: '/task-manager', title: '任务管理', icon: 'Finished' }
]

// 搜索过滤
const filteredMenuItems = computed(() => {
  if (!searchQuery.value) return menuItems
  const query = searchQuery.value.toLowerCase()
  // 过滤时保留分组标题（如果该组下有匹配项）
  const result = []
  let lastGroup = null
  for (const item of menuItems) {
    if (!item.path) {
      lastGroup = item
      continue
    }
    if (item.title.toLowerCase().includes(query)) {
      if (lastGroup && !result.includes(lastGroup)) {
        result.push(lastGroup)
      }
      result.push(item)
    }
  }
  return result
})
</script>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-lighter);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  z-index: 100;
  box-shadow: var(--shadow-sm);
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: var(--spacing-md);
  height: var(--topbar-height);
  border-bottom: 1px solid var(--border-lighter);
  gap: var(--spacing-sm);
}

.logo {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.brand-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-color);
  white-space: nowrap;
}

.sidebar-search {
  padding: var(--spacing-sm) var(--spacing-md);
}

.sidebar-menu-wrapper {
  flex: 1;
  overflow: hidden;
}

.menu-group-title {
  padding: var(--spacing-md) var(--spacing-md) var(--spacing-xs);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Element Plus Menu 样式覆盖 */
.el-menu {
  border-right: none !important;
  background: transparent !important;
}

.el-menu-item {
  margin: 2px 8px;
  border-radius: 6px !important;
  color: var(--text-regular) !important;
  height: 42px;
  line-height: 42px;
}

.el-menu-item:hover {
  background-color: var(--bg-hover) !important;
  color: var(--primary-color) !important;
}

.el-menu-item.is-active {
  background-color: var(--bg-active) !important;
  color: var(--primary-color) !important;
  font-weight: 500;
}
</style>
