<template>
  <div class="stats-charts-panel">
    <!-- 长期子任务的进度列表 (替代原本的仪表盘，以支持多个任务的清晰展示) -->
    <div class="section-container">
      <div class="section-title">
        <el-icon><i-ep-list /></el-icon> {{ periodName }}长期任务明细
      </div>
      <div class="long-term-list">
        <div v-for="task in periodLongTermTasks" :key="task.id" class="long-term-item">
          <div class="item-header">
             <span class="task-title" :title="task.title">{{ task.title }}</span>
             <el-tag size="small" :type="task.properties.status === 'done' ? 'success' : 'primary'">
               {{ task.properties.status === 'done' ? '已完成' : '进行中' }}
             </el-tag>
          </div>
          <div class="item-progress">
             <div class="prog-info">
               <span class="prog-text">进度: {{ task.ai_meta.progress }}%</span>
               <span class="prog-detail">
                 已完成: {{ task.properties.metrics?.completed_amount || 0 }} / 计划: {{ task.properties.metrics?.plan_amount || 0 }}
               </span>
             </div>
             <el-progress
                :percentage="task.ai_meta.progress"
                :stroke-width="10"
                :status="task.ai_meta.progress === 100 ? 'success' : ''"
             />
          </div>
        </div>
        <el-empty v-if="periodLongTermTasks.length === 0" :description="`暂无包含 ${periodTag} 标签的任务`" :image-size="60" />
      </div>
    </div>

    <!-- 趋势图表区 (番茄波动 & 执行力) -->
    <el-row :gutter="20" class="charts-row">
      <!-- 关注点 3: 每日番茄的波动情况 -->
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <div class="chart-header">
            <span class="title">🍅 {{ periodName }}番茄波动</span>
          </div>
          <div class="line-container">
            <v-chart class="chart line-chart" :option="lineOption" autoresize />
          </div>
        </el-card>
      </el-col>

      <!-- 关注点 4 & 5: 每日任务/复习完成情况 -->
      <el-col :span="12">
        <el-card shadow="never" class="chart-card">
          <div class="chart-header">
            <span class="title">📊 {{ periodName }}执行力全景图</span>
          </div>
          <div class="bar-container">
            <v-chart class="chart bar-chart" :option="barOption" autoresize />
          </div>
        </el-card>
      </el-col>
    </el-row>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTaskStore } from '@/stores/taskStore';
import type { ITaskItem } from '@/types/task';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components';
import { List as IEpList } from '@element-plus/icons-vue';

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
]);

const props = defineProps<{
  periodTag: string;
  periodName: string;
}>();

const store = useTaskStore();

// ========== 1. 长期任务列表数据 ==========
const periodLongTermTasks = computed(() => {
    return store.taskList.filter((t: ITaskItem) => t.properties.tags && t.properties.tags.includes(props.periodTag));
});

// ========== 日期辅助计算 ==========
// 动态根据 periodName (本周/本月/本季/本年) 生成对应的横坐标日期数组
const getDynamicDates = () => {
    const dates = [];
    const today = new Date();
    let daysToGenerate = 7; // 默认 7 天
    
    if (props.periodName === '本月') {
        daysToGenerate = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(); // 本月总天数
        // 从本月1号开始
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        for (let i = 0; i < daysToGenerate; i++) {
            const d = new Date(firstDay);
            d.setDate(firstDay.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const displayStr = `${d.getMonth() + 1}-${d.getDate()}`;
            dates.push({ full: dateStr, display: displayStr });
        }
        return dates;
    }
    
    if (props.periodName === '本周') {
        // 本周一到周日
        const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - dayOfWeek + 1);
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const displayStr = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i];
            dates.push({ full: dateStr, display: displayStr });
        }
        return dates;
    }

    if (props.periodName === '本季' || props.periodName === '本年') {
       // 对于季度和年份，我们按"月"来聚合比较合理，但为了保持与现有基于 plan_date(天) 过滤的逻辑一致，
       // 我们这里简化处理：展示最近的 15 天或 30 天，或者依然按月划分。
       // 这里为了图表好看，季度默认显示最近 30 天
       daysToGenerate = 30;
       for (let i = daysToGenerate - 1; i >= 0; i--) {
           const d = new Date(today);
           d.setDate(today.getDate() - i);
           const dateStr = d.toISOString().split('T')[0];
           const displayStr = `${d.getMonth() + 1}-${d.getDate()}`;
           dates.push({ full: dateStr, display: displayStr });
       }
       return dates;
    }

    // fallback 最近7天
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const displayStr = `${d.getMonth() + 1}-${d.getDate()}`;
        dates.push({ full: dateStr, display: displayStr });
    }
    return dates;
};

