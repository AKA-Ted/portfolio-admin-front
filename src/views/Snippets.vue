<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSnippetsStore } from '@/stores/snippets'
import type { SnippetResponse, SnippetRequest } from '@/types/api'

const router = useRouter()
const authStore = useAuthStore()
const snippetsStore = useSnippetsStore()

// ----- Local UI State -----
const searchQuery = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const isEditing = ref(false)
const editingSnippetUrl = ref<string | null>(null)
const deletingSnippetUrl = ref<string | null>(null)
const formError = ref('')

const activeTab = ref<'es' | 'en'>('es')

// ----- Form State -----
const snippetForm = ref({
  url: '',
  category: '',
  command: '',
  translation: {
    es: { description: '', code: '' },
    en: { description: '', code: '' }
  },
  visualizer: 'NONE' as 'NONE' | 'LIST' | 'TABLE',
  io: {
    input_data: '',
    output_data: ''
  }
})

// ----- Lifecycle -----
onMounted(() => {
  snippetsStore.fetchSnippets()
})

// ----- Computed -----
const filteredSnippets = computed(() => {
  if (!searchQuery.value) return snippetsStore.snippets
  const query = searchQuery.value.toLowerCase()
  return snippetsStore.snippets.filter((snippet) => {
    return (
      snippet.command.toLowerCase().includes(query) ||
      snippet.category.toLowerCase().includes(query)
    )
  })
})

// ----- Helpers -----
function resetForm() {
  snippetForm.value = {
    url: '',
    category: '',
    command: '',
    translation: {
      es: { description: '', code: '' },
      en: { description: '', code: '' }
    },
    visualizer: 'NONE',
    io: {
      input_data: '',
      output_data: ''
    }
  }
  formError.value = ''
  activeTab.value = 'es'
}

function updateSlug() {
  if (!isEditing.value) {
    let base = snippetForm.value.command.trim().toLowerCase()
    base = base.replace(/[^a-z0-9]+/g, '-')
    base = base.replace(/^-+|-+$/g, '')
    snippetForm.value.url = base
  }
}

// ----- Modal Actions -----
function openCreateModal() {
  isEditing.value = false
  editingSnippetUrl.value = null
  resetForm()
  showModal.value = true
}

function openEditModal(snippet: SnippetResponse) {
  isEditing.value = true
  editingSnippetUrl.value = snippet.url

  const es = snippet.translation?.['es'] || { description: '', code: '' }
  const en = snippet.translation?.['en'] || { description: '', code: '' }

  snippetForm.value = {
    url: snippet.url,
    category: snippet.category,
    command: snippet.command,
    translation: {
      es: { description: es.description || '', code: es.code || '' },
      en: { description: en.description || '', code: en.code || '' }
    },
    visualizer: snippet.visualizer || 'NONE',
    io: {
      input_data: snippet.io?.input_data || '',
      output_data: snippet.io?.output_data || ''
    }
  }

  showModal.value = true
  activeTab.value = 'es'
}

function closeModal() {
  showModal.value = false
  resetForm()
  editingSnippetUrl.value = null
}

// ----- CRUD -----
async function saveSnippet() {
  if (!snippetForm.value.command.trim()) {
    formError.value = 'El comando es obligatorio.'
    return
  }
  if (!snippetForm.value.url.trim()) {
    formError.value = 'La URL (slug) es obligatoria.'
    return
  }

  // Validate slug format
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!slugRegex.test(snippetForm.value.url)) {
    formError.value = 'La URL solo puede contener letras minúsculas, números y guiones.'
    return
  }

  formError.value = ''

  const requestData: SnippetRequest = {
    url: snippetForm.value.url,
    category: snippetForm.value.category,
    command: snippetForm.value.command,
    translation: {
      es: snippetForm.value.translation.es,
      en: snippetForm.value.translation.en,
    },
    visualizer: snippetForm.value.visualizer,
  }

  if (snippetForm.value.visualizer !== 'NONE') {
    requestData.io = {
      input_data: snippetForm.value.io.input_data,
      output_data: snippetForm.value.io.output_data
    }
  }

  let success: boolean

  if (isEditing.value && editingSnippetUrl.value) {
    success = await snippetsStore.updateSnippet(editingSnippetUrl.value, requestData)
  } else {
    success = await snippetsStore.createSnippet(requestData)
  }

  if (success) {
    closeModal()
  } else {
    formError.value = snippetsStore.error || 'Error al guardar el snippet.'
  }
}

