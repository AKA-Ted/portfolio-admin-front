<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import type { PostResponse, CreatePostRequest, Translation } from '@/types/api'

const router = useRouter()
const authStore = useAuthStore()
const postsStore = usePostsStore()

// ----- Local UI State -----
const searchQuery = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const isEditing = ref(false)
const editingPostUrl = ref<string | null>(null)
const deletingPostUrl = ref<string | null>(null)
const formError = ref('')

// ----- Form State -----
const postForm = ref({
  url: '',
  esTitle: '',
  esSummary: '',
  esContent: '',
  enTitle: '',
  enSummary: '',
  enContent: '',
  published: false,
})

// ----- Lifecycle -----
onMounted(() => {
  postsStore.fetchPosts()
})

// ----- Computed -----
const filteredPosts = computed(() => {
  if (!searchQuery.value) return postsStore.posts
  const query = searchQuery.value.toLowerCase()
  return postsStore.posts.filter((post) => {
    // Search across all translations
    const translations = Object.values(post.translation || {})
    return (
      post.url.toLowerCase().includes(query) ||
      translations.some(
        (t) =>
          t.title?.toLowerCase().includes(query) ||
          t.summary?.toLowerCase().includes(query),
      )
    )
  })
})

// ----- Helpers -----

/** Get the display title for a post, preferring 'es' then first available translation */
function getPostTitle(post: PostResponse): string {
  if (!post.translation) return '(Sin título)'
  const t = post.translation['es'] || Object.values(post.translation)[0]
  return t?.title || '(Sin título)'
}

/** Get the display summary for a post */
function getPostSummary(post: PostResponse): string {
  if (!post.translation) return ''
  const t = post.translation['es'] || Object.values(post.translation)[0]
  return t?.summary || ''
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function resetForm() {
  postForm.value = {
    url: '',
    esTitle: '',
    esSummary: '',
    esContent: '',
    enTitle: '',
    enSummary: '',
    enContent: '',
    published: false,
  }
  formError.value = ''
}

// ----- Modal Actions -----
function openCreateModal() {
  isEditing.value = false
  editingPostUrl.value = null
  resetForm()
  showModal.value = true
}

function openEditModal(post: PostResponse) {
  isEditing.value = true
  editingPostUrl.value = post.url

  const es = post.translation?.['es'] || { title: '', summary: '', content: '' }
  const en = post.translation?.['en'] || { title: '', summary: '', content: '' }

  postForm.value = {
    url: post.url,
    esTitle: es.title || '',
    esSummary: es.summary || '',
    esContent: es.content || '',
    enTitle: en.title || '',
    enSummary: en.summary || '',
    enContent: en.content || '',
    published: post.published,
  }

  showModal.value = true
}

function closeModal() {
  showModal.value = false
  resetForm()
  editingPostUrl.value = null
}

// ----- CRUD -----
async function savePost() {
  if (!postForm.value.esTitle.trim() && !postForm.value.enTitle.trim()) {
    formError.value = 'Debes proporcionar al menos un título (Español o Inglés).'
    return
  }
  if (!postForm.value.url.trim()) {
    formError.value = 'La URL (slug) es obligatoria.'
    return
  }

  // Validate slug format
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!slugRegex.test(postForm.value.url)) {
    formError.value = 'La URL solo puede contener letras minúsculas, números y guiones (ej: mi-primer-post).'
    return
  }

  formError.value = ''

  const requestData: CreatePostRequest = {
    url: postForm.value.url,
    translation: {
      es: {
        title: postForm.value.esTitle,
        summary: postForm.value.esSummary,
        content: postForm.value.esContent,
      },
      en: {
        title: postForm.value.enTitle,
        summary: postForm.value.enSummary,
        content: postForm.value.enContent,
      },
    },
    published: postForm.value.published,
  }

  let success: boolean

  if (isEditing.value && editingPostUrl.value) {
    success = await postsStore.updatePost(editingPostUrl.value, requestData)
  } else {
    success = await postsStore.createPost(requestData)
  }

  if (success) {
    closeModal()
  } else {
    formError.value = postsStore.error || 'Error al guardar el post.'
  }
}

function confirmDelete(url: string) {
  deletingPostUrl.value = url
  showDeleteConfirm.value = true
}

async function executeDelete() {
  if (!deletingPostUrl.value) return
  await postsStore.deletePost(deletingPostUrl.value)
  showDeleteConfirm.value = false
  deletingPostUrl.value = null
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deletingPostUrl.value = null
}

function handleLogout() {
  authStore.logout()
  router.push({ name: 'login' })
}

// ----- Pagination -----
function goToPage(page: number) {
  postsStore.fetchPosts(page, postsStore.pageSize)
}
</script>

