<template>
  <div class="app-layout">
    <!-- 侧边栏 -->
    <Sidebar />

    <!-- 主内容区 -->
    <div class="main-area" :class="{ 'sidebar-collapsed': appStore.sidebarCollapsed }">
      <!-- 顶栏 -->
      <TopBar />

      <!-- 页面内容 -->
      <main class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: var(--sidebar-width);
  transition: margin-left var(--transition-normal);
  overflow: hidden;
}

.main-area.sidebar-collapsed {
  margin-left: var(--sidebar-collapsed-width);
}

.page-content {
  flex: 1;
  padding: var(--spacing-lg);
  overflow-y: auto;
  background-color: var(--bg-color);
}
</style>