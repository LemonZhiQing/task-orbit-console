const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DEFAULT_TASK_DATA_DIR = 'F:/vcp/VCPToolBox/VCPTaskData';
const taskDataDir = path.resolve(process.env.TASK_DB_DIR || DEFAULT_TASK_DATA_DIR);
const dbPath = path.join(taskDataDir, 'tasks.db');
const backupDir = path.join(taskDataDir, 'backups');

const VALID_PERIODS = new Set(['daily', 'short_term', 'long_term', 'routine']);
const VALID_COLUMNS = new Set(['todo', 'in_progress', 'done']);
const VALID_PRIORITIES = new Set(['p0', 'p1', 'p2', 'p3']);

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
      parent_id TEXT,
      plan_date INTEGER,
      due_date INTEGER,
      completed_at INTEGER,
      deleted_at INTEGER,
      sort_order INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      planned_pomodoros INTEGER DEFAULT 0,
      actual_pomodoros INTEGER DEFAULT 0,
      planned_amount REAL DEFAULT 0,
      completed_amount REAL DEFAULT 0,
      unit TEXT,
      tags_json TEXT DEFAULT '[]',
      creator_agent TEXT,
      review_meta_json TEXT DEFAULT '{}',
      review_history_json TEXT DEFAULT '[]',
      knowledge_refs_json TEXT,
      ai_meta_json TEXT,
      color TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
  `;

    db.exec(createTableQuery);

    const columns = db.prepare('PRAGMA table_info(tasks)').all().map(column => column.name);
    const migrations = [
        ['period', "ALTER TABLE tasks ADD COLUMN period TEXT DEFAULT 'daily'"],
        ['kanban_col', "ALTER TABLE tasks ADD COLUMN kanban_col TEXT DEFAULT 'todo'"],
        ['priority', "ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'p2'"],
        ['is_focused', 'ALTER TABLE tasks ADD COLUMN is_focused INTEGER DEFAULT 0'],
        ['memo', 'ALTER TABLE tasks ADD COLUMN memo TEXT'],
        ['is_review', 'ALTER TABLE tasks ADD COLUMN is_review INTEGER DEFAULT 0'],
        ['project', 'ALTER TABLE tasks ADD COLUMN project TEXT'],
        ['parent_id', 'ALTER TABLE tasks ADD COLUMN parent_id TEXT'],
        ['plan_date', 'ALTER TABLE tasks ADD COLUMN plan_date INTEGER'],
        ['due_date', 'ALTER TABLE tasks ADD COLUMN due_date INTEGER'],
        ['completed_at', 'ALTER TABLE tasks ADD COLUMN completed_at INTEGER'],
        ['deleted_at', 'ALTER TABLE tasks ADD COLUMN deleted_at INTEGER'],
        ['sort_order', 'ALTER TABLE tasks ADD COLUMN sort_order INTEGER DEFAULT 0'],
        ['version', 'ALTER TABLE tasks ADD COLUMN version INTEGER DEFAULT 1'],
        ['planned_pomodoros', 'ALTER TABLE tasks ADD COLUMN planned_pomodoros INTEGER DEFAULT 0'],
        ['actual_pomodoros', 'ALTER TABLE tasks ADD COLUMN actual_pomodoros INTEGER DEFAULT 0'],
        ['planned_amount', 'ALTER TABLE tasks ADD COLUMN planned_amount REAL DEFAULT 0'],
        ['completed_amount', 'ALTER TABLE tasks ADD COLUMN completed_amount REAL DEFAULT 0'],
        ['unit', 'ALTER TABLE tasks ADD COLUMN unit TEXT'],
        ['tags_json', "ALTER TABLE tasks ADD COLUMN tags_json TEXT DEFAULT '[]'"],
        ['creator_agent', 'ALTER TABLE tasks ADD COLUMN creator_agent TEXT'],
        ['review_meta_json', "ALTER TABLE tasks ADD COLUMN review_meta_json TEXT DEFAULT '{}'"],
        ['review_history_json', "ALTER TABLE tasks ADD COLUMN review_history_json TEXT DEFAULT '[]'"],
        ['knowledge_refs_json', "ALTER TABLE tasks ADD COLUMN knowledge_refs_json TEXT DEFAULT '[]'"],
        ['ai_meta_json', 'ALTER TABLE tasks ADD COLUMN ai_meta_json TEXT'],
        ['color', 'ALTER TABLE tasks ADD COLUMN color TEXT'],
        ['created_at', 'ALTER TABLE tasks ADD COLUMN created_at INTEGER'],
        ['updated_at', 'ALTER TABLE tasks ADD COLUMN updated_at INTEGER']
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

function toTimestamp(value, fallback = null) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return fallback;
        const numeric = Number(trimmed);
        if (Number.isFinite(numeric)) return numeric;
        const parsed = Date.parse(trimmed);
        if (Number.isFinite(parsed)) return parsed;
    }
    if (value instanceof Date) return value.getTime();
    return fallback;
}

function normalizeStringArray(value) {
    if (Array.isArray(value)) {
        return value.map(item => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
}

function normalizeReviewInfo(value) {
    if (!value || typeof value !== 'object') return null;
    const nextReviewDate = value.next_review_date ? String(value.next_review_date) : '';
    const stage = Number.isFinite(Number(value.stage)) ? Number(value.stage) : 0;
    return {
        next_review_date: nextReviewDate,
        stage,
        completed: Boolean(value.completed)
    };
}

function normalizeReviewHistory(value) {
    if (!Array.isArray(value)) return [];
    return value.map(entry => ({
        reviewed_at: toTimestamp(entry.reviewed_at, Date.now()),
        remembered: Boolean(entry.remembered),
        stage_before: Number.isFinite(Number(entry.stage_before)) ? Number(entry.stage_before) : 0,
        stage_after: Number.isFinite(Number(entry.stage_after)) ? Number(entry.stage_after) : 0,
        next_review_date: entry.next_review_date ? String(entry.next_review_date) : ''
    }));
}

function normalizeTask(task = {}) {
    const now = Date.now();
    const createdAt = toTimestamp(task.created_at, now);
    const updatedAt = toTimestamp(task.updated_at, createdAt);
    const period = VALID_PERIODS.has(task.period) ? task.period : 'daily';
    const kanbanCol = VALID_COLUMNS.has(task.kanban_col) ? task.kanban_col : 'todo';
    const priority = VALID_PRIORITIES.has(task.priority) ? task.priority : 'p2';
    const completedAt = toTimestamp(task.completed_at, kanbanCol === 'done' ? updatedAt : null);

    const reviewMetaSource = task.review_meta && typeof task.review_meta === 'object' ? task.review_meta : {};
    const knowledgeTags = normalizeStringArray(task.knowledge_tags || reviewMetaSource.knowledge_tags);
    const externalUrls = normalizeStringArray(task.external_urls || reviewMetaSource.external_urls);
    const reviewInfo = normalizeReviewInfo(task.review_info || reviewMetaSource.review_info);
    const reviewHistory = normalizeReviewHistory(task.review_history || reviewMetaSource.review_history);

    const rawParentId = task.parent_id || task.project || null;

    return {
        id: String(task.id || ''),
        title: String(task.title || '未命名任务'),
        period,
        kanban_col: kanbanCol,
        priority,
        is_focused: Boolean(task.is_focused),
        memo: typeof task.memo === 'string' ? task.memo : '',
        is_review: Boolean(task.is_review) && !reviewInfo?.completed,
        project: task.project ? String(task.project) : null,
        parent_id: rawParentId ? String(rawParentId) : null,
        plan_date: toTimestamp(task.plan_date, null),
        due_date: toTimestamp(task.due_date, null),
        completed_at: completedAt,
        deleted_at: toTimestamp(task.deleted_at, null),
        sort_order: Number.isFinite(Number(task.sort_order)) ? Number(task.sort_order) : updatedAt,
        version: Number.isFinite(Number(task.version)) && Number(task.version) > 0 ? Number(task.version) : 1,
        planned_pomodoros: Number.isFinite(Number(task.planned_pomodoros)) ? Number(task.planned_pomodoros) : 0,
        actual_pomodoros: Number.isFinite(Number(task.actual_pomodoros)) ? Number(task.actual_pomodoros) : 0,
        planned_amount: Number.isFinite(Number(task.planned_amount)) ? Number(task.planned_amount) : 0,
        completed_amount: Number.isFinite(Number(task.completed_amount)) ? Number(task.completed_amount) : 0,
        unit: task.unit ? String(task.unit) : null,
        tags: normalizeStringArray(task.tags),
        creator_agent: task.creator_agent ? String(task.creator_agent) : null,
        knowledge_tags: knowledgeTags,
        external_urls: externalUrls,
        review_info: reviewInfo,
        review_history: reviewHistory,
        ai_meta_json: typeof task.ai_meta_json === 'string'
            ? task.ai_meta_json
            : task.ai_meta ? JSON.stringify(task.ai_meta) : null,
        color: task.color ? String(task.color) : null,
        created_at: createdAt,
        updated_at: updatedAt
    };
}

function serializeTask(task) {
    const normalized = normalizeTask(task);
    const reviewMeta = {
        knowledge_tags: normalized.knowledge_tags,
        external_urls: normalized.external_urls,
        review_info: normalized.review_info,
        review_history: normalized.review_history
    };

    return {
        ...normalized,
        is_focused: normalized.is_focused ? 1 : 0,
        is_review: normalized.is_review ? 1 : 0,
        tags_json: JSON.stringify(normalized.tags),
        review_meta_json: JSON.stringify(reviewMeta),
        review_history_json: JSON.stringify(normalized.review_history),
        knowledge_refs_json: JSON.stringify(normalized.knowledge_tags)
    };
}

function deserializeTask(row) {
    if (!row) return null;

    const tags = safeParseJSON(row.tags_json, []);
    const reviewMeta = safeParseJSON(row.review_meta_json, {});
    const legacyKnowledgeRefs = safeParseJSON(row.knowledge_refs_json, []);
    const reviewHistory = safeParseJSON(row.review_history_json, reviewMeta.review_history || []);

    let knowledgeTags = normalizeStringArray(reviewMeta.knowledge_tags);
    if (knowledgeTags.length === 0 && Array.isArray(legacyKnowledgeRefs)) {
        knowledgeTags = normalizeStringArray(legacyKnowledgeRefs);
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
        parent_id: row.parent_id,
        plan_date: row.plan_date,
        due_date: row.due_date,
        completed_at: row.completed_at,
        deleted_at: row.deleted_at,
        sort_order: row.sort_order,
        version: row.version,
        planned_pomodoros: row.planned_pomodoros,
        actual_pomodoros: row.actual_pomodoros,
        planned_amount: row.planned_amount,
        completed_amount: row.completed_amount,
        unit: row.unit,
        tags,
        creator_agent: row.creator_agent,
        knowledge_tags: knowledgeTags,
        external_urls: reviewMeta.external_urls || [],
        review_info: reviewMeta.review_info || null,
        review_history: reviewHistory,
        ai_meta_json: row.ai_meta_json,
        color: row.color,
        created_at: row.created_at,
        updated_at: row.updated_at
    });
}

const statements = {
    getAllTasks: db.prepare('SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY sort_order ASC, updated_at DESC, created_at DESC'),
    getAllTasksWithDeleted: db.prepare('SELECT * FROM tasks ORDER BY sort_order ASC, updated_at DESC, created_at DESC'),
    getTaskById: db.prepare('SELECT * FROM tasks WHERE id = ?'),
    insertTask: db.prepare(`
    INSERT INTO tasks (
      id, title, period, kanban_col, priority, is_focused, memo, is_review,
      project, parent_id, plan_date, due_date, completed_at, deleted_at, sort_order, version,
      planned_pomodoros, actual_pomodoros, planned_amount, completed_amount, unit,
      tags_json, creator_agent, review_meta_json, review_history_json, knowledge_refs_json,
      ai_meta_json, color, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
    updateTask: db.prepare(`
    UPDATE tasks SET
      title = ?, period = ?, kanban_col = ?, priority = ?, is_focused = ?, memo = ?, is_review = ?,
      project = ?, parent_id = ?, plan_date = ?, due_date = ?, completed_at = ?, deleted_at = ?, sort_order = ?, version = ?,
      planned_pomodoros = ?, actual_pomodoros = ?, planned_amount = ?, completed_amount = ?, unit = ?,
      tags_json = ?, creator_agent = ?, review_meta_json = ?, review_history_json = ?, knowledge_refs_json = ?,
      ai_meta_json = ?, color = ?, created_at = ?, updated_at = ?
    WHERE id = ?
  `),
    hardDeleteTask: db.prepare('DELETE FROM tasks WHERE id = ?'),
    deleteTestTasks: db.prepare(`
      DELETE FROM tasks
      WHERE id LIKE 'test-%'
         OR title LIKE '%测试集%'
         OR title LIKE '[测试种子]%'
         OR title LIKE '%[测试种子]%'
    `)
};

