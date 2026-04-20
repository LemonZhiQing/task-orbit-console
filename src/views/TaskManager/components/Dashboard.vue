<template>
  <div class="dashboard-container">
    <!-- 第一行: 时间进度条 -->
    <el-card class="time-progress-card" shadow="never">
      <div class="card-header">
        <span class="title">光阴荏苒</span>
        <el-tag size="small" type="info">{{ currentDate }}</el-tag>
      </div>
      <el-row :gutter="20" class="progress-row">
        <el-col :span="6" v-for="item in timeProgresses" :key="item.label">
          <div class="progress-item">
            <div class="progress-label">
              <span>{{ item.label }}</span>
              <span class="percentage">{{ item.percentage }}%</span>
            </div>
            <el-progress 
              :percentage="item.percentage" 
              :color="item.color" 
              :show-text="false"
              :stroke-width="10"
            />
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 第二行: 效率统计卡片 -->
    <div class="stats-container">
      <div v-for="stat in efficiencyStats" :key="stat.title" class="stat-item">
        <!-- 如果配置了 clickable，增加交互效果与点击事件 -->
        <el-card 
          class="stat-card" 
          :class="{ 'clickable-card': stat.clickable }"
          :style="{ background: stat.bgColor }" 
          shadow="hover"
          @click="stat.clickable ? handleStatClick(stat) : null"
        >
          <div class="stat-content">
            <div class="stat-icon">
              <span style="font-size: 24px;">{{ stat.icon }}</span>
            </div>
            <div class="stat-info">
              <div class="stat-title">{{ stat.title }}</div>
              <div class="stat-value">
                <el-statistic :value="stat.value" />
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
    
    <!-- 复习抽屉组件 -->
    <ReviewDrawer v-model:visible="reviewDrawerVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useTaskStore } from '@/stores/taskStore';
import ReviewDrawer from './ReviewDrawer.vue'; // 引入抽屉组件

const store = useTaskStore();

// 控制复习抽屉显隐
const reviewDrawerVisible = ref(false);

const handleStatClick = (stat: any) => {
  if (stat.title === '今日待复习') {
    reviewDrawerVisible.value = true;
  }
};

// 当前日期
const currentDate = ref('');
const updateDate = () => {
  const now = new Date();
  currentDate.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${['日', '一', '二', '三', '四', '五', '六'][now.getDay()]}`;
};

// 自动计算时间进度
const getPercentage = (passed: number, total: number) => {
  const p = (passed / total) * 100;
  return Number(Math.min(100, Math.max(0, p)).toFixed(1));
};

const getColor = (percentage: number) => {
  if (percentage < 30) return '#67C23A'; // 充裕 (绿)
  if (percentage < 60) return '#409EFF'; // 正常 (蓝)
  if (percentage < 85) return '#E6A23C'; // 偏紧 (橙)
  return '#F56C6C';                      // 告急 (红)
};

const timeProgresses = ref<any[]>([]);

const calculateTimeProgress = () => {
  const now = new Date();
  
  // 本周进度 (周一为第一天)
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const weekPassed = dayOfWeek - 1 + (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
  const weekPercentage = getPercentage(weekPassed, 7);

  // 本月进度
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthPassed = now.getDate() - 1 + (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
  const monthPercentage = getPercentage(monthPassed, daysInMonth);

  // 本季进度
  const quarter = Math.floor(now.getMonth() / 3);
  const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
  const endOfQuarter = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
  const daysInQuarter = (endOfQuarter.getTime() - startOfQuarter.getTime()) / (1000 * 3600 * 24) + 1;
  const quarterPassed = (now.getTime() - startOfQuarter.getTime()) / (1000 * 3600 * 24);
  const quarterPercentage = getPercentage(quarterPassed, daysInQuarter);

  // 本年进度
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const isLeapYear = (now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0;
  const daysInYear = isLeapYear ? 366 : 365;
  const yearPassed = (now.getTime() - startOfYear.getTime()) / (1000 * 3600 * 24);
  const yearPercentage = getPercentage(yearPassed, daysInYear);

  timeProgresses.value = [
    { label: '本周', percentage: weekPercentage, color: getColor(weekPercentage) },
    { label: '本月', percentage: monthPercentage, color: getColor(monthPercentage) },
    { label: '本季', percentage: quarterPercentage, color: getColor(quarterPercentage) },
    { label: '本年', percentage: yearPercentage, color: getColor(yearPercentage) },
  ];
};

let timer: number;
onMounted(() => {
  updateDate();
  calculateTimeProgress();
  // 每分钟更新一次
  timer = setInterval(() => {
    updateDate();
    calculateTimeProgress();
  }, 60000) as unknown as number;
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

// 计算相恋天数 (从 2024-04-28 起)
const getLoveDays = () => {
  const start = new Date('2024-04-28').getTime();
  const now = new Date().getTime();
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
};

// 获取今日未完成任务数
const getTodayUnfinished = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  return store.taskList.filter(t =>
    t.properties.plan_date === todayStr &&
    t.properties.status !== 'done'
  ).length;
};

// 获取今日已完成任务数
const getTodayDone = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  return store.taskList.filter(t =>
    t.properties.plan_date === todayStr &&
    t.properties.status === 'done'
  ).length;
};

// 效率统计卡片数据
const efficiencyStats = computed(() => [
  {
    title: '今日番茄',
    value: store.todayPomodoroSpent,
    icon: '🍅',
    bgColor: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)'
  },
  {
    title: '今日待复习',
    value: store.todayReviewTasks.length,
    icon: '🧠',
    bgColor: 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)',
    clickable: true // 👈 标记为可点击
  },
  {
    title: '相恋天数',
    value: getLoveDays(),
    icon: '💖',
    bgColor: 'linear-gradient(120deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)'
  },
  {
    title: '今日待办',
    value: getTodayUnfinished(),
    icon: '📝',
    bgColor: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)'
  },
  {
    title: '今日已完成',
    value: getTodayDone(),
    icon: '🏆',
    bgColor: 'linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)'
  }
]);

</script>

<style scoped>
.dashboard-container {
  margin-bottom: 20px;
}

.time-progress-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header .title {
  font-size: 16px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.progress-row {
  align-items: center;
}

.progress-item {
  display: flex;
  flex-direction: column;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.progress-label .percentage {
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.stats-container {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}

.stat-item {
  flex: 1; 
  min-width: 0; 
}

.stat-card {
  border: none;
  border-radius: 12px;
  color: #333;
  transition: all 0.3s;
}

.clickable-card {
  cursor: pointer;
}

.clickable-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 16px rgba(124, 77, 255, 0.2) !important;
}

.stat-card :deep(.el-card__body) {
  padding: 20px;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.stat-info {
  flex: 1;
}

.stat-title {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
  font-weight: 500;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.stat-value :deep(.el-statistic__number) {
    font-size: 28px;
    font-weight: bold;
    color: #333;
}
</style>