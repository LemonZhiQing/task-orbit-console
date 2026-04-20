<template>
  <div class="long-term-panel">
    <div class="long-term-cards-container">
      <!-- 本周卡片 -->
      <div class="long-term-card-wrapper">
        <el-card shadow="hover" class="clickable-card gradient-week" @click="openDrawer('本周', currentWeekTag)">
          <div class="panel-header">
            <span class="title">
              <el-icon class="title-icon"><i-ep-calendar /></el-icon>
              本周目标 <span class="tag-badge">{{ currentWeekTag }}</span>
            </span>
            <span class="percentage">{{ store.getPeriodProgress(currentWeekTag) }}%</span>
          </div>
          <div class="progress-wrapper">
            <el-progress
              :percentage="store.getPeriodProgress(currentWeekTag)"
              :show-text="false"
              color="#fff"
              :stroke-width="8"
            />
          </div>
        </el-card>
      </div>

      <!-- 本月卡片 -->
      <div class="long-term-card-wrapper">
        <el-card shadow="hover" class="clickable-card gradient-month" @click="openDrawer('本月', currentMonthTag)">
          <div class="panel-header">
            <span class="title">
               <el-icon class="title-icon"><i-ep-clock /></el-icon>
               本月目标 <span class="tag-badge">{{ currentMonthTag }}</span>
            </span>
            <span class="percentage">{{ store.getPeriodProgress(currentMonthTag) }}%</span>
          </div>
          <div class="progress-wrapper">
            <el-progress
              :percentage="store.getPeriodProgress(currentMonthTag)"
              :show-text="false"
              color="#fff"
              :stroke-width="8"
            />
          </div>
        </el-card>
      </div>

      <!-- 本季卡片 -->
      <div class="long-term-card-wrapper">
        <el-card shadow="hover" class="clickable-card gradient-quarter" @click="openDrawer('本季', currentQuarterTag)">
          <div class="panel-header">
            <span class="title">
               <el-icon class="title-icon"><i-ep-data-analysis /></el-icon>
               本季目标 <span class="tag-badge">{{ currentQuarterTag }}</span>
            </span>
            <span class="percentage">{{ store.getPeriodProgress(currentQuarterTag) }}%</span>
          </div>
          <div class="progress-wrapper">
             <el-progress
              :percentage="store.getPeriodProgress(currentQuarterTag)"
              :show-text="false"
              color="#fff"
              :stroke-width="8"
            />
          </div>
        </el-card>
      </div>

      <!-- 本年卡片 -->
      <div class="long-term-card-wrapper">
        <el-card shadow="hover" class="clickable-card gradient-year" @click="openDrawer('本年', currentYearTag)">
          <div class="panel-header">
            <span class="title">
               <el-icon class="title-icon"><i-ep-flag /></el-icon>
               本年目标 <span class="tag-badge">{{ currentYearTag }}</span>
            </span>
            <span class="percentage">{{ store.getPeriodProgress(currentYearTag) }}%</span>
          </div>
          <div class="progress-wrapper">
             <el-progress
              :percentage="store.getPeriodProgress(currentYearTag)"
              :show-text="false"
              color="#fff"
              :stroke-width="8"
            />
          </div>
        </el-card>
      </div>
    </div>

    <!-- 周期详情抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="`${currentDrawerTitle}数据面板 (${currentDrawerTag})`"
      direction="rtl"
      size="800px"
      destroy-on-close
    >
      <!-- 将原本独立的 StatsChartsPanel 内嵌，并通过 props 传递当前周期的标签 -->
      <StatsChartsPanel :period-tag="currentDrawerTag" :period-name="currentDrawerTitle" v-if="drawerVisible" />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { useTaskStore } from '@/stores/taskStore';
import { computed, ref } from 'vue';
import StatsChartsPanel from './StatsChartsPanel.vue';
import { Calendar as IEpCalendar, Clock as IEpClock, DataAnalysis as IEpDataAnalysis, Flag as IEpFlag } from '@element-plus/icons-vue';

const store = useTaskStore();

// 抽屉状态
const drawerVisible = ref(false);
const currentDrawerTitle = ref('');
const currentDrawerTag = ref('');

const openDrawer = (title: string, tag: string) => {
  currentDrawerTitle.value = title;
  currentDrawerTag.value = tag;
  drawerVisible.value = true;
};

// 动态计算当前时间的周期标签
const now = new Date();

// 计算当前是第几周 (简易算法, 可根据实际需求调整)
const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
};

const currentWeekTag = computed(() => `w${getWeekNumber(now)}`);
const currentMonthTag = computed(() => `m${now.getMonth() + 1}`);
const currentQuarterTag = computed(() => `q${Math.floor(now.getMonth() / 3) + 1}`);
const currentYearTag = computed(() => `y${now.getFullYear()}`);

const customColors = [
  { color: '#f56c6c', percentage: 20 },
  { color: '#e6a23c', percentage: 60 },
  { color: '#67c23a', percentage: 100 },
];
</script>

<style scoped>
.long-term-panel {
  margin-bottom: 20px;
}

.long-term-cards-container {
  display: flex;
  gap: 20px;
}

.long-term-card-wrapper {
  flex: 1;
  min-width: 0;
}

.clickable-card {
  cursor: pointer;
  border: none;
  border-radius: 12px;
  color: #fff;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
  position: relative;
}

.clickable-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0));
  pointer-events: none;
}

.clickable-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.clickable-card :deep(.el-card__body) {
  padding: 18px 20px;
  position: relative;
  z-index: 1;
}

/* 渐变背景配色 */
.gradient-week {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.gradient-month {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.gradient-quarter {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.gradient-year {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.title {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.title-icon {
  font-size: 18px;
  opacity: 0.9;
}

.tag-badge {
  font-size: 11px;
  font-weight: 500;
  background: rgba(255,255,255,0.2);
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 4px;
}

.percentage {
  font-size: 18px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.progress-wrapper {
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
  padding: 2px;
}

.progress-wrapper :deep(.el-progress-bar__outer) {
  background-color: transparent !important;
}

.progress-wrapper :deep(.el-progress-bar__inner) {
  box-shadow: 0 0 10px rgba(255,255,255,0.5);
}
</style>