function runInsert(serialized) {
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
        serialized.parent_id,
        serialized.plan_date,
        serialized.due_date,
        serialized.completed_at,
        serialized.deleted_at,
        serialized.sort_order,
        serialized.version,
        serialized.planned_pomodoros,
        serialized.actual_pomodoros,
        serialized.planned_amount,
        serialized.completed_amount,
        serialized.unit,
        serialized.tags_json,
        serialized.creator_agent,
        serialized.review_meta_json,
        serialized.review_history_json,
        serialized.knowledge_refs_json,
        serialized.ai_meta_json,
        serialized.color,
        serialized.created_at,
        serialized.updated_at
    );
}

function runUpdate(serialized, id) {
    statements.updateTask.run(
        serialized.title,
        serialized.period,
        serialized.kanban_col,
        serialized.priority,
        serialized.is_focused,
        serialized.memo,
        serialized.is_review,
        serialized.project,
        serialized.parent_id,
        serialized.plan_date,
        serialized.due_date,
        serialized.completed_at,
        serialized.deleted_at,
        serialized.sort_order,
        serialized.version,
        serialized.planned_pomodoros,
        serialized.actual_pomodoros,
        serialized.planned_amount,
        serialized.completed_amount,
        serialized.unit,
        serialized.tags_json,
        serialized.creator_agent,
        serialized.review_meta_json,
        serialized.review_history_json,
        serialized.knowledge_refs_json,
        serialized.ai_meta_json,
        serialized.color,
        serialized.created_at,
        serialized.updated_at,
        id
    );
}

