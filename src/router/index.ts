import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/Login.vue'
import PostsView from '@/views/Posts.vue'
import SnippetsView from '@/views/Snippets.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/posts',
      name: 'posts',
      component: PostsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/snippets',
      name: 'snippets',
      component: SnippetsView,
      meta: { requiresAuth: true },
    },
  ],
})

// Navigation guard
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('auth_token')

  if (to.meta.requiresAuth && !token) {
    // Trying to access a protected route without auth → go to login
    next({ name: 'login' })
  } else if (to.name === 'login' && token) {
    // Already authenticated → go to posts
    next({ name: 'posts' })
  } else {
    next()
  }
})

export default router