function confirmDelete(url: string) {
  deletingSnippetUrl.value = url
  showDeleteConfirm.value = true
}

async function executeDelete() {
  if (!deletingSnippetUrl.value) return
  await snippetsStore.deleteSnippet(deletingSnippetUrl.value)
  showDeleteConfirm.value = false
  deletingSnippetUrl.value = null
}

function cancelDelete() {
  showDeleteConfirm.value = false
  deletingSnippetUrl.value = null
}

function handleLogout() {
  authStore.logout()
  router.push({ name: 'login' })
}

// ----- Pagination -----
function goToPage(page: number) {
  snippetsStore.fetchSnippets(page, snippetsStore.pageSize)
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
          <h2 class="text-2xl font-bold text-white">Snippets</h2>
          <p class="mt-1 text-sm text-gray-400">
            Administra los snippets y cheat sheets de tu portafolio.
          </p>
        </div>
        <button
          @click="openCreateModal"
          class="inline-flex items-center gap-2 rounded-lg bg-[#a855f7] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[#131314] cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.4)]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo snippet
        </button>
      </div>

      <!-- API Error Banner -->
      <div
        v-if="snippetsStore.error"
        class="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center justify-between"
      >
        <span>{{ snippetsStore.error }}</span>
        <button
          @click="snippetsStore.error = null"
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
            placeholder="Buscar snippets..."
            class="w-full rounded-lg border border-[#3A3B3D] bg-[#1E1F20] pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="snippetsStore.loading && snippetsStore.snippets.length === 0"
        class="flex flex-col items-center justify-center py-16"
      >
        <svg class="h-8 w-8 animate-spin text-purple-400 mb-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p class="text-gray-400 text-sm">Cargando snippets...</p>
      </div>

      <!-- Table -->
      <div v-else class="rounded-xl border border-[#2A2B2D] bg-[#1E1F20] overflow-hidden">
        <div
          v-if="filteredSnippets.length === 0"
          class="flex flex-col items-center justify-center py-16 px-4 text-center"
        >
          <svg class="h-12 w-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <p class="text-gray-400 text-sm">No se encontraron snippets.</p>
        </div>

        <table v-else class="w-full">
          <thead>
            <tr class="border-b border-[#2A2B2D] text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th class="px-6 py-3">Comando</th>
              <th class="px-6 py-3 hidden sm:table-cell">Categoría</th>
              <th class="px-6 py-3 hidden md:table-cell">Visualizador</th>
              <th class="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2A2B2D]">
            <tr
              v-for="snippet in filteredSnippets"
              :key="snippet.url"
              class="group hover:bg-[#252627] transition-colors"
            >
              <td class="px-6 py-4">
                <div>
                  <p class="text-sm font-mono text-purple-300 font-medium">{{ snippet.command }}</p>
                  <p class="mt-0.5 text-xs text-gray-500 line-clamp-1">
                    {{ snippet.translation?.['es']?.description || snippet.category }}
                  </p>
                </div>
              </td>
              <td class="px-6 py-4 hidden sm:table-cell">
                <span class="inline-flex items-center rounded-md bg-[#252627] px-2 py-1 text-xs font-medium text-gray-300 border border-[#3A3B3D]">
                  {{ snippet.category }}
                </span>
              </td>
              <td class="px-6 py-4 hidden md:table-cell">
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :class="{
                    'bg-gray-500/10 text-gray-400': snippet.visualizer === 'NONE',
                    'bg-blue-500/10 text-blue-400': snippet.visualizer === 'LIST',
                    'bg-green-500/10 text-green-400': snippet.visualizer === 'TABLE'
                  }"
                >
                  {{ snippet.visualizer }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(snippet)"
                    class="rounded-md p-1.5 text-gray-400 hover:text-[#a855f7] hover:bg-[#a855f7]/10 transition-colors cursor-pointer"
                    title="Editar"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click="confirmDelete(snippet.url)"
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
          v-if="snippetsStore.totalPages > 1"
          class="flex items-center justify-between border-t border-[#2A2B2D] px-6 py-3"
        >
          <p class="text-xs text-gray-500">
            {{ snippetsStore.totalElements }} snippet{{ snippetsStore.totalElements !== 1 ? 's' : '' }} en total
          </p>
          <div class="flex items-center gap-1">
            <button
              :disabled="snippetsStore.currentPage === 0"
              @click="goToPage(snippetsStore.currentPage - 1)"
              class="rounded-md px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#252627] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Anterior
            </button>
            <template v-for="page in snippetsStore.totalPages" :key="page">
              <button
                @click="goToPage(page - 1)"
                :class="[
                  'rounded-md px-3 py-1.5 text-xs transition-colors cursor-pointer',
                  snippetsStore.currentPage === page - 1
                    ? 'bg-[#a855f7] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#252627]',
                ]"
              >
                {{ page }}
              </button>
            </template>
            <button
              :disabled="snippetsStore.currentPage >= snippetsStore.totalPages - 1"
              @click="goToPage(snippetsStore.currentPage + 1)"
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
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal" />

          <div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#2A2B2D] bg-[#18181B] p-6 shadow-2xl shadow-black/40">
            <h3 class="text-xl font-bold text-white mb-6 border-b border-[#2A2B2D] pb-3">
              {{ isEditing ? 'Editar Snippet' : 'Nuevo Snippet' }}
            </h3>

            <div
              v-if="formError"
              class="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
            >
              {{ formError }}
            </div>

            <form @submit.prevent="saveSnippet" class="space-y-6">
              
              <!-- SECTION A: Global Meta -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-300 mb-1.5">
                    Comando <span class="text-red-400">*</span>
                  </label>
                  <input
                    v-model="snippetForm.command"
                    @input="updateSlug"
                    type="text"
                    placeholder="Ej: git checkout -b new branch"
                    class="w-full rounded-lg border border-[#3A3B3D] bg-[#09090b] px-4 py-3 text-lg font-mono text-purple-300 placeholder-gray-600 outline-none transition-colors focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1.5">
                    Categoría <span class="text-red-400">*</span>
                  </label>
                  <input
                    v-model="snippetForm.category"
                    type="text"
                    placeholder="Ej: Git, Docker, Spark"
                    class="w-full rounded-lg border border-[#3A3B3D] bg-[#09090b] px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7]"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-1.5">
                    URL (Slug) <span class="text-red-400">*</span>
                  </label>
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-500">/snippets/</span>
                    <input
                      v-model="snippetForm.url"
                      type="text"
                      placeholder="git-checkout"
                      :disabled="isEditing"
                      class="flex-1 rounded-lg border border-[#3A3B3D] bg-[#09090b] px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] font-mono disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <!-- SECTION B: Translations with Tabs -->
              <div class="border border-[#2A2B2D] rounded-xl overflow-hidden bg-[#1E1F20]">
                <div class="flex bg-[#131314] border-b border-[#2A2B2D]">
                  <button
                    type="button"
                    @click="activeTab = 'es'"
                    :class="['px-6 py-3 text-sm font-medium transition-colors border-b-2', activeTab === 'es' ? 'border-[#a855f7] text-[#a855f7] bg-[#1E1F20]' : 'border-transparent text-gray-400 hover:text-white']"
                  >
                    Español
                  </button>
                  <button
                    type="button"
                    @click="activeTab = 'en'"
                    :class="['px-6 py-3 text-sm font-medium transition-colors border-b-2', activeTab === 'en' ? 'border-[#a855f7] text-[#a855f7] bg-[#1E1F20]' : 'border-transparent text-gray-400 hover:text-white']"
                  >
                    English
                  </button>
                </div>
                
                <div class="p-5 space-y-5">
                  <div v-show="activeTab === 'es'" class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-300 mb-1.5">Descripción (ES)</label>
                      <textarea
                        v-model="snippetForm.translation.es.description"
                        rows="2"
                        placeholder="Explicación breve de lo que hace el snippet..."
                        class="w-full rounded-lg border border-[#3A3B3D] bg-[#09090b] px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] resize-none"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-300 mb-1.5">Código Markdown (ES)</label>
                      <textarea
                        v-model="snippetForm.translation.es.code"
                        rows="6"
                        placeholder="Bloques de código con sintaxis Markdown..."
                        class="w-full rounded-lg border border-[#3A3B3D] bg-[#09090b] px-4 py-2.5 text-sm font-mono text-gray-300 placeholder-gray-600 outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] resize-y"
                      />
                    </div>
                  </div>

                  <div v-show="activeTab === 'en'" class="space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-300 mb-1.5">Description (EN)</label>
                      <textarea
                        v-model="snippetForm.translation.en.description"
                        rows="2"
                        placeholder="Brief explanation of what the snippet does..."
                        class="w-full rounded-lg border border-[#3A3B3D] bg-[#09090b] px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] resize-none"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-300 mb-1.5">Markdown Code (EN)</label>
                      <textarea
                        v-model="snippetForm.translation.en.code"
                        rows="6"
                        placeholder="Code blocks with Markdown syntax..."
                        class="w-full rounded-lg border border-[#3A3B3D] bg-[#09090b] px-4 py-2.5 text-sm font-mono text-gray-300 placeholder-gray-600 outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] resize-y"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- SECTION C: Visualizer & IO -->
              <div class="border border-[#2A2B2D] rounded-xl overflow-hidden bg-[#1E1F20] p-5">
                <h4 class="text-sm font-bold text-white mb-4">Visualizador Dinámico (Before / After)</h4>
                
                <div class="mb-5">
                  <label class="block text-sm font-medium text-gray-400 mb-2">Tipo de visualizador:</label>
                  <div class="flex flex-wrap gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" v-model="snippetForm.visualizer" value="NONE" class="text-[#a855f7] focus:ring-[#a855f7] bg-[#09090b] border-[#3A3B3D]" />
                      <span class="text-sm text-gray-300">Ninguno (NONE)</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" v-model="snippetForm.visualizer" value="LIST" class="text-[#a855f7] focus:ring-[#a855f7] bg-[#09090b] border-[#3A3B3D]" />
                      <span class="text-sm text-gray-300">Lista (LIST)</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" v-model="snippetForm.visualizer" value="TABLE" class="text-[#a855f7] focus:ring-[#a855f7] bg-[#09090b] border-[#3A3B3D]" />
                      <span class="text-sm text-gray-300">Tabla (TABLE)</span>
                    </label>
                  </div>
                </div>

                <div v-if="snippetForm.visualizer !== 'NONE'" class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#2A2B2D] pt-5">
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1.5 flex justify-between">
                      Input Data
                      <span class="text-xs text-gray-500 font-normal">(Formato JSON o Listas)</span>
                    </label>
                    <textarea
                      v-model="snippetForm.io.input_data"
                      rows="5"
                      placeholder="Ej: Líneas de texto o JSON..."
                      class="w-full rounded-lg border border-[#3A3B3D] bg-[#09090b] px-4 py-2.5 text-xs font-mono text-gray-400 placeholder-gray-600 outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] resize-y"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-300 mb-1.5 flex justify-between">
                      Output Data
                      <span class="text-xs text-gray-500 font-normal">(Formato JSON o Listas)</span>
                    </label>
                    <textarea
                      v-model="snippetForm.io.output_data"
                      rows="5"
                      placeholder="Ej: Líneas de texto resultantes..."
                      class="w-full rounded-lg border border-[#3A3B3D] bg-[#09090b] px-4 py-2.5 text-xs font-mono text-emerald-400 placeholder-gray-600 outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] resize-y"
                    />
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-3 pt-4 mt-6 border-t border-[#2A2B2D]">
                <button
                  type="button"
                  @click="closeModal"
                  class="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  :disabled="snippetsStore.loading"
                  class="rounded-lg bg-[#a855f7] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                >
                  <span v-if="snippetsStore.loading" class="flex items-center gap-2">
                    <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </span>
                  <span v-else>{{ isEditing ? 'Guardar cambios' : 'Crear snippet' }}</span>
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
            <h3 class="text-lg font-semibold text-white mb-2">¿Eliminar snippet?</h3>
            <p class="text-sm text-gray-400 mb-6">
              Esta acción no se puede deshacer. El snippet será eliminado permanentemente.
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
                :disabled="snippetsStore.loading"
                class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 cursor-pointer"
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
