import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { getActivePinia, setActivePinia } from 'pinia'
import pinia, { useAuthStore } from '@/store'

const routes: RouteRecordRaw[] = [
  //暂时关闭登录验证
  // {
  //   path: '/login',
  //   name: 'login',
  //   component: () => import('@/views/LoginView.vue'),
  //   meta: { public: true }
  // },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/dashboard/DashboardView.vue')
  },
  {
    path: '/devices',
    name: 'devices',
    component: () => import('@/views/device/DevicesView.vue')
  },
  {
    path: '/people',
    name: 'people',
    component: () => import('@/views/people/PeopleView.vue')
  },
  {
    path: '/mappings',
    name: 'mappings',
    component: () => import('@/views/mapping/MappingsView.vue')
  },
  {
    path: '/realtime',
    redirect: '/realtime/breath-heart'
  },
  {
    path: '/realtime/breath-heart',
    name: 'realtimeBreathHeart',
    component: () => import('@/views/realtime/BreathAndHeart.vue')
  },
  {
    path: '/realtime/posture',
    name: 'realtimePosture',
    component: () => import('@/views/realtime/Posture.vue')
  },
  {
    path: '/history',
    redirect: '/history/breath-heart'
  },
  {
    path: '/history/breath-heart',
    name: 'historyBreathHeart',
    component: () => import('@/views/history/BreathAndHeart.vue')
  },
  {
    path: '/history/posture',
    name: 'historyPosture',
    component: () => import('@/views/history/Posture.vue')
  },
  {
    path: '/alerts',
    name: 'alerts',
    component: () => import('@/views/alert/AlertsView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

//暂时关闭登录验证
// router.beforeEach((to, _from, next) => {
//   if (!getActivePinia()) {
//     setActivePinia(pinia)
//   }

//   const authStore = useAuthStore()

//   if (!authStore.isAuthenticated && !to.meta.public) {
//     next({ name: 'login', query: { redirect: to.fullPath } })
//     return
//   }

//   if (authStore.isAuthenticated && to.name === 'login') {
//     next({ name: 'dashboard' })
//     return
//   }

//   next()
// })

export default router
