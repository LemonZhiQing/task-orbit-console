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
      status TEXT DEFAULT 'todo',
      plan_date TEXT,
      project TEXT,
      priority TEXT,
      progress INTEGER DEFAULT 0,
      next_review_date TEXT,
      properties_json TEXT,
      ai_meta_json TEXT,
      knowledge_refs_json TEXT,
      memo TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `;

    db.exec(createTableQuery);
}

function safeParseJSON(value, fallback) {
    try {
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        return fallback;
    }
}

function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
}

function deepMerge(base, patch) {
    if (patch === undefined) return base;
    if (Array.isArray(base) || Array.isArray(patch)) {
        return patch;
    }
    if (!isPlainObject(base) || !isPlainObject(patch)) {
        return patch;
    }

    const merged = { ...base };
    for (const [key, value] of Object.entries(patch)) {
        merged[key] = key in base ? deepMerge(base[key], value) : value;
    }
    return merged;
}

function normalizeKnowledgeRefs(value) {
    const normalized = isPlainObject(value) ? { ...value } : {};
    normalized.tags = Array.isArray(normalized.tags) ? normalized.tags : [];
    normalized.diary_ids = Array.isArray(normalized.diary_ids) ? normalized.diary_ids : [];
    normalized.external_urls = Array.isArray(normalized.external_urls) ? normalized.external_urls : [];
    return normalized;
}

function serializeTask(task) {
    const properties = isPlainObject(task.properties) ? task.properties : {};
    const aiMeta = isPlainObject(task.ai_meta) ? task.ai_meta : {};
    const reviewInfo = isPlainObject(aiMeta.review_info) ? aiMeta.review_info : {};
    const knowledgeRefs = normalizeKnowledgeRefs(task.knowledge_refs);
    const now = new Date().toISOString();
    const progress = Number(aiMeta.progress ?? 0);

    return {
        id: task.id,
        title: task.title,
        status: properties.status || 'todo',
        plan_date: properties.plan_date || null,
        project: properties.project || null,
        priority: properties.priority || null,
        progress: Number.isFinite(progress) ? progress : 0,
        next_review_date: reviewInfo.next_review_date || null,
        properties_json: JSON.stringify(properties),
        ai_meta_json: JSON.stringify(aiMeta),
        knowledge_refs_json: JSON.stringify(knowledgeRefs),
        memo: typeof task.memo === 'string' ? task.memo : '',
        created_at: task.created_at || now,
        updated_at: task.updated_at || now
    };
}

function deserializeTask(row) {
    if (!row) return null;

    const properties = safeParseJSON(row.properties_json, {});
    const ai_meta = safeParseJSON(row.ai_meta_json, {});
    const knowledge_refs = normalizeKnowledgeRefs(safeParseJSON(row.knowledge_refs_json, {}));

    properties.status = row.status || properties.status || 'todo';
    properties.plan_date = row.plan_date ?? properties.plan_date ?? '';
    properties.project = row.project ?? properties.project ?? '';
    properties.priority = row.priority ?? properties.priority ?? 'P2';

    ai_meta.progress = Number.isFinite(Number(row.progress)) ? Number(row.progress) : Number(ai_meta.progress || 0);
    if (row.next_review_date) {
        ai_meta.review_info = isPlainObject(ai_meta.review_info) ? ai_meta.review_info : {};
        ai_meta.review_info.next_review_date = row.next_review_date;
    }

    return {
        id: row.id,
        title: row.title,
        properties,
        ai_meta,
        knowledge_refs,
        memo: row.memo || '',
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

const statements = {
    getAllTasks: db.prepare('SELECT * FROM tasks ORDER BY COALESCE(plan_date, created_at) ASC, created_at ASC'),
    getTaskById: db.prepare('SELECT * FROM tasks WHERE id = ?'),
    insertTask: db.prepare(`
    INSERT INTO tasks (
      id, title, status, plan_date, project, priority, progress, next_review_date,
      properties_json, ai_meta_json, knowledge_refs_json, memo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
    updateTask: db.prepare(`
    UPDATE tasks SET
      title = ?, status = ?, plan_date = ?, project = ?, priority = ?, progress = ?, next_review_date = ?,
      properties_json = ?, ai_meta_json = ?, knowledge_refs_json = ?, memo = ?, updated_at = ?
    WHERE id = ?
  `),
    deleteTask: db.prepare('DELETE FROM tasks WHERE id = ?')
};

async function getAllTasks() {
    const rows = statements.getAllTasks.all();
    return rows.map(deserializeTask);
}

async function getTaskById(id) {
    return deserializeTask(statements.getTaskById.get(id));
}

async function insertTask(task) {
    const serialized = serializeTask(task);
    statements.insertTask.run(
        serialized.id,
        serialized.title,
        serialized.status,
        serialized.plan_date,
        serialized.project,
        serialized.priority,
        serialized.progress,
        serialized.next_review_date,
        serialized.properties_json,
        serialized.ai_meta_json,
        serialized.knowledge_refs_json,
        serialized.memo,
        serialized.created_at,
        serialized.updated_at
    );

    return getTaskById(task.id);
}

async function updateTask(id, updates) {
    const existingTask = await getTaskById(id);
    if (!existingTask) {
        throw new Error(`Task not found with id: ${id}`);
    }

    const mergedTask = {
        ...existingTask,
        ...updates,
        properties: deepMerge(existingTask.properties || {}, updates.properties || {}),
        ai_meta: deepMerge(existingTask.ai_meta || {}, updates.ai_meta || {}),
        knowledge_refs: deepMerge(existingTask.knowledge_refs || {}, updates.knowledge_refs || {}),
        updated_at: new Date().toISOString()
    };

    const serialized = serializeTask(mergedTask);
    statements.updateTask.run(
        serialized.title,
        serialized.status,
        serialized.plan_date,
        serialized.project,
        serialized.priority,
        serialized.progress,
        serialized.next_review_date,
        serialized.properties_json,
        serialized.ai_meta_json,
        serialized.knowledge_refs_json,
        serialized.memo,
        serialized.updated_at,
        id
    );

    return getTaskById(id);
}

async function deleteTask(id) {
    const existingTask = await getTaskById(id);
    if (!existingTask) {
        throw new Error(`Task not found with id: ${id}`);
    }

    statements.deleteTask.run(id);
    return existingTask;
}

async function getTaskStats() {
    const tasks = await getAllTasks();
    const today = new Date().toISOString().slice(0, 10);

    return tasks.reduce(
        (stats, task) => {
            const status = task.properties?.status;
            const isReviewable = Boolean(task.ai_meta?.review_info?.is_reviewable);
            const nextReviewDate = task.ai_meta?.review_info?.next_review_date;

            stats.total += 1;
            if (status === 'todo') stats.todo += 1;
            if (status === 'in_progress') stats.in_progress += 1;
            if (status === 'done') stats.done += 1;
            if (isReviewable && nextReviewDate && nextReviewDate <= today && status !== 'done') {
                stats.review_due += 1;
            }
            if (!isReviewable && task.properties?.plan_date && task.properties.plan_date < today && status !== 'done') {
                stats.overdue += 1;
            }
            if (status === 'done') {
                stats.pomodoro_done += Number(task.ai_meta?.pomodoro_spent || 0);
            }
            return stats;
        },
        {
            total: 0,
            todo: 0,
            in_progress: 0,
            done: 0,
            review_due: 0,
            overdue: 0,
            pomodoro_done: 0
        }
    );
}

module.exports = {
    db,
    dbPath,
    taskDataDir,
    getAllTasks,
    getTaskById,
    insertTask,
    updateTask,
    deleteTask,
    getTaskStats
};
