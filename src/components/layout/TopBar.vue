<template>
  <header class="glass-topbar-wrapper">
    <div class="glass-topbar">
      <div class="brand-section">
        <img src="@/assets/logo.png" alt="TaskOrbit Logo" class="brand-logo" />
        <div class="brand-text">
          <div class="brand-title-row">
            <span class="brand-title">TaskOrbit</span>
            <span class="beta-tag">Beta</span>
          </div>
          <span class="brand-subtitle">三境一球 · 极简任务中枢</span>
        </div>
      </div>

      <nav class="center-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ 'is-active': route.name === tab.routeName }"
          @click="router.push({ name: tab.routeName })"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <div v-if="route.name === tab.routeName" class="active-slider"></div>
        </button>
      </nav>

      <div class="action-section">
        <button class="theme-toggle-btn" @click="theme.toggleTheme()">
          <el-icon><component :is="theme.theme === 'dark' ? 'Sunny' : 'Moon'" /></el-icon>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'

const theme = useTheme()
const route = useRoute()
const router = useRouter()

const tabs = [
  { id: 'today', routeName: 'TodayBoard', label: '今日无垠', icon: '☀️' },
  { id: 'planning', routeName: 'PlanningCenter', label: '目标排期', icon: '🎯' },
  { id: 'review', routeName: 'ReviewRitual', label: '复习仪式', icon: '🧠' }
]
</script>

<style scoped>
.glass-topbar-wrapper {
  width: 100%;
  padding: 24px 24px 0 24px;
  display: flex;
  justify-content: center;
  z-index: 2000; 
  position: sticky;
  top: 0;
  background: transparent;
}

.glass-topbar {
  width: 100%;
  max-width: var(--page-width, 1320px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 
    0 4px 15px rgba(0, 0, 0, 0.03),
    0 1px 3px rgba(0, 0, 0, 0.02),
    inset 0 1px 1px rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

[data-theme='dark'] .glass-topbar {
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05);
}

.brand-section { display: flex; align-items: center; gap: 14px; flex: 1; }
.brand-logo { width: 38px; height: 38px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); transition: transform 0.3s ease; }
.brand-logo:hover { transform: scale(1.05) rotate(-2deg); }
.brand-text { display: flex; flex-direction: column; justify-content: center; }
.brand-title-row { display: flex; align-items: baseline; gap: 8px; }
.brand-title { font-weight: 700; font-size: 18px; color: var(--vcp-text-main, #0F172A); }
.beta-tag { font-size: 10px; font-weight: 600; color: #0EA5E9; background: rgba(14,165,233,0.1); padding: 2px 6px; border-radius: 4px; }
.brand-subtitle { font-size: 11px; color: var(--vcp-text-sub, #64748B); font-weight: 500; margin-top: 2px; }

.center-tabs { display: flex; align-items: center; gap: 4px; background: rgba(0, 0, 0, 0.03); padding: 4px; border-radius: 100px; }
[data-theme='dark'] .center-tabs { background: rgba(255, 255, 255, 0.05); }

.tab-btn {
  position: relative; display: flex; align-items: center; gap: 6px;
  padding: 8px 20px; border: none; background: transparent; border-radius: 100px;
  cursor: pointer; color: var(--vcp-text-sub, #64748B); font-size: 14px; font-weight: 500;
  transition: color 0.3s ease; z-index: 1; outline: none;
}
.tab-btn:not(.is-active):hover { color: var(--vcp-text-main, #334155); }
.tab-btn.is-active { color: var(--color-primary, #0EA5E9); font-weight: 600; }
[data-theme='dark'] .tab-btn.is-active { color: #38BDF8; }

.tab-icon { font-size: 15px; opacity: 0.8; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.tab-btn.is-active .tab-icon { opacity: 1; transform: scale(1.15); }
.active-slider { position: absolute; inset: 0; background: #FFFFFF; border-radius: 100px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); z-index: -1; animation: slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
[data-theme='dark'] .active-slider { background: #334155; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
@keyframes slide-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

.action-section { display: flex; align-items: center; justify-content: flex-end; flex: 1; }
.theme-toggle-btn { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.8); display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 6px rgba(0,0,0,0.05); cursor: pointer; color: var(--vcp-text-sub, #64748B); transition: all 0.2s ease; outline: none; }
.theme-toggle-btn:hover { transform: scale(1.08); background: #FFFFFF; color: var(--color-primary, #0EA5E9); box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
[data-theme='dark'] .theme-toggle-btn { background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.1); color: #94A3B8; }
[data-theme='dark'] .theme-toggle-btn:hover { background: rgba(30,41,59,0.8); color: #FBBF24; }
</style>