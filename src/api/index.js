import axios from 'axios'
import { ElMessage } from 'element-plus'

// ==================== 全局 Loading 控制 ====================
let loadingCount = 0

function startLoading() {
  if (loadingCount === 0) {
    // 可以在这里触发全局顶部的进度条（如 NProgress）
  }
  loadingCount++
}

function stopLoading() {
  if (loadingCount <= 0) return
  loadingCount--
  if (loadingCount === 0) {
    // 可以在这里结束全局进度条
  }
}

// ==================== Axios 实例配置 ====================
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/admin_api',
  timeout: 10000,
  // ★ 极其重要：原版利用 Cookie(admin_auth) 进行鉴权，必须开启此选项让浏览器自动携带 Cookie ★
  withCredentials: true
})

// ==================== 拦截器 ====================
// 请求拦截器
api.interceptors.request.use(
  config => {
    // 取消之前错误的 localStorage token 注入，现在全权交给浏览器 Cookie 处理
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

// 响应拦截器
api.interceptors.response.use(
  response => {
    stopLoading()
    const res = response.data
    // 拦截 VCP 后端标准错误格式 (带有 success: false)
    if (res && res.success === false) {
      ElMessage.error(res.message || '操作失败')
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res
  },
  error => {
    stopLoading()

    // 401 未授权处理：当前前端已取消登录页跳转，直接抛出错误
    if (error.response?.status === 401) {
      return Promise.reject(error)
    }

    // 其他错误 → 弹窗提示
    const msg = error.response?.data?.message || error.response?.data?.error || error.message || '请求失败'

    if (!error.config.url.includes('/check-auth')) {
      ElMessage.error({ message: `操作失败: ${msg}`, duration: 4000 })
    }

    return Promise.reject(error)
  }
)

export default api