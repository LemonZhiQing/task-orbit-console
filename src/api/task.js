import api from './index'

export const taskApi = {
    // 获取所有任务
    getTasks() {
        // 注意：由于我们在 server.js 中挂载的是 /api/tasks，
        // 而当前前端 axios 的 baseURL 是 /admin_api，
        // 这里需要覆盖使用绝对路径或者将后端的 task 路由也挂载到 /admin_api 下。
        // 根据要求 4: app.use('/api/tasks', taskApiRoutes)
        return api.get('/api/tasks', { baseURL: '' })
    },

    // 获取单个任务
    getTaskById(id) {
        return api.get(`/api/tasks/${id}`, { baseURL: '' })
    },

    // 创建任务
    createTask(data) {
        return api.post('/api/tasks', data, { baseURL: '' })
    },

    // 更新任务
    updateTask(id, data) {
        return api.patch(`/api/tasks/${id}`, data, { baseURL: '' })
    }
}