<template>
  <div class="min-h-screen">
    <!-- Top Navigation -->
    <nav class="border-b border-[#2A2B2D] bg-[#1E1F20]/80 backdrop-blur-md sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-3">
              <h1 class="text-lg font-bold text-white">
                sandymon<span class="text-purple-400">.dev</span>
              </h1>
              <span class="text-gray-500">|</span>
              <span class="text-sm text-gray-400">Admin</span>
            </div>
            
            <!-- Link to Posts / Snippets -->
            <div class="hidden sm:flex gap-4">
              <router-link to="/posts" class="text-sm text-gray-400 hover:text-white transition-colors" active-class="text-purple-400 font-medium">Posts</router-link>
              <router-link to="/snippets" class="text-sm text-gray-400 hover:text-white transition-colors" active-class="text-purple-400 font-medium">Snippets</router-link>
            </div>
          </div>
          <button
            @click="handleLogout"
            class="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 class="text-2xl font-bold text-white">Posts</h2>
          <p class="mt-1 text-sm text-gray-400">
            Administra los posts de tu portafolio.
          </p>
        </div>
        <button
          @click="openCreateModal"
          class="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#131314] cursor-pointer"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo post
        </button>
      </div>

      <!-- API Error Banner -->
      <div
        v-if="postsStore.error"
        class="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center justify-between"
      >
        <span>{{ postsStore.error }}</span>
        <button
          @click="postsStore.error = null"
          class="text-red-400 hover:text-red-300 cursor-pointer ml-4"
        >
          ✕
        </button>
      </div>

      <!-- Search Bar -->
      <div class="mb-6">
        <div class="relative">
          <svg
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar posts..."
            class="w-full rounded-lg border border-[#3A3B3D] bg-[#1E1F20] pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="postsStore.loading && postsStore.posts.length === 0"
        class="flex flex-col items-center justify-center py-16"
      >
        <svg class="h-8 w-8 animate-spin text-purple-400 mb-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p class="text-gray-400 text-sm">Cargando posts...</p>
      </div>

      <!-- Posts Table -->
      <div v-else class="rounded-xl border border-[#2A2B2D] bg-[#1E1F20] overflow-hidden">
        <!-- Empty State -->
        <div
          v-if="filteredPosts.length === 0"
          class="flex flex-col items-center justify-center py-16 px-4 text-center"
        >
          <svg class="h-12 w-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p class="text-gray-400 text-sm">No se encontraron posts.</p>
          <button
            @click="openCreateModal"
            class="mt-4 text-sm text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
          >
            Crear el primer post
          </button>
        </div>

        <!-- Table -->
        <table v-else class="w-full">
          <thead>
            <tr class="border-b border-[#2A2B2D] text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="px-6 py-3">Título</th>
              <th class="px-6 py-3 hidden lg:table-cell">URL</th>
              <th class="px-6 py-3 hidden sm:table-cell">Estado</th>
              <th class="px-6 py-3 hidden md:table-cell">Fecha</th>
              <th class="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2A2B2D]">
            <tr
              v-for="post in filteredPosts"
              :key="post.url"
              class="group hover:bg-[#252627] transition-colors"
            >
              <td class="px-6 py-4">
                <div>
                  <p class="text-sm font-medium text-white">{{ getPostTitle(post) }}</p>
                  <p class="mt-0.5 text-xs text-gray-500 line-clamp-1">{{ getPostSummary(post) }}</p>
                </div>
              </td>
              <td class="px-6 py-4 hidden lg:table-cell">
                <span class="text-xs text-gray-500 font-mono bg-[#131314] rounded px-2 py-1">
                  /{{ post.url }}
                </span>
              </td>
              <td class="px-6 py-4 hidden sm:table-cell">
                <span
                  :class="[
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    post.published
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-400',
                  ]"
                >
                  {{ post.published ? 'Publicado' : 'Borrador' }}
                </span>
              </td>
              <td class="px-6 py-4 hidden md:table-cell">
                <span class="text-sm text-gray-400">{{ formatDate(post.createdAt) }}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(post)"
                    class="rounded-md p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                    title="Editar"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click="confirmDelete(post.url)"
                    class="rounded-md p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Eliminar"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div
          v-if="postsStore.totalPages > 1"
          class="flex items-center justify-between border-t border-[#2A2B2D] px-6 py-3"
        >
          <p class="text-xs text-gray-500">
            {{ postsStore.totalElements }} post{{ postsStore.totalElements !== 1 ? 's' : '' }} en total
          </p>
          <div class="flex items-center gap-1">
            <button
              :disabled="postsStore.currentPage === 0"
              @click="goToPage(postsStore.currentPage - 1)"
              class="rounded-md px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#252627] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Anterior
            </button>
            <template v-for="page in postsStore.totalPages" :key="page">
              <button
                @click="goToPage(page - 1)"
                :class="[
                  'rounded-md px-3 py-1.5 text-xs transition-colors cursor-pointer',
                  postsStore.currentPage === page - 1
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#252627]',
                ]"
              >
                {{ page }}
              </button>
            </template>
            <button
              :disabled="postsStore.currentPage >= postsStore.totalPages - 1"
              @click="goToPage(postsStore.currentPage + 1)"
              class="rounded-md px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#252627] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal" />

          <!-- Modal Content -->
          <div class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2A2B2D] bg-[#1E1F20] p-6 shadow-2xl shadow-black/40">
            <h3 class="text-lg font-semibold text-white mb-6">
              {{ isEditing ? 'Editar post' : 'Nuevo post' }}
            </h3>

            <!-- Form Error -->
            <div
              v-if="formError"
              class="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
            >
              {{ formError }}
            </div>

            <form @submit.prevent="savePost" class="space-y-5">
              <!-- URL Slug -->
              <div>
                <label for="post-url" class="block text-sm font-medium text-gray-300 mb-1.5">
                  URL (slug)
                </label>
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500">/blog/</span>
                  <input
                    id="post-url"
                    v-model="postForm.url"
                    type="text"
                    placeholder="mi-primer-post"
                    :disabled="isEditing"
                    class="flex-1 rounded-lg border border-[#3A3B3D] bg-[#131314] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono disabled:opacity-50"
                  />
                </div>
                <p class="mt-1 text-xs text-gray-500">Solo letras minúsculas, números y guiones.</p>
              </div>

              <!-- Tabs or side-by-side could go here, but for simplicity we stack them -->
              <div class="space-y-4 border-l-2 border-purple-500 pl-4">
                <h4 class="text-sm font-semibold text-purple-400 uppercase tracking-wider">Español</h4>
                <!-- ES Title -->
                <div>
                  <label for="post-es-title" class="block text-sm font-medium text-gray-300 mb-1.5">Título</label>
                  <input
                    id="post-es-title"
                    v-model="postForm.esTitle"
                    type="text"
                    placeholder="Título en español"
                    class="w-full rounded-lg border border-[#3A3B3D] bg-[#131314] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <!-- ES Summary -->
                <div>
                  <label for="post-es-summary" class="block text-sm font-medium text-gray-300 mb-1.5">Resumen</label>
                  <textarea
                    id="post-es-summary"
                    v-model="postForm.esSummary"
                    rows="2"
                    placeholder="Breve descripción..."
                    class="w-full rounded-lg border border-[#3A3B3D] bg-[#131314] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none"
                  />
                </div>

                <!-- ES Content -->
                <div>
                  <label for="post-es-content" class="block text-sm font-medium text-gray-300 mb-1.5">Contenido</label>
                  <textarea
                    id="post-es-content"
                    v-model="postForm.esContent"
                    rows="5"
                    placeholder="Escribe el contenido en español..."
                    class="w-full rounded-lg border border-[#3A3B3D] bg-[#131314] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-y font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>

              <div class="space-y-4 border-l-2 border-blue-500 pl-4 mt-6">
                <h4 class="text-sm font-semibold text-blue-400 uppercase tracking-wider">English</h4>
                <!-- EN Title -->
                <div>
                  <label for="post-en-title" class="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
                  <input
                    id="post-en-title"
                    v-model="postForm.enTitle"
                    type="text"
                    placeholder="English title"
                    class="w-full rounded-lg border border-[#3A3B3D] bg-[#131314] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <!-- EN Summary -->
                <div>
                  <label for="post-en-summary" class="block text-sm font-medium text-gray-300 mb-1.5">Summary</label>
                  <textarea
                    id="post-en-summary"
                    v-model="postForm.enSummary"
                    rows="2"
                    placeholder="Short description..."
                    class="w-full rounded-lg border border-[#3A3B3D] bg-[#131314] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>

                <!-- EN Content -->
                <div>
                  <label for="post-en-content" class="block text-sm font-medium text-gray-300 mb-1.5">Content</label>
                  <textarea
                    id="post-en-content"
                    v-model="postForm.enContent"
                    rows="5"
                    placeholder="Write the English content..."
                    class="w-full rounded-lg border border-[#3A3B3D] bg-[#131314] px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>

              <!-- Published Toggle -->
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  @click="postForm.published = !postForm.published"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer',
                    postForm.published ? 'bg-purple-600' : 'bg-[#3A3B3D]',
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      postForm.published ? 'translate-x-6' : 'translate-x-1',
                    ]"
                  />
                </button>
                <label class="text-sm text-gray-300 cursor-pointer" @click="postForm.published = !postForm.published">
                  {{ postForm.published ? 'Publicado' : 'Borrador' }}
                </label>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  @click="closeModal"
                  class="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="postsStore.loading"
                  class="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#1E1F20] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span v-if="postsStore.loading" class="flex items-center gap-2">
                    <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </span>
                  <span v-else>{{ isEditing ? 'Guardar cambios' : 'Crear post' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDeleteConfirm"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="cancelDelete" />
          <div class="relative w-full max-w-sm rounded-2xl border border-[#2A2B2D] bg-[#1E1F20] p-6 shadow-2xl shadow-black/40">
            <h3 class="text-lg font-semibold text-white mb-2">¿Eliminar post?</h3>
            <p class="text-sm text-gray-400 mb-6">
              Esta acción no se puede deshacer. El post será eliminado permanentemente.
            </p>
            <div class="flex items-center justify-end gap-3">
              <button
                @click="cancelDelete"
                class="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                @click="executeDelete"
                :disabled="postsStore.loading"
                class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#1E1F20] disabled:opacity-50 cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
