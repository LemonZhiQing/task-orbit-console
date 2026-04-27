<template>
  <div ref="ganttContainer" class="gantt-container vcp-minimal-gantt"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import 'dhtmlx-gantt'
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css'

const props = defineProps({
  tasks: {
    type: Object,
    default: () => ({ data: [], links: [] })
  },
  zoomLevel: {
    type: String,
    default: 'month'
  },
  todaySignal: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['task-updated', 'task-selected', 'task-dblclick'])
const ganttContainer = ref(null)
const eventIds = []

onMounted(() => {
  // 🇨🇳 手工注入中文本地化
  gantt.locale.date.month_full = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  gantt.locale.date.month_short = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  gantt.locale.date.day_full = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  gantt.locale.date.day_short = ["日", "一", "二", "三", "四", "五", "六"];

  // 1. 初始化极简配置
  gantt.config.readonly = true; 
  gantt.config.show_links = false; 
  gantt.config.details_on_dblclick = false; 
  gantt.config.row_height = 40; 
  gantt.config.task_height = 20; 
  gantt.config.bar_height = 20;
  
  gantt.config.grid_width = 320;
  gantt.config.columns = [
    { name: "text", label: "任务标题 (Epic / Story)", width: "*", tree: true }
  ];

  // 2. 内部文本与外部挂件 (进度居中与标题右置)
  gantt.templates.task_text = function(start, end, task){ 
    const pct = Math.round(task.progress * 100);
    // 如果有进度，用白色带阴影；如果是 0%，用暗灰融入空槽背景
    if (pct > 0) {
       return `<span style="font-size: 11px; font-weight: 800; color: #FFF; text-shadow: 0 1px 3px rgba(0,0,0,0.6); z-index: 3;">${pct}%</span>`;
    }
    return `<span style="font-size: 11px; font-weight: 800; color: rgba(62, 58, 54, 0.4);">${pct}%</span>`; 
  };
  
  gantt.templates.rightside_text = function(start, end, task){
    // 右侧回归纯净，只展示标题
    if (task.type === 'project') {
       return `<b style="color: #3E3A36; margin-left: 8px; font-size: 13px;">${task.text}</b>`;
    }
    return `<span style="color: #4A4A4A; margin-left: 8px; font-size: 12px; font-weight: 500;">${task.text}</span>`;
  };

  // 💡 激活外部注入的自定义色彩皮肤
  gantt.templates.task_class = function(start, end, task){
    if (task.color) {
      task.color = task.color;
    }
    return [task.overdue ? "vcp-overdue-task" : "", task.context ? "vcp-context-task" : ""].filter(Boolean).join(" ");
  };

  // 3. 缩放配置
  const zoomConfig = {
    levels: [
      { name: "day", scale_height: 50, min_column_width: 60, scales: [{ unit: "day", step: 1, format: "%m月%d日" }, { unit: "hour", step: 1, format: "%H:00" }] },
      { name: "week", scale_height: 50, min_column_width: 64, scales: [{ unit: "week", step: 1, format: "第 %W 周" }, { unit: "day", step: 1, format: "%m/%d %D" }] },
      { name: "month", scale_height: 50, min_column_width: 42, scales: [{ unit: "month", step: 1, format: "%Y年 %m月" }, { unit: "day", step: 1, format: "%d" }] },
      { name: "quarter", scale_height: 50, min_column_width: 80, scales: [{ unit: "quarter", step: 1, format: function (date) { const d = gantt.date.date_to_str("%Y年 第%q季度"); return d(date); } }, { unit: "month", step: 1, format: "%m月" }] },
      { name: "year", scale_height: 50, min_column_width: 96, scales: [{ unit: "year", step: 1, format: "%Y年" }, { unit: "month", step: 1, format: "%m月" }] }
    ]
  };

  gantt.ext.zoom.init(zoomConfig);

  eventIds.push(gantt.attachEvent("onTaskClick", (id) => {
    emit('task-selected', id);
    return true;
  }));

  eventIds.push(gantt.attachEvent("onTaskDblClick", (id) => {
    emit('task-dblclick', id);
    return false;
  }));

  // 护盾：等待弹窗 DOM 挂载
  nextTick(() => {
    if (ganttContainer.value) {
      gantt.init(ganttContainer.value);
      gantt.ext.zoom.setLevel(props.zoomLevel);
      updateGanttDataAndScale(props.tasks);
    }
  });
})

const getPreciseScaleRange = () => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (props.zoomLevel === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setHours(24, 0, 0, 0);
  } else if (props.zoomLevel === 'week') {
    const day = start.getDay() || 7;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - day + 1);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 7);
  } else if (props.zoomLevel === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setMonth(start.getMonth() + 1, 1);
  } else if (props.zoomLevel === 'quarter') {
    const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(quarterStartMonth, 1);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setMonth(quarterStartMonth + 3, 1);
  } else if (props.zoomLevel === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setFullYear(start.getFullYear() + 1, 0, 1);
  } else {
    start.setDate(start.getDate() - 15);
    end.setDate(end.getDate() + 15);
  }

  return { start, end };
}

// 按当前缩放级别精确锁定横轴：天=今天，周=本周，月=本月，季度=本季度，年=今年
const updateGanttDataAndScale = (tasksData) => {
  if (!ganttContainer.value) return;

  gantt.clearAll();
  const scaleRange = getPreciseScaleRange();
  gantt.config.start_date = scaleRange.start;
  gantt.config.end_date = scaleRange.end;
  
  if (!tasksData || !tasksData.data || tasksData.data.length === 0) {
    ensureTodayMarker();
    gantt.render();
    return;
  }

  gantt.parse(tasksData);
  ensureTodayMarker();
  gantt.render();
}

