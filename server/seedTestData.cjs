const taskDb = require('./taskDb.cjs');

const DAY_MS = 24 * 60 * 60 * 1000;
const now = Date.now();
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);
const today = startOfToday.getTime();

function dateOffset(days) {
    return today + days * DAY_MS;
}

function ymd(timestamp) {
    return new Date(timestamp).toISOString().slice(0, 10);
}

function task(overrides) {
    const createdAt = overrides.created_at || dateOffset(-10);
    const updatedAt = overrides.updated_at || createdAt;
    return {
        id: overrides.id,
        title: overrides.title,
        period: overrides.period || 'daily',
        kanban_col: overrides.kanban_col || 'todo',
        priority: overrides.priority || 'p2',
        is_focused: Boolean(overrides.is_focused),
        memo: overrides.memo || '',
        is_review: Boolean(overrides.is_review),
        project: overrides.project || null,
        parent_id: overrides.parent_id || null,
        plan_date: overrides.plan_date ?? dateOffset(0),
        due_date: overrides.due_date ?? dateOffset(1),
        completed_at: overrides.completed_at || null,
        deleted_at: overrides.deleted_at || null,
        sort_order: overrides.sort_order || updatedAt,
        planned_pomodoros: overrides.planned_pomodoros ?? 0,
        actual_pomodoros: overrides.actual_pomodoros ?? 0,
        planned_amount: overrides.planned_amount ?? 0,
        completed_amount: overrides.completed_amount ?? 0,
        unit: overrides.unit || null,
        tags: overrides.tags || ['测试种子'],
        creator_agent: overrides.creator_agent || 'SeedAgent',
        knowledge_tags: overrides.knowledge_tags || [],
        external_urls: overrides.external_urls || [],
        review_info: overrides.review_info || null,
        review_history: overrides.review_history || [],
        ai_meta_json: overrides.ai_meta_json || null,
        color: overrides.color || null,
        created_at: createdAt,
        updated_at: updatedAt
    };
}

