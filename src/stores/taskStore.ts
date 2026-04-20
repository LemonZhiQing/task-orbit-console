import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ITaskItem } from '@/types/task';
import { taskApi } from '@/api/task';

// 🌟 核心修复：获取本地时区的 YYYY-MM-DD，彻底消灭凌晨时区 Bug
const getLocalDateString = (dateObj: Date = new Date()) => {
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

// 经典的艾宾浩斯时间间隔 (天)
const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 90, 180];

const calculateNextReviewDate = (currentStage: number, isRemembered: boolean) => {
    const targetDate = new Date();
    let nextStage = 0;
    if (!isRemembered) {
        targetDate.setDate(targetDate.getDate() + 1); // 忘记了，明天重新复习，阶段归零
    } else {
        nextStage = Math.min(currentStage + 1, REVIEW_INTERVALS.length - 1);
        const daysToAdd = REVIEW_INTERVALS[nextStage];
        targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
    return { nextDate: getLocalDateString(targetDate), nextStage };
};

// 🛡️ 辅助函数：判断是否为专属复习任务
const isReviewTask = (t: any) => {
    const rawMeta = t.ai_meta_json || t.ai_meta;
    const meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : (rawMeta || {});
    return !!meta.review_info?.is_reviewable;
};

export const useTaskStore = defineStore('taskStore', () => {
    // ========== State ==========
    const taskList = ref<ITaskItem[]>([]);
    const isLoading = ref(false);
    const currentView = ref<'table' | 'kanban'>('kanban');
    const searchQuery = ref('');

    // ========== Getters ==========

    const filteredTasks = computed(() => {
        if (!searchQuery.value) return taskList.value;
        return taskList.value.filter((task: ITaskItem) =>
            task.title.includes(searchQuery.value) ||
            task.properties.project.includes(searchQuery.value)
        );
    });

    // 🌟 看板视图数据：屏蔽掉所有复习任务
    const todoTasks = computed(() => {
        const today = getLocalDateString();
        const tomorrowObj = new Date();
        tomorrowObj.setDate(tomorrowObj.getDate() + 1);
        const tomorrow = getLocalDateString(tomorrowObj);

        return filteredTasks.value.filter((t: any) => {
            return !isReviewTask(t) && 
                   t.properties.status === 'todo' &&
                   (t.properties.plan_date === tomorrow || t.properties.plan_date <= today);
        });
    });

    const inProgressTasks = computed(() => {
        const today = getLocalDateString();
        return filteredTasks.value.filter((t: any) =>
            !isReviewTask(t) && 
            t.properties.status === 'in_progress' &&
            t.properties.plan_date === today
        );
    });

    const doneTasks = computed(() => {
        const today = getLocalDateString();
        return filteredTasks.value.filter((t: any) =>
            !isReviewTask(t) && 
            t.properties.status === 'done' &&
            t.properties.plan_date === today
        );
    });

    // 仪表盘: 今日待复习列表 (只展示复习任务，专门供给抽屉使用)
    const todayReviewTasks = computed(() => {
        const today = getLocalDateString();
        return taskList.value.filter((t: any) => {
            const rawMeta = t.ai_meta_json || t.ai_meta;
            const meta = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : (rawMeta || {});
            const status = t.properties?.status || t.status;

            return meta.review_info?.is_reviewable &&
                   meta.review_info?.next_review_date <= today &&
                   status !== 'done';
        });
    });

    // 逾期任务列表也要排除复习任务（复习任务没有逾期概念）
    const overdueTasks = computed(() => {
        const today = getLocalDateString();
        return taskList.value.filter((t: any) =>
            !isReviewTask(t) &&
            t.properties.status !== 'done' &&
            t.properties.plan_date < today
        );
    });

    const todayPomodoroSpent = computed(() => {
        const today = getLocalDateString();
        return taskList.value
            .filter((t: any) => !isReviewTask(t) && t.properties.plan_date === today && t.properties.status === 'done')
            .reduce((total: number, task: any) => total + (task.ai_meta?.pomodoro_spent || 0), 0);
    });

    const getActiveProjectsByPeriod = computed(() => {
        return (periodTag: string) => {
            const projects = new Set<string>();
            taskList.value.forEach((t: ITaskItem) => {
                if (t.properties.tags && t.properties.tags.includes(periodTag)) {
                    projects.add(t.title);
                }
            });
            return Array.from(projects);
        };
    });

    // 中长期进度核心聚合引擎，排除复习任务的数据污染
    const getPeriodProgress = computed(() => {
        return (periodTag: string) => {
            const periodTasks = taskList.value.filter((t: any) =>
                !isReviewTask(t) && 
                t.properties.tags && t.properties.tags.includes(periodTag)
            );

            if (periodTasks.length === 0) return 0;

            let totalPlan = 0;
            let totalCompleted = 0;

            periodTasks.forEach((task: ITaskItem) => {
                totalPlan += Number(task.properties.metrics?.plan_amount || 0);
                totalCompleted += Number(task.properties.metrics?.completed_amount || 0);
            });

            if (totalPlan === 0) return 0;
            return Math.min(100, Math.round((totalCompleted / totalPlan) * 100));
        };
    });

    // ========== Actions ==========

    const loadTasks = async () => {
        isLoading.value = true;
        try {
            const res = await taskApi.getTasks();
            if (res.success) {
                taskList.value = res.data;
            }
        } catch (error) {
            console.error('获取任务列表失败', error);
        } finally {
            isLoading.value = false;
        }
    };

    const createTask = async (taskData: ITaskItem) => {
        try {
            const res = await taskApi.createTask(taskData);
            if (res.success) {
                taskList.value.push(res.data);
                return res.data;
            }
        } catch (error) {
            console.error('创建任务失败', error);
            throw error;
        }
    };

    const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
        const task = taskList.value.find((t: ITaskItem) => t.id === taskId);
        if (!task) return;

        const oldStatus = task.properties.status;
        const updates: Partial<ITaskItem> = {
            properties: {
                ...task.properties,
                status: newStatus
            }
        };

        if (newStatus === 'done' && task.properties.metrics) {
            if (updates.properties) {
                updates.properties.metrics = {
                    ...task.properties.metrics,
                    completed_amount: task.properties.metrics.plan_amount || 0
                };
            }
            updates.ai_meta = {
                ...task.ai_meta,
                progress: 100
            };
        }

        task.properties.status = newStatus;
        if (updates.properties?.metrics) {
            task.properties.metrics = updates.properties.metrics;
        }
        if (updates.ai_meta) {
            task.ai_meta = updates.ai_meta;
        }

        try {
            await taskApi.updateTask(taskId, updates);
        } catch (error) {
            task.properties.status = oldStatus;
            console.error('状态更新失败，已回滚', error);
        }
    };

    const updateTaskPartial = async (taskId: string, updates: Partial<ITaskItem>) => {
        try {
            const res = await taskApi.updateTask(taskId, updates);
            if (res.success) {
                const index = taskList.value.findIndex((t: ITaskItem) => t.id === taskId);
                if (index !== -1) {
                    taskList.value[index] = res.data;
                }
            }
        } catch (error) {
            console.error('更新任务失败', error);
            throw error;
        }
    };

    // 🌟 复习打卡：乐观更新 + 艾宾浩斯算法
    const markReviewTask = async (taskId: string, isRemembered: boolean) => {
        const task = taskList.value.find((t: ITaskItem) => t.id === taskId);
        if (!task) return;

        // 提取与初始化
        let metaObj = typeof task.ai_meta === 'string' ? JSON.parse(task.ai_meta) : { ...(task.ai_meta || {}) };
        if (!metaObj.review_info) metaObj.review_info = { is_reviewable: true, review_stage: 0 };

        const currentStage = metaObj.review_info.review_stage || 0;
        const { nextDate, nextStage } = calculateNextReviewDate(currentStage, isRemembered);

        // 深拷贝备份旧数据，用于回滚
        const oldMeta = JSON.parse(JSON.stringify(metaObj));

        // 乐观更新
        metaObj.review_info.review_stage = nextStage;
        metaObj.review_info.next_review_date = nextDate;
        metaObj.review_info.last_review_date = getLocalDateString();
        
        // 写回本地
        task.ai_meta = metaObj;

        try {
            // 向后端发包
            await updateTaskPartial(taskId, { ai_meta: metaObj });
        } catch (error) {
            console.error('打卡失败，已回滚本地状态', error);
            // 回滚本地
            task.ai_meta = oldMeta;
            throw error;
        }
    };

    return {
        taskList, isLoading, currentView, searchQuery,
        filteredTasks, todoTasks, inProgressTasks, doneTasks,
        todayReviewTasks, todayPomodoroSpent, overdueTasks,
        getPeriodProgress, getActiveProjectsByPeriod,
        loadTasks, createTask, updateTaskStatus, updateTaskPartial,
        markReviewTask
    };
});