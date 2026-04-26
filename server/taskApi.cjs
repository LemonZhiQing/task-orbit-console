const express = require('express');
const path = require('path');
const { execFile } = require('child_process');
const taskDb = require('./taskDb.cjs');

const router = express.Router();

const VALID_PERIODS = new Set(['daily', 'short_term', 'long_term', 'routine']);
const VALID_COLUMNS = new Set(['todo', 'in_progress', 'done']);
const VALID_PRIORITIES = new Set(['p0', 'p1', 'p2', 'p3']);

function normalizeLocalFilePath(filePath) {
    let normalizedPath = String(filePath || '').trim();
    if (!normalizedPath) {
        throw new Error('Missing filePath');
    }

    if (normalizedPath.startsWith('file:///')) {
        normalizedPath = normalizedPath.slice(8);
    } else if (normalizedPath.startsWith('file://')) {
        normalizedPath = normalizedPath.slice(7);
    }

    normalizedPath = decodeURIComponent(normalizedPath);

    if (/^[a-zA-Z]:\//.test(normalizedPath)) {
        normalizedPath = normalizedPath.replace(/\//g, '\\');
    }

    if (!path.isAbsolute(normalizedPath) && !/^\\\\/.test(normalizedPath)) {
        throw new Error('filePath must be an absolute local path');
    }

    return path.normalize(normalizedPath);
}

function getAllowedOpenDirs() {
    return String(process.env.TASK_ALLOWED_OPEN_DIRS || taskDb.taskDataDir)
        .split(';')
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => path.resolve(item));
}

function ensureLocalFileAllowed(localPath) {
    if (process.env.TASK_ENABLE_OPEN_LOCAL === 'false') {
        throw new Error('Opening local files is disabled');
    }

    const normalized = path.resolve(localPath);
    const allowedDirs = getAllowedOpenDirs();
    const isAllowed = allowedDirs.some(dir => normalized === dir || normalized.startsWith(dir + path.sep));
    if (!isAllowed) {
        throw new Error('filePath is outside allowed directories');
    }
}

function validateTaskPayload(payload, { partial = false } = {}) {
    const task = payload && typeof payload === 'object' ? payload : {};
    if (!partial) {
        if (!task.id || typeof task.id !== 'string') {
            throw new Error('Task id is required');
        }
        if (!task.title || typeof task.title !== 'string') {
            throw new Error('Task title is required');
        }
    }

    if (task.period !== undefined && !VALID_PERIODS.has(task.period)) {
        throw new Error('Invalid task period');
    }
    if (task.kanban_col !== undefined && !VALID_COLUMNS.has(task.kanban_col)) {
        throw new Error('Invalid kanban column');
    }
    if (task.priority !== undefined && !VALID_PRIORITIES.has(task.priority)) {
        throw new Error('Invalid task priority');
    }

    for (const field of ['planned_pomodoros', 'actual_pomodoros', 'planned_amount', 'completed_amount', 'sort_order']) {
        if (task[field] !== undefined && task[field] !== null) {
            const value = Number(task[field]);
            if (!Number.isFinite(value) || value < 0) {
                throw new Error(`Invalid numeric field: ${field}`);
            }
        }
    }

    return task;
}

router.get('/', async (req, res) => {
    try {
        const tasks = await taskDb.getAllTasks({ includeDeleted: req.query.includeDeleted === 'true' });
        res.json({ success: true, data: tasks, message: 'Tasks retrieved successfully' });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const stats = await taskDb.getTaskStats();
        res.json({ success: true, data: stats, message: 'Task stats retrieved successfully' });
    } catch (error) {
        console.error('Error fetching task stats:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.get('/parent-candidates', async (req, res) => {
    try {
        const period = req.query.period;
        if (!period) {
            return res.status(400).json({ success: false, message: 'Missing query parameter: period' });
        }
        const candidates = await taskDb.getParentCandidates(period);
        res.json({ success: true, data: candidates, message: 'Parent candidates retrieved successfully' });
    } catch (error) {
        console.error('Error fetching parent candidates:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/backup', async (req, res) => {
    try {
        const backupPath = taskDb.createDatabaseBackup(req.body?.reason || 'api');
        res.json({ success: true, data: { backupPath }, message: 'Database backup created successfully' });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ success: false, message: 'Failed to create database backup' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const task = await taskDb.getTaskById(req.params.id, { includeDeleted: req.query.includeDeleted === 'true' });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        res.json({ success: true, data: task, message: 'Task retrieved successfully' });
    } catch (error) {
        console.error(`Error fetching task ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const taskData = validateTaskPayload(req.body);
        const createdTask = await taskDb.insertTask(taskData);
        res.status(201).json({ success: true, data: createdTask, message: 'Task created successfully' });
    } catch (error) {
        console.error('Error creating task:', error);
        if (String(error.message || '').includes('UNIQUE')) {
            return res.status(409).json({ success: false, message: 'Task id already exists' });
        }
        res.status(400).json({ success: false, message: error.message || 'Invalid task payload' });
    }
});

router.post('/batch', async (req, res) => {
    try {
        const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
        tasks.forEach(task => validateTaskPayload(task));
        const savedTasks = await taskDb.replaceAllTasks(tasks);
        res.json({ success: true, data: savedTasks, message: 'Tasks synced successfully' });
    } catch (error) {
        console.error('Error syncing tasks:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/upsert', async (req, res) => {
    try {
        const taskData = validateTaskPayload(req.body);
        const savedTask = await taskDb.upsertTask(taskData);
        res.json({ success: true, data: savedTask, message: 'Task upserted successfully' });
    } catch (error) {
        console.error('Error upserting task:', error);
        res.status(400).json({ success: false, message: error.message || 'Invalid task payload' });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const updates = validateTaskPayload(req.body || {}, { partial: true });
        const updatedTask = await taskDb.updateTask(req.params.id, updates);
        res.json({ success: true, data: updatedTask, message: 'Task updated successfully' });
    } catch (error) {
        console.error(`Error updating task ${req.params.id}:`, error);
        if (String(error.message || '').includes('Task not found')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(400).json({ success: false, message: error.message || 'Invalid task payload' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedTask = await taskDb.deleteTask(req.params.id, { hard: req.query.hard === 'true' });
        res.json({ success: true, data: deletedTask, message: 'Task deleted successfully' });
    } catch (error) {
        console.error(`Error deleting task ${req.params.id}:`, error);
        if (String(error.message || '').includes('Task not found')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.patch('/:id/restore', async (req, res) => {
    try {
        const restoredTask = await taskDb.restoreTask(req.params.id);
        res.json({ success: true, data: restoredTask, message: 'Task restored successfully' });
    } catch (error) {
        console.error(`Error restoring task ${req.params.id}:`, error);
        if (String(error.message || '').includes('Task not found')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/open-local', async (req, res) => {
    try {
        const localPath = normalizeLocalFilePath(req.body?.filePath);
        ensureLocalFileAllowed(localPath);

        execFile('cmd.exe', ['/c', 'start', '', localPath], { windowsHide: true }, error => {
            if (error) {
                console.error('打开本地文件失败:', error);
                return res.status(500).json({ success: false, message: `打开文件失败: ${error.message}` });
            }

            res.json({ success: true, data: { path: localPath }, message: '文件打开指令已发送' });
        });
    } catch (error) {
        console.error('Error opening local file:', error);
        res.status(400).json({ success: false, message: error.message || 'Invalid file path' });
    }
});

module.exports = router;
