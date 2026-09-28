import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import type { GlobalResponse, AuthResponse, LoginRequest } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const error = ref<string | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  async function login(credentials: LoginRequest): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { data: response } = await api.post<GlobalResponse<AuthResponse>>(
        '/api/auth/login',
        credentials,
      )
      token.value = response.data.token
      localStorage.setItem('auth_token', response.data.token)
      return true
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        error.value = 'Credenciales inválidas. Intenta de nuevo.'
      } else if (err.response?.data?.message) {
        error.value = err.response.data.message
      } else {
        error.value = 'Error de conexión. Verifica que el servidor esté activo.'
      }
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    localStorage.removeItem('auth_token')
  }

  return { token, error, loading, isAuthenticated, login, logout }
})
