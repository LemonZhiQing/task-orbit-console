<template>
  <router-view />
</template>

<script setup>
import { useTheme } from '@/composables/useTheme'

// 初始化主题
useTheme()
</script>

<style>
/* 根级样式由 global.css 和 variables.css 管理 */
</style>