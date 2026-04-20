import axios from 'axios'
import { ElMessage } from 'element-plus'

let loadingCount = 0

function startLoading() {
  if (loadingCount === 0) {
    // 预留全局 loading 钩子
  }
  loadingCount++
}

function stopLoading() {
  if (loadingCount <= 0) return
  loadingCount--
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  withCredentials: true
})

api.interceptors.request.use(
  config => {
    if (config.showLoading !== false) {
      startLoading()
    }
    return config
  },
  error => {
    stopLoading()
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  response => {
    stopLoading()
    const res = response.data
    if (res && res.success === false) {
      ElMessage.error(res.message || '操作失败')
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res
  },
  error => {
    stopLoading()

    if (error.response?.status === 401) {
      return Promise.reject(error)
    }

    const msg = error.response?.data?.message || error.response?.data?.error || error.message || '请求失败'
    const url = error.config?.url || ''

    if (!url.includes('/check-auth')) {
      ElMessage.error({ message: `操作失败: ${msg}`, duration: 4000 })
    }

    return Promise.reject(error)
  }
)

export default api
