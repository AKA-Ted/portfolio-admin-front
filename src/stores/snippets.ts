import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/services/api'
import type {
  GlobalResponse,
  PageResponse,
  SnippetRequest,
  SnippetResponse
} from '@/types/api'

export const useSnippetsStore = defineStore('snippets', () => {
  const snippets = ref<SnippetResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Pagination state
  const currentPage = ref(0)
  const totalPages = ref(0)
  const totalElements = ref(0)
  const pageSize = ref(10)

  async function fetchSnippets(page = 0, size = 10) {
    loading.value = true
    error.value = null

    try {
      const { data: response } = await api.get<GlobalResponse<PageResponse<SnippetResponse>>>(
        '/api/snippet',
        { params: { page, size, sort: 'createdAt,desc' } },
      )
      
      snippets.value = response.data.content.map(snippet => {
        if (snippet.translation && typeof snippet.translation === 'string') {
          try {
            snippet.translation = JSON.parse(snippet.translation)
          } catch (e) {
            console.error('Error parsing translation JSON', e)
          }
        }
        if (snippet.io && typeof snippet.io === 'string') {
            try {
                snippet.io = JSON.parse(snippet.io)
            } catch (e) {
                console.error('Error parsing io JSON', e)
            }
        }
        return snippet
      })
      
      currentPage.value = response.data.number
      totalPages.value = response.data.totalPages
      totalElements.value = response.data.totalElements
      pageSize.value = response.data.size
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al cargar los snippets.'
    } finally {
      loading.value = false
    }
  }

  async function createSnippet(data: SnippetRequest): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const payload = {
        ...data,
        translation: typeof data.translation === 'object' ? JSON.stringify(data.translation) : data.translation,
        io: data.io && typeof data.io === 'object' ? JSON.stringify(data.io) : data.io
      }
      
      await api.post<GlobalResponse<SnippetResponse>>('/api/snippet', payload)
      await fetchSnippets(currentPage.value, pageSize.value)
      return true
    } catch (err: any) {
      if (err.response?.status === 409) {
        error.value = 'Ya existe un snippet con esa URL.'
      } else {
        error.value = err.response?.data?.message || 'Error al crear el snippet.'
      }
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateSnippet(url: string, data: SnippetRequest): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const payload = {
        ...data,
        translation: typeof data.translation === 'object' ? JSON.stringify(data.translation) : data.translation,
        io: data.io && typeof data.io === 'object' ? JSON.stringify(data.io) : data.io
      }

      await api.put<GlobalResponse<SnippetResponse>>(`/api/snippet/${url}`, payload)
      await fetchSnippets(currentPage.value, pageSize.value)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al actualizar el snippet.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function deleteSnippet(url: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      await api.delete(`/api/snippet/${url}`)
      await fetchSnippets(currentPage.value, pageSize.value)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al eliminar el snippet.'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    snippets,
    loading,
    error,
    currentPage,
    totalPages,
    totalElements,
    pageSize,
    fetchSnippets,
    createSnippet,
    updateSnippet,
    deleteSnippet,
  }
})
