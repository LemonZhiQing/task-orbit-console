const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DEFAULT_TASK_DATA_DIR = 'F:/vcp/VCPToolBox/VCPTaskData';
const taskDataDir = path.resolve(process.env.TASK_DB_DIR || DEFAULT_TASK_DATA_DIR);
const dbPath = path.join(taskDataDir, 'tasks.db');

if (!fs.existsSync(taskDataDir)) {
    fs.mkdirSync(taskDataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

initDb();

function initDb() {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      period TEXT DEFAULT 'daily',
      kanban_col TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'p2',
      is_focused INTEGER DEFAULT 0,
      memo TEXT,
      is_review INTEGER DEFAULT 0,
      project TEXT,
      plan_date INTEGER,
      due_date INTEGER,
      planned_pomodoros INTEGER DEFAULT 0,
      actual_pomodoros INTEGER DEFAULT 0,
      planned_amount REAL DEFAULT 0,
      completed_amount REAL DEFAULT 0,
      unit TEXT,
      tags_json TEXT DEFAULT '[]',
      creator_agent TEXT,
      review_meta_json TEXT DEFAULT '{}',
      knowledge_refs_json TEXT, 
      created_at TEXT,
      updated_at TEXT
    );
  `;

    db.exec(createTableQuery);

    const columns = db.prepare("PRAGMA table_info(tasks)").all().map(column => column.name);    
    const migrations = [
        ['period', "ALTER TABLE tasks ADD COLUMN period TEXT DEFAULT 'daily'"],
        ['kanban_col', "ALTER TABLE tasks ADD COLUMN kanban_col TEXT DEFAULT 'todo'"],
        ['is_focused', "ALTER TABLE tasks ADD COLUMN is_focused INTEGER DEFAULT 0"],
        ['is_review', "ALTER TABLE tasks ADD COLUMN is_review INTEGER DEFAULT 0"],
        ['knowledge_refs_json', "ALTER TABLE tasks ADD COLUMN knowledge_refs_json TEXT DEFAULT '[]'"],
        ['created_at', "ALTER TABLE tasks ADD COLUMN created_at TEXT"],
        ['updated_at', "ALTER TABLE tasks ADD COLUMN updated_at TEXT"],
        
        ['priority', "ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'p2'"],
        ['project', "ALTER TABLE tasks ADD COLUMN project TEXT"],
        ['plan_date', "ALTER TABLE tasks ADD COLUMN plan_date INTEGER"],
        ['due_date', "ALTER TABLE tasks ADD COLUMN due_date INTEGER"],
        ['planned_pomodoros', "ALTER TABLE tasks ADD COLUMN planned_pomodoros INTEGER DEFAULT 0"],
        ['actual_pomodoros', "ALTER TABLE tasks ADD COLUMN actual_pomodoros INTEGER DEFAULT 0"],
        ['planned_amount', "ALTER TABLE tasks ADD COLUMN planned_amount REAL DEFAULT 0"],
        ['completed_amount', "ALTER TABLE tasks ADD COLUMN completed_amount REAL DEFAULT 0"],
        ['unit', "ALTER TABLE tasks ADD COLUMN unit TEXT"],
        ['tags_json', "ALTER TABLE tasks ADD COLUMN tags_json TEXT DEFAULT '[]'"],
        ['creator_agent', "ALTER TABLE tasks ADD COLUMN creator_agent TEXT"],
        ['review_meta_json', "ALTER TABLE tasks ADD COLUMN review_meta_json TEXT DEFAULT '{}'"]
    ];

    for (const [name, sql] of migrations) {
        if (!columns.includes(name)) {
            db.exec(sql);
        }
    }
}

function safeParseJSON(value, fallback) {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        return fallback;
    }
}

function normalizeTask(task) {
    const now = new Date().toISOString();
    
    const reviewMeta = {
        knowledge_tags: Array.isArray(task.knowledge_tags) ? task.knowledge_tags : [],
        external_urls: Array.isArray(task.external_urls) ? task.external_urls : [],
        review_info: task.review_info || null
    };

    return {
        id: String(task.id || ''),
        title: String(task.title || '未命名任务'),
        period: typeof task.period === 'string' ? task.period : 'daily',
        kanban_col: typeof task.kanban_col === 'string' ? task.kanban_col : 'todo',
        priority: typeof task.priority === 'string' ? task.priority : 'p2',
        
        is_focused: Boolean(task.is_focused),
        memo: typeof task.memo === 'string' ? task.memo : '',
        is_review: Boolean(task.is_review),
        
        project: task.project ? String(task.project) : null,
        plan_date: task.plan_date ? Number(task.plan_date) : null,
        due_date: task.due_date ? Number(task.due_date) : null,
        planned_pomodoros: Number(task.planned_pomodoros) || 0,
        actual_pomodoros: Number(task.actual_pomodoros) || 0,
        planned_amount: Number(task.planned_amount) || 0,
        completed_amount: Number(task.completed_amount) || 0,
        unit: task.unit ? String(task.unit) : null,
        tags: Array.isArray(task.tags) ? task.tags : [],
        creator_agent: task.creator_agent ? String(task.creator_agent) : null,
        
        review_meta: reviewMeta,
        
        created_at: task.created_at || now,
        updated_at: task.updated_at || now
    };
}

function serializeTask(task) {
    const normalized = normalizeTask(task);
    return {
        ...normalized,
        is_focused: normalized.is_focused ? 1 : 0,
        is_review: normalized.is_review ? 1 : 0,
        tags_json: JSON.stringify(normalized.tags),
        review_meta_json: JSON.stringify(normalized.review_meta)
    };
}

function deserializeTask(row) {
    if (!row) return null;
    
    const tags = safeParseJSON(row.tags_json, []);
    const reviewMeta = safeParseJSON(row.review_meta_json, {});
    
    const legacyKnowledgeRefs = safeParseJSON(row.knowledge_refs_json, []);
    let knowledgeTags = reviewMeta.knowledge_tags || [];
    if (knowledgeTags.length === 0 && legacyKnowledgeRefs.length > 0) {
         knowledgeTags = legacyKnowledgeRefs;
    }

    return normalizeTask({
        id: row.id,
        title: row.title,
        period: row.period,
        kanban_col: row.kanban_col,
        priority: row.priority,
        is_focused: Boolean(row.is_focused),
        memo: row.memo,
        is_review: Boolean(row.is_review),
        
        project: row.project,
        plan_date: row.plan_date,
        due_date: row.due_date,
        planned_pomodoros: row.planned_pomodoros,
        actual_pomodoros: row.actual_pomodoros,
        planned_amount: row.planned_amount,
        completed_amount: row.completed_amount,
        unit: row.unit,
        tags: tags,
        creator_agent: row.creator_agent,
        
        knowledge_tags: knowledgeTags,
        external_urls: reviewMeta.external_urls || [],
        review_info: reviewMeta.review_info || null,
        
        created_at: row.created_at,
        updated_at: row.updated_at
    });
}

const statements = {
    getAllTasks: db.prepare('SELECT * FROM tasks ORDER BY updated_at DESC, created_at DESC'),   
    getTaskById: db.prepare('SELECT * FROM tasks WHERE id = ?'),
    
    insertTask: db.prepare(`
    INSERT INTO tasks (
      id, title, period, kanban_col, priority, is_focused, memo, is_review,
      project, plan_date, due_date, planned_pomodoros, actual_pomodoros,
      planned_amount, completed_amount, unit, tags_json, creator_agent, review_meta_json,
      knowledge_refs_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  
    updateTask: db.prepare(`
    UPDATE tasks SET
      title = ?, period = ?, kanban_col = ?, priority = ?, is_focused = ?, memo = ?, is_review = ?,
      project = ?, plan_date = ?, due_date = ?, planned_pomodoros = ?, actual_pomodoros = ?,
      planned_amount = ?, completed_amount = ?, unit = ?, tags_json = ?, creator_agent = ?, review_meta_json = ?,
      updated_at = ?
    WHERE id = ?
  `),
  
    deleteTask: db.prepare('DELETE FROM tasks WHERE id = ?')
};

async function getAllTasks() {
    return statements.getAllTasks.all().map(deserializeTask);
}

async function getTaskById(id) {
    return deserializeTask(statements.getTaskById.get(id));
}

async function insertTask(task) {
    const serialized = serializeTask(task);
    statements.insertTask.run(
        serialized.id,
        serialized.title,
        serialized.period,
        serialized.kanban_col,
        serialized.priority,
        serialized.is_focused,
        serialized.memo,
        serialized.is_review,
        serialized.project,
        serialized.plan_date,
        serialized.due_date,
        serialized.planned_pomodoros,
        serialized.actual_pomodoros,
        serialized.planned_amount,
        serialized.completed_amount,
        serialized.unit,
        serialized.tags_json,
        serialized.creator_agent,
        serialized.review_meta_json,
        '[]', 
        serialized.created_at,
        serialized.updated_at
    );
    return getTaskById(serialized.id);
}

async function updateTask(id, updates) {
    const existingTask = await getTaskById(id);
    if (!existingTask) {
        throw new Error('Task not found with id: ' + id);
    }

    const mergedTask = normalizeTask({
        ...existingTask,
        ...updates,
        id,
        updated_at: new Date().toISOString()
    });

    const serialized = serializeTask(mergedTask);
    statements.updateTask.run(
        serialized.title,
        serialized.period,
        serialized.kanban_col,
        serialized.priority,
        serialized.is_focused,
        serialized.memo,
        serialized.is_review,
        serialized.project,
        serialized.plan_date,
        serialized.due_date,
        serialized.planned_pomodoros,
        serialized.actual_pomodoros,
        serialized.planned_amount,
        serialized.completed_amount,
        serialized.unit,
        serialized.tags_json,
        serialized.creator_agent,
        serialized.review_meta_json,
        serialized.updated_at,
        id
    );

    return getTaskById(id);
}

async function replaceAllTasks(tasks) {
    const normalizedTasks = Array.isArray(tasks) ? tasks.map(normalizeTask) : [];
    const transaction = db.transaction(items => {
        db.exec('DELETE FROM tasks');
        for (const task of items) {
            const serialized = serializeTask(task);
            statements.insertTask.run(
                serialized.id,
                serialized.title,
                serialized.period,
                serialized.kanban_col,
                serialized.priority,
                serialized.is_focused,
                serialized.memo,
                serialized.is_review,
                serialized.project,
                serialized.plan_date,
                serialized.due_date,
                serialized.planned_pomodoros,
                serialized.actual_pomodoros,
                serialized.planned_amount,
                serialized.completed_amount,
                serialized.unit,
                serialized.tags_json,
                serialized.creator_agent,
                serialized.review_meta_json,
                '[]', 
                serialized.created_at,
                serialized.updated_at
            );
        }
    });

    transaction(normalizedTasks);
    return getAllTasks();
}

async function deleteTask(id) {
    const existingTask = await getTaskById(id);
    if (!existingTask) {
        throw new Error('Task not found with id: ' + id);
    }

    statements.deleteTask.run(id);
    return existingTask;
}

async function getTaskStats() {
    const tasks = await getAllTasks();
    return tasks.reduce(
        (stats, task) => {
            stats.total += 1;
            if (task.kanban_col === 'todo') stats.todo += 1;
            if (task.kanban_col === 'in_progress') stats.in_progress += 1;
            if (task.kanban_col === 'done') stats.done += 1;
            if (task.is_review) stats.review += 1;
            if (task.is_focused) stats.focused += 1;
            return stats;
        },
        { total: 0, todo: 0, in_progress: 0, done: 0, review: 0, focused: 0 }
    );
}

// === V4.0 新增：活期父级项目过滤引擎 ===
async function getParentCandidates(currentPeriod) {
    let targetPeriod = null;
    // 任务向上一级跃迁，寻找父节点
    if (currentPeriod === 'daily') targetPeriod = 'short_term';
    else if (currentPeriod === 'short_term') targetPeriod = 'long_term';
    
    // 如果是 long_term 或者是不可预知的常驻任务，返回空数组
    if (!targetPeriod) return [];
    
    const now = Date.now();
    // 活期过滤网：不能是 done 完结的，且截止日期必须在当下或未来
    const sql = "SELECT id, title, period, due_date FROM tasks WHERE period = ? AND kanban_col != 'done' AND (due_date IS NULL OR due_date >= ?) ORDER BY created_at DESC";
    const stmt = db.prepare(sql);
    
    // 由于我们存储的是时间戳，直接传 now 进去做数值比对
    return stmt.all(targetPeriod, now);
}

module.exports = {
    db,
    dbPath,
    taskDataDir,
    getAllTasks,
    getTaskById,
    insertTask,
    updateTask,
    replaceAllTasks,
    deleteTask,
    getTaskStats,
    getParentCandidates // 导出这个方法，供 taskApi.cjs 的 /parent-candidates 路由调用
};