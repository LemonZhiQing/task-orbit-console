import api from './index'

export const taskApi = {
    getTasks() {
        return api.get('/tasks')
    },

    getTaskById(id) {
        return api.get(`/tasks/${id}`)
    },

    createTask(data) {
        return api.post('/tasks', data)
    },

    updateTask(id, data) {
        return api.patch(`/tasks/${id}`, data)
    },

    batchUpdateTasks(tasks) {
        return api.post('/tasks/batch', { tasks })
    },

    deleteTask(id) {
        return api.delete(`/tasks/${id}`)
    },

    getStats() {
        return api.get('/tasks/stats')
    },

    openLocal(filePath) {
        return api.post('/tasks/open-local', { filePath })
    },
    
    // V4.0 新增：获取活期父级项目候选人
    getParentCandidates(period) {
        return api.get(`/tasks/parent-candidates?period=${period}`)
    }
}