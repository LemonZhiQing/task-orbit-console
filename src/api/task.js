import api from './index'

export const taskApi = {
    getTasks(params = {}) {
        return api.get('/tasks', { params })
    },

    getTaskById(id, params = {}) {
        return api.get(`/tasks/${id}`, { params })
    },

    createTask(data) {
        return api.post('/tasks', data)
    },

    upsertTask(data) {
        return api.post('/tasks/upsert', data)
    },

    updateTask(id, data) {
        return api.patch(`/tasks/${id}`, data)
    },

    restoreTask(id) {
        return api.patch(`/tasks/${id}/restore`)
    },

    batchUpdateTasks(tasks) {
        return api.post('/tasks/batch', { tasks })
    },

    deleteTask(id, hard = false) {
        return api.delete(`/tasks/${id}`, { params: { hard } })
    },

    getStats() {
        return api.get('/tasks/stats')
    },

    createBackup(reason = 'frontend') {
        return api.post('/tasks/backup', { reason })
    },

    openLocal(filePath) {
        return api.post('/tasks/open-local', { filePath })
    },

    getParentCandidates(period) {
        return api.get('/tasks/parent-candidates', { params: { period } })
    }
}