function createDatabaseBackup(reason = 'manual') {
    if (!fs.existsSync(dbPath)) return null;
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    try {
        db.pragma('wal_checkpoint(FULL)');
    } catch (error) {
        console.warn('[task-db] WAL checkpoint failed before backup:', error.message);
    }

    const safeReason = String(reason).replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `tasks.${safeReason}.${timestamp}.db`);
    fs.copyFileSync(dbPath, backupPath);
    return backupPath;
}

async function getAllTasks(options = {}) {
    const includeDeleted = Boolean(options.includeDeleted);
    const rows = includeDeleted ? statements.getAllTasksWithDeleted.all() : statements.getAllTasks.all();
    return rows.map(deserializeTask);
}

async function getTaskById(id, options = {}) {
    const task = deserializeTask(statements.getTaskById.get(id));
    if (!task) return null;
    if (!options.includeDeleted && task.deleted_at) return null;
    return task;
}

async function insertTask(task) {
    const serialized = serializeTask(task);
    if (!serialized.id) {
        throw new Error('Task id is required');
    }
    runInsert(serialized);
    return getTaskById(serialized.id, { includeDeleted: true });
}

async function updateTask(id, updates) {
    const existingTask = await getTaskById(id, { includeDeleted: true });
    if (!existingTask) {
        throw new Error('Task not found with id: ' + id);
    }

    const now = Date.now();
    const nextColumn = updates.kanban_col || existingTask.kanban_col;
    const mergedTask = normalizeTask({
        ...existingTask,
        ...updates,
        id,
        completed_at: Object.prototype.hasOwnProperty.call(updates, 'completed_at')
            ? updates.completed_at
            : nextColumn === 'done'
                ? (existingTask.completed_at || now)
                : null,
        updated_at: now,
        version: Number(existingTask.version || 1) + 1
    });

    const serialized = serializeTask(mergedTask);
    runUpdate(serialized, id);
    return getTaskById(id, { includeDeleted: true });
}

