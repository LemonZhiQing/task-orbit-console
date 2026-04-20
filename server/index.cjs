const fs = require('fs');
const path = require('path');

function loadEnvFile() {
    const envPath = path.resolve(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        return;
    }

    const content = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) continue;

        const key = line.slice(0, separatorIndex).trim();
        if (!key || process.env[key] !== undefined) continue;

        let value = line.slice(separatorIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        process.env[key] = value;
    }
}

loadEnvFile();

const express = require('express');
const taskApi = require('./taskApi.cjs');
const { taskDataDir, dbPath } = require('./taskDb.cjs');

const app = express();
const port = Number(process.env.TASK_SERVER_PORT || 6105);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'ok',
            taskDataDir,
            dbPath,
            port
        }
    });
});

app.use('/api/tasks', taskApi);

app.use((req, res) => {
    res.status(404).json({ success: false, message: `Not Found: ${req.method} ${req.originalUrl}` });
});

app.use((error, req, res, next) => {
    console.error('Unhandled server error:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
});

app.listen(port, () => {
    console.log(`[task-server] listening on http://127.0.0.1:${port}`);
    console.log(`[task-server] data dir: ${taskDataDir}`);
    console.log(`[task-server] db path: ${dbPath}`);
});
