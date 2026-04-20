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

    deleteTask(id) {
        return api.delete(`/tasks/${id}`)
    },

    getStats() {
        return api.get('/tasks/stats')
    },

    openLocal(filePath) {
        return api.post('/tasks/open-local', { filePath })
    }
}