// ========== 图表 2: 折线图 (番茄波动) ==========
const lineOption = computed(() => {
    const dynamicDates = getDynamicDates();
    const xLabels = dynamicDates.map(d => d.display);
    
    const data = dynamicDates.map(rd => {
        // 统计当天完成的任务的番茄数
        return store.taskList
            .filter((t: ITaskItem) => t.properties.plan_date === rd.full && t.properties.status === 'done')
            .reduce((sum: number, t: ITaskItem) => sum + (t.ai_meta.pomodoro_spent || 0), 0);
    });

    return {
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: xLabels,
            axisLine: { lineStyle: { color: '#DCDFE6' } },
            axisLabel: { color: '#909399' }
        },
        yAxis: {
            type: 'value',
            splitLine: { lineStyle: { type: 'dashed', color: '#EBEEF5' } }
        },
        series: [
            {
                name: '番茄数',
                type: 'line',
                smooth: true,
                data: data,
                itemStyle: { color: '#F56C6C' },
                areaStyle: {
                    color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: 'rgba(245, 108, 108, 0.3)' }, { offset: 1, color: 'rgba(245, 108, 108, 0)' }]
                    }
                }
            }
        ]
    };
});

// ========== 图表 3: 堆叠柱状图 (执行力全景图) ==========
const barOption = computed(() => {
    const dynamicDates = getDynamicDates();
    const xLabels = dynamicDates.map(d => d.display);
    
    const doneTasksData = dynamicDates.map(rd => {
        return store.taskList.filter((t: ITaskItem) => t.properties.plan_date === rd.full && t.properties.status === 'done').length;
    });

    // 这里模拟复习任务完成情况 (条件：当天的任务，包含 is_reviewable=true，且已完成)
    // 根据实际业务，您可能需要基于历史复习流水记录，这里用 plan_date 简单模拟当天执行的复习数
    const reviewedTasksData = dynamicDates.map(rd => {
        return store.taskList.filter((t: ITaskItem) =>
            t.properties.plan_date === rd.full &&
            t.properties.status === 'done' &&
            t.ai_meta.review_info?.is_reviewable
        ).length;
    });

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
        },
        legend: {
            data: ['完成任务', '完成复习'],
            top: 0,
            textStyle: { color: '#606266', fontSize: 12 }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', top: '30%', containLabel: true },
        xAxis: [
            {
                type: 'category',
                data: xLabels,
                axisLine: { lineStyle: { color: '#DCDFE6' } },
                axisLabel: { color: '#909399' }
            }
        ],
        yAxis: [
            {
                type: 'value',
                splitLine: { lineStyle: { type: 'dashed', color: '#EBEEF5' } }
            }
        ],
        series: [
            {
                name: '完成任务',
                type: 'bar',
                stack: 'Total',
                barWidth: '40%',
                itemStyle: { color: '#409EFF', borderRadius: [0, 0, 4, 4] },
                data: doneTasksData
            },
            {
                name: '完成复习',
                type: 'bar',
                stack: 'Total',
                itemStyle: { color: '#B39DDB', borderRadius: [4, 4, 0, 0] },
                data: reviewedTasksData
            }
        ]
    };
});
</script>

<style scoped>
.stats-charts-panel {
  padding: 10px;
}

.section-container {
  margin-bottom: 30px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.long-term-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.long-term-item {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e2e8f0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-title {
  font-size: 15px;
  font-weight: 600;
  color: #334155;
}

.prog-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.prog-text {
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.prog-detail {
  color: var(--el-text-color-secondary);
}

.charts-row {
  margin-top: 20px;
}

.chart-card {
  height: 350px;
  border-radius: 10px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}

.chart-card :deep(.el-card__body) {
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chart-header {
  margin-bottom: 10px;
}

.chart-header .title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.line-container, .bar-container {
  flex: 1;
  width: 100%;
}

.chart {
  width: 100%;
  height: 100%;
}
</style>