const ensureTodayMarker = () => {
  if (!ganttContainer.value) return;
  gantt.deleteMarker?.('vcp-today-marker');
  gantt.addMarker?.({
    id: 'vcp-today-marker',
    start_date: new Date(),
    css: 'vcp-today-marker',
    text: '今天',
    title: '今天'
  });
}

const showToday = () => {
  if (!ganttContainer.value) return;
  ensureTodayMarker();
  gantt.showDate(new Date());
}

watch(() => props.tasks, (newTasks) => {
  updateGanttDataAndScale(newTasks);
}, { deep: true })

watch(() => props.zoomLevel, (newZoom) => {
  if (newZoom) {
    gantt.ext.zoom.setLevel(newZoom);
    updateGanttDataAndScale(props.tasks);
  }
})

watch(() => props.todaySignal, () => {
  showToday();
})

onUnmounted(() => {
  eventIds.forEach(eventId => gantt.detachEvent(eventId));
  eventIds.length = 0;
  gantt.deleteMarker?.('vcp-today-marker');
  gantt.clearAll();
  gantt.config.start_date = null;
  gantt.config.end_date = null;
})
</script>

<style>
.vcp-minimal-gantt.gantt-container { width: 100%; height: 100%; border: none !important; border-radius: 12px; background: var(--vcp-bg-card, #FFFFFF); }
.vcp-minimal-gantt .gantt_grid_scale { border-bottom: 1px solid rgba(62, 58, 54, 0.08) !important; background: var(--vcp-bg-column, #F5F4EE) !important; color: var(--vcp-text-sub) !important; font-weight: 600; }
.vcp-minimal-gantt .gantt_grid_data { border-right: 1px solid rgba(62, 58, 54, 0.08) !important; }
.vcp-minimal-gantt .gantt_row { border-bottom: 1px dashed rgba(62, 58, 54, 0.05) !important; transition: background 0.2s;}
.vcp-minimal-gantt .gantt_row:hover { background-color: rgba(62, 58, 54, 0.02) !important; }
.vcp-minimal-gantt .gantt_row.gantt_selected { background-color: rgba(74, 157, 154, 0.05) !important; }
.vcp-minimal-gantt .gantt_tree_indent { width: 15px; }
.vcp-minimal-gantt .gantt_tree_icon { width: 15px; }
.vcp-minimal-gantt .gantt_task_scale { border-bottom: 1px solid rgba(62, 58, 54, 0.08) !important; }
.vcp-minimal-gantt .gantt_scale_line { background: var(--vcp-bg-column, #F5F4EE) !important; border-bottom: 1px solid rgba(62, 58, 54, 0.05) !important; }
.vcp-minimal-gantt .gantt_scale_cell { border-right: 1px solid rgba(62, 58, 54, 0.04) !important; color: var(--vcp-text-sub) !important; font-weight: 600; }
.vcp-minimal-gantt .gantt_task_row { border-bottom: 1px dashed rgba(62, 58, 54, 0.05) !important; }
.vcp-minimal-gantt .gantt_task_cell { border-right: 1px solid rgba(62, 58, 54, 0.04) !important; }

/* 5. 底槽 (Track) 美化：空轨凹槽形态 */
.vcp-minimal-gantt .gantt_task_line { 
  border: 1px solid rgba(62, 58, 54, 0.06) !important; 
  border-radius: 12px !important; 
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04) !important; /* 内阴影体现空槽质感 */
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; 
  overflow: hidden; 
}
.vcp-minimal-gantt .gantt_task_line:hover { 
  transform: translateY(-1px) !important; 
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0,0,0,0.05) !important; 
  filter: brightness(0.98) !important; 
}

/* 6. 实体进度条 (Progress) 美化：彩色饱满胶囊 */
.vcp-minimal-gantt .gantt_task_progress {
  /* 颜色已被 DHTMLX 行内样式接管，不要覆盖它！ */
  border-radius: 12px !important; /* 也是药丸形状，在底槽里延展 */
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.1) !important; /* 前端带有轻微的光晕 */
  opacity: 0.95;
}

/* 7. 文本排版绝对居中 (横跨整个底槽) */
.vcp-minimal-gantt .gantt_task_content {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  height: 100% !important;
  position: absolute !important;
  width: 100% !important;
  left: 0 !important;
  z-index: 2 !important; /* 确保文字稳定悬浮，不受进度条长度挤压 */
}

/* 8. 长期父级项目 (Epic) 的微调 */
.vcp-minimal-gantt .gantt_project .gantt_task_line { 
  height: 14px !important; 
  margin-top: 3px !important; 
  border-radius: 8px !important;
}
.vcp-minimal-gantt .gantt_project .gantt_task_progress {
  border-radius: 8px !important;
}
.vcp-minimal-gantt .vcp-overdue-task .gantt_task_line,
.vcp-minimal-gantt .gantt_task_line.vcp-overdue-task {
  border-color: rgba(244, 63, 94, 0.75) !important;
  box-shadow: inset 0 2px 4px rgba(244, 63, 94, 0.08), 0 0 0 1px rgba(244, 63, 94, 0.18) !important;
}
.vcp-minimal-gantt .vcp-context-task {
  opacity: 0.58;
}
.vcp-minimal-gantt .vcp-context-task .gantt_task_line {
  border-style: dashed !important;
}
.vcp-minimal-gantt .vcp-today-marker {
  background: #F43F5E !important;
  width: 2px !important;
}
.vcp-minimal-gantt .vcp-today-marker .gantt_marker_content {
  background: #F43F5E !important;
  color: #fff !important;
  border-radius: 999px !important;
  padding: 2px 8px !important;
  font-size: 11px !important;
  font-weight: 800 !important;
  transform: translateX(-50%);
}
</style>