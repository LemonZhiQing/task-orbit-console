import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      { path: '', redirect: '/task-manager' },
      { path: 'task-manager', name: 'TaskManager', component: () => import('@/views/TaskManager/index.vue'), meta: { title: '任务管理', icon: 'Finished' } }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 已取消前端登录鉴权，直接放行所有路由
router.beforeEach((to, from, next) => {
  next()
})

// 全局后置守卫 - 更新页面标题
router.afterEach((to) => {
  document.title = `${to.meta.title || 'TaskOrbit'} - TaskOrbit 任务中枢`
})

export default router
