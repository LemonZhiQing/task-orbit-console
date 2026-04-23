<template>
  <div class="shell-layout">
    <TopBar />
    <main class="shell-main">
      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import TopBar from './TopBar.vue'
</script>

<style scoped>
.shell-layout {
  min-height: 100vh;
  background: var(--bg-main);
}

.shell-main {
  max-width: var(--page-width);
  margin: 0 auto;
  padding: 20px 24px 32px;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all var(--transition-normal);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