function createSeedTasks() {
    return [
        task({
            id: 'test-epic-vcp-platform',
            title: '[测试种子] 长期 Epic：VCP 平台能力建设',
            period: 'long_term',
            kanban_col: 'in_progress',
            priority: 'p1',
            plan_date: dateOffset(-14),
            due_date: dateOffset(45),
            sort_order: 100,
            planned_amount: 100,
            completed_amount: 35,
            unit: '%',
            tags: ['测试种子', 'Epic', '长期'],
            color: '#3E3A36',
            memo: '覆盖长期任务、甘特项目节点、父级候选、进度统计。',
            created_at: dateOffset(-20),
            updated_at: dateOffset(-1)
        }),
        task({
            id: 'test-epic-learning-system',
            title: '[测试种子] 长期 Epic：学习复习系统升级',
            period: 'long_term',
            kanban_col: 'todo',
            priority: 'p2',
            plan_date: dateOffset(-7),
            due_date: dateOffset(60),
            sort_order: 110,
            planned_amount: 100,
            completed_amount: 10,
            unit: '%',
            tags: ['测试种子', 'Epic', '复习'],
            color: '#8B5CF6',
            created_at: dateOffset(-9),
            updated_at: dateOffset(-2)
        }),
        task({
            id: 'test-story-task-sync',
            title: '[测试种子] 短期 Story：任务同步机制收口',
            period: 'short_term',
            kanban_col: 'in_progress',
            priority: 'p0',
            parent_id: 'test-epic-vcp-platform',
            project: 'test-epic-vcp-platform',
            plan_date: dateOffset(-3),
            due_date: dateOffset(4),
            sort_order: 200,
            planned_pomodoros: 8,
            actual_pomodoros: 3,
            planned_amount: 8,
            completed_amount: 3,
            unit: '接口',
            tags: ['测试种子', 'Story', '同步'],
            color: '#F43F5E',
            created_at: dateOffset(-6),
            updated_at: dateOffset(0)
        }),
        task({
            id: 'test-story-review-engine',
            title: '[测试种子] 短期 Story：艾宾浩斯复习引擎',
            period: 'short_term',
            kanban_col: 'todo',
            priority: 'p1',
            parent_id: 'test-epic-learning-system',
            project: 'test-epic-learning-system',
            plan_date: dateOffset(0),
            due_date: dateOffset(7),
            sort_order: 210,
            planned_pomodoros: 6,
            actual_pomodoros: 1,
            tags: ['测试种子', 'Story', '复习'],
            color: '#516B91',
            created_at: dateOffset(-5),
            updated_at: dateOffset(-1)
        }),
        task({
            id: 'test-daily-todo-high',
            title: '[测试种子] 今日待办 P0：修复数据安全止血项',
            period: 'daily',
            kanban_col: 'todo',
            priority: 'p0',
            parent_id: 'test-story-task-sync',
            project: 'test-story-task-sync',
            plan_date: dateOffset(0),
            due_date: dateOffset(0),
            sort_order: 300,
            planned_pomodoros: 4,
            actual_pomodoros: 0,
            planned_amount: 4,
            completed_amount: 0,
            unit: '项',
            tags: ['测试种子', '今日', '高优先级'],
            memo: '覆盖今日待办、P0、父子关系、今日到期。',
            created_at: dateOffset(-1),
            updated_at: dateOffset(0)
        }),
        task({
            id: 'test-daily-in-progress-focused',
            title: '[测试种子] 今日进行中：保持唯一专注任务',
            period: 'daily',
            kanban_col: 'in_progress',
            priority: 'p1',
            is_focused: true,
            parent_id: 'test-story-task-sync',
            project: 'test-story-task-sync',
            plan_date: dateOffset(0),
            due_date: dateOffset(1),
            sort_order: 310,
            planned_pomodoros: 5,
            actual_pomodoros: 2,
            planned_amount: 5,
            completed_amount: 2,
            unit: '番茄',
            tags: ['测试种子', '专注', '进行中'],
            color: '#10B981',
            created_at: dateOffset(-2),
            updated_at: now
        }),
        task({
            id: 'test-daily-done-review-due',
            title: '[测试种子] 已完成且今日复习：Vue 响应式原理',
            period: 'daily',
            kanban_col: 'done',
            priority: 'p2',
            parent_id: 'test-story-review-engine',
            project: 'test-story-review-engine',
            plan_date: dateOffset(-2),
            due_date: dateOffset(-1),
            completed_at: dateOffset(-1) + 15 * 60 * 60 * 1000,
            sort_order: 320,
            planned_pomodoros: 3,
            actual_pomodoros: 3,
            planned_amount: 30,
            completed_amount: 30,
            unit: '页',
            is_review: true,
            knowledge_tags: ['Vue3', '响应式', 'Proxy'],
            external_urls: ['https://vuejs.org/guide/extras/reactivity-in-depth.html'],
            review_info: { next_review_date: ymd(dateOffset(0)), stage: 1, completed: false },
            review_history: [
                { reviewed_at: dateOffset(-1), remembered: true, stage_before: 0, stage_after: 1, next_review_date: ymd(dateOffset(0)) }
            ],
            tags: ['测试种子', '复习到期', '已完成'],
            color: '#4A9D9A',
            created_at: dateOffset(-4),
            updated_at: dateOffset(-1)
        }),
        task({
            id: 'test-daily-done-review-future',
            title: '[测试种子] 已完成但未来复习：SQLite WAL 笔记',
            period: 'daily',
            kanban_col: 'done',
            priority: 'p3',
            parent_id: 'test-story-review-engine',
            project: 'test-story-review-engine',
            plan_date: dateOffset(-4),
            due_date: dateOffset(-3),
            completed_at: dateOffset(-3) + 10 * 60 * 60 * 1000,
            sort_order: 330,
            planned_pomodoros: 2,
            actual_pomodoros: 2,
            is_review: true,
            knowledge_tags: ['SQLite', 'WAL', '本地优先'],
            external_urls: ['https://sqlite.org/wal.html'],
            review_info: { next_review_date: ymd(dateOffset(5)), stage: 2, completed: false },
            review_history: [
                { reviewed_at: dateOffset(-3), remembered: true, stage_before: 1, stage_after: 2, next_review_date: ymd(dateOffset(5)) }
            ],
            tags: ['测试种子', '未来复习'],
            color: '#3B82F6',
            created_at: dateOffset(-6),
            updated_at: dateOffset(-3)
        }),
        task({
            id: 'test-daily-overdue',
            title: '[测试种子] 逾期未完成：验证逾期过滤',
            period: 'daily',
            kanban_col: 'todo',
            priority: 'p1',
            parent_id: 'test-story-task-sync',
            project: 'test-story-task-sync',
            plan_date: dateOffset(-3),
            due_date: dateOffset(-1),
            sort_order: 340,
            planned_pomodoros: 2,
            actual_pomodoros: 0,
            tags: ['测试种子', '逾期'],
            color: '#F59E0B',
            created_at: dateOffset(-5),
            updated_at: dateOffset(-2)
        }),
        task({
            id: 'test-routine-habit',
            title: '[测试种子] 常驻习惯：每日复盘 10 分钟',
            period: 'routine',
            kanban_col: 'todo',
            priority: 'p2',
            plan_date: dateOffset(0),
            due_date: null,
            sort_order: 400,
            planned_pomodoros: 1,
            actual_pomodoros: 0,
            planned_amount: 10,
            completed_amount: 0,
            unit: '分钟',
            tags: ['测试种子', 'Routine', '习惯'],
            color: '#81C784',
            created_at: dateOffset(-8),
            updated_at: dateOffset(0)
        }),
        task({
            id: 'test-soft-deleted',
            title: '[测试种子] 已软删除：回收站恢复验证',
            period: 'daily',
            kanban_col: 'todo',
            priority: 'p3',
            plan_date: dateOffset(-2),
            due_date: dateOffset(1),
            deleted_at: dateOffset(-1),
            sort_order: 900,
            tags: ['测试种子', '软删除'],
            created_at: dateOffset(-4),
            updated_at: dateOffset(-1)
        }),
        task({
            id: 'test-completed-yesterday',
            title: '[测试种子] 昨日完成：统计趋势样本',
            period: 'daily',
            kanban_col: 'done',
            priority: 'p2',
            plan_date: dateOffset(-1),
            due_date: dateOffset(-1),
            completed_at: dateOffset(-1) + 20 * 60 * 60 * 1000,
            sort_order: 350,
            planned_pomodoros: 2,
            actual_pomodoros: 2,
            planned_amount: 2,
            completed_amount: 2,
            unit: '项',
            tags: ['测试种子', '统计'],
            created_at: dateOffset(-2),
            updated_at: dateOffset(-1)
        })
    ];
}

async function main() {
    const tasks = createSeedTasks();
    const saved = await taskDb.replaceTestTasks(tasks);
    console.log(`[seed-test-data] 已删除旧测试数据并写入 ${saved.length} 条覆盖测试用例的种子任务。`);
    console.log(`[seed-test-data] 数据库: ${taskDb.dbPath}`);
}

main().catch(error => {
    console.error('[seed-test-data] 写入失败:', error);
    process.exitCode = 1;
});
