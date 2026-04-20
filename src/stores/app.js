import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 侧边栏折叠状态
  const sidebarCollapsed = ref(false)

  // 动画开关
  const animationsEnabled = ref(
    localStorage.getItem('animationsEnabled') !== 'false'
  )

  // 当前活跃页面标题
  const currentPageTitle = ref('仪表盘')

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function toggleAnimations() {
    animationsEnabled.value = !animationsEnabled.value
    localStorage.setItem('animationsEnabled', animationsEnabled.value)
  }

  function setPageTitle(title) {
    currentPageTitle.value = title
  }

  return {
    sidebarCollapsed,
    animationsEnabled,
    currentPageTitle,
    toggleSidebar,
    toggleAnimations,
    setPageTitle
  }
})