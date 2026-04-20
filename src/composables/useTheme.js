import { ref, watchEffect } from 'vue'

const theme = ref(
  localStorage.getItem('theme') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
)

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  watchEffect(() => {
    // 注入主题模式到根节点
    document.documentElement.setAttribute('data-theme', theme.value)
    // 持久化保存
    localStorage.setItem('theme', theme.value)
  })

  return { theme, toggleTheme }
}