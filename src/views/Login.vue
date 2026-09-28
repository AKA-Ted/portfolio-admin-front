<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')

async function handleLogin() {
  if (!username.value || !password.value) {
    authStore.error = 'Por favor, completa todos los campos.'
    return
  }

  const success = await authStore.login({
    username: username.value,
    password: password.value,
  })

  if (success) {
    router.push({ name: 'posts' })
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Logo / Branding -->
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold tracking-tight text-white">
          sandymon<span class="text-purple-400">.dev</span>
        </h1>
        <p class="mt-2 text-sm text-gray-400">Panel de administración</p>
      </div>

      <!-- Login Card -->
      <div class="bg-[#1E1F20] rounded-2xl border border-[#2A2B2D] p-8 shadow-xl shadow-black/20">
        <h2 class="text-xl font-semibold text-white mb-6">Iniciar sesión</h2>

        <!-- Error Message -->
        <div
          v-if="authStore.error"
          class="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
        >
          {{ authStore.error }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Username -->
          <div>
            <label for="username" class="block text-sm font-medium text-gray-300 mb-1.5">
              Usuario
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="Tu usuario"
              class="w-full rounded-lg border border-[#3A3B3D] bg-[#131314] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-300 mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              class="w-full rounded-lg border border-[#3A3B3D] bg-[#131314] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="authStore.loading"
            class="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#1E1F20] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span v-if="!authStore.loading">Iniciar sesión</span>
            <span v-else class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Ingresando...
            </span>
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="mt-8 text-center text-xs text-gray-500">
        &copy; {{ new Date().getFullYear() }} sandymon.dev — Admin Panel
      </p>
    </div>
  </div>
</template>
