import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/components/layout/AppLayout.vue'),
    children: [
      { path: '', redirect: '/task-manager/today' },
      {
        path: 'task-manager',
        component: () => import('@/views/TaskManager/index.vue'),
        children: [
          { path: '', redirect: '/task-manager/today' },
          { path: 'today', name: 'TodayBoard', component: () => import('@/views/TaskManager/TodayBoard.vue'), meta: { title: '今日无垠', taskView: 'today' } },
          { path: 'planning', name: 'PlanningCenter', component: () => import('@/views/TaskManager/PlanningCenter.vue'), meta: { title: '目标排期', taskView: 'planning' } },
          { path: 'review', name: 'ReviewRitual', component: () => import('@/views/TaskManager/ReviewRitual.vue'), meta: { title: '复习仪式', taskView: 'review' } }
        ]
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.afterEach(to => {
  document.title = `${to.meta.title || 'TaskOrbit'} - TaskOrbit`
})

export default router