async function upsertTask(task) {
    const normalized = normalizeTask(task);
    if (!normalized.id) {
        throw new Error('Task id is required');
    }

    const existingTask = await getTaskById(normalized.id, { includeDeleted: true });
    if (existingTask) {
        return updateTask(normalized.id, normalized);
    }

    return insertTask(normalized);
}

async function replaceAllTasks(tasks, options = {}) {
    const normalizedTasks = Array.isArray(tasks) ? tasks.map(normalizeTask) : [];
    if (options.backup !== false) {
        createDatabaseBackup('replace-all');
    }

    const transaction = db.transaction(items => {
        db.exec('DELETE FROM tasks');
        for (const task of items) {
            runInsert(serializeTask(task));
        }
    });

    transaction(normalizedTasks);
    return getAllTasks({ includeDeleted: true });
}

async function deleteTask(id, options = {}) {
    const existingTask = await getTaskById(id, { includeDeleted: true });
    if (!existingTask) {
        throw new Error('Task not found with id: ' + id);
    }

    if (options.hard === true) {
        statements.hardDeleteTask.run(id);
        return existingTask;
    }

    return updateTask(id, { deleted_at: Date.now(), is_focused: false });
}

async function restoreTask(id) {
    const existingTask = await getTaskById(id, { includeDeleted: true });
    if (!existingTask) {
        throw new Error('Task not found with id: ' + id);
    }
    return updateTask(id, { deleted_at: null });
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
            stats.actual_pomodoros += task.actual_pomodoros || 0;
            stats.planned_pomodoros += task.planned_pomodoros || 0;
            return stats;
        },
        { total: 0, todo: 0, in_progress: 0, done: 0, review: 0, focused: 0, actual_pomodoros: 0, planned_pomodoros: 0 }
    );
}

