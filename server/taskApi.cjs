const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const taskDb = require('./taskDb.cjs');

const router = express.Router();

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

router.get('/', async (req, res) => {
    try {
        const tasks = await taskDb.getAllTasks();
        res.json({
            success: true,
            data: tasks,
            message: 'Tasks retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const stats = await taskDb.getTaskStats();
        res.json({
            success: true,
            data: stats,
            message: 'Task stats retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching task stats:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const task = await taskDb.getTaskById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        res.json({
            success: true,
            data: task,
            message: 'Task retrieved successfully'
        });
    } catch (error) {
        console.error(`Error fetching task ${req.params.id}:`, error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/', async (req, res) => {
    try {
        const taskData = req.body;
        if (!taskData || !taskData.id || !taskData.title) {
            return res.status(400).json({ success: false, message: 'Missing required task fields (id, title)' });
        }

        const createdTask = await taskDb.insertTask(taskData);
        res.status(201).json({
            success: true,
            data: createdTask,
            message: 'Task created successfully'
        });
    } catch (error) {
        console.error('Error creating task:', error);
        if (String(error.message || '').includes('UNIQUE')) {
            return res.status(409).json({ success: false, message: 'Task id already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const updatedTask = await taskDb.updateTask(req.params.id, req.body || {});
        res.json({
            success: true,
            data: updatedTask,
            message: 'Task updated successfully'
        });
    } catch (error) {
        console.error(`Error updating task ${req.params.id}:`, error);
        if (String(error.message || '').includes('Task not found')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deletedTask = await taskDb.deleteTask(req.params.id);
        res.json({
            success: true,
            data: deletedTask,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        console.error(`Error deleting task ${req.params.id}:`, error);
        if (String(error.message || '').includes('Task not found')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/open-local', async (req, res) => {
    try {
        const localPath = normalizeLocalFilePath(req.body?.filePath);
        const escapedPath = localPath.replace(/"/g, '\\"');
        const command = `start "" "${escapedPath}"`;

        exec(command, error => {
            if (error) {
                console.error('打开本地文件失败:', error);
                return res.status(500).json({ success: false, message: `打开文件失败: ${error.message}` });
            }

            res.json({
                success: true,
                data: { path: localPath },
                message: '文件打开指令已发送'
            });
        });
    } catch (error) {
        console.error('Error opening local file:', error);
        res.status(400).json({ success: false, message: error.message || 'Invalid file path' });
    }
});

module.exports = router;