async function getParentCandidates(currentPeriod) {
    let targetPeriod = null;
    if (currentPeriod === 'daily') targetPeriod = 'short_term';
    else if (currentPeriod === 'short_term') targetPeriod = 'long_term';

    if (!targetPeriod) return [];

    const now = Date.now();
    const sql = `
      SELECT id, title, period, due_date
      FROM tasks
      WHERE period = ?
        AND kanban_col != 'done'
        AND deleted_at IS NULL
        AND (due_date IS NULL OR due_date >= ?)
      ORDER BY sort_order ASC, created_at DESC
    `;
    const stmt = db.prepare(sql);

    return stmt.all(targetPeriod, now).map(row => ({
        id: row.id,
        title: row.title,
        period: row.period,
        due_date: toTimestamp(row.due_date, null)
    }));
}

async function replaceTestTasks(tasks) {
    const normalizedTasks = Array.isArray(tasks) ? tasks.map(normalizeTask) : [];
    createDatabaseBackup('seed-test-data');

    const transaction = db.transaction(items => {
        statements.deleteTestTasks.run();
        for (const task of items) {
            const existing = statements.getTaskById.get(task.id);
            if (existing) {
                runUpdate(serializeTask({ ...task, updated_at: Date.now(), version: Number(existing.version || 1) + 1 }), task.id);
            } else {
                runInsert(serializeTask(task));
            }
        }
    });

    transaction(normalizedTasks);
    return normalizedTasks;
}

module.exports = {
    db,
    dbPath,
    taskDataDir,
    backupDir,
    normalizeTask,
    serializeTask,
    deserializeTask,
    createDatabaseBackup,
    getAllTasks,
    getTaskById,
    insertTask,
    updateTask,
    upsertTask,
    replaceAllTasks,
    deleteTask,
    restoreTask,
    getTaskStats,
    getParentCandidates,
    replaceTestTasks
};
