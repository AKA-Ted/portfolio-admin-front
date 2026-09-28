import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '@/services/api'
import type {
  GlobalResponse,
  PostResponse,
  CreatePostRequest,
  PageResponse,
} from '@/types/api'

export const usePostsStore = defineStore('posts', () => {
  const posts = ref<PostResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Pagination state
  const currentPage = ref(0)
  const totalPages = ref(0)
  const totalElements = ref(0)
  const pageSize = ref(10)

  async function fetchPosts(page = 0, size = 10) {
    loading.value = true
    error.value = null

    try {
      const { data: response } = await api.get<GlobalResponse<PageResponse<PostResponse>>>(
        '/api/blog',
        { params: { page, size, sort: 'createdAt,desc' } },
      )
      
      posts.value = response.data.content.map(post => {
        if (post.translation && typeof post.translation === 'string') {
          try {
            post.translation = JSON.parse(post.translation)
          } catch (e) {
            console.error('Error parsing translation JSON', e)
          }
        }
        return post
      })
      
      currentPage.value = response.data.number
      totalPages.value = response.data.totalPages
      totalElements.value = response.data.totalElements
      pageSize.value = response.data.size
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al cargar los posts.'
    } finally {
      loading.value = false
    }
  }

  async function createPost(data: CreatePostRequest): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const payload = {
        ...data,
        translation: typeof data.translation === 'object' ? JSON.stringify(data.translation) : data.translation
      }
      
      await api.post<GlobalResponse<PostResponse>>('/api/blog', payload)
      // Refresh the list after creation
      await fetchPosts(currentPage.value, pageSize.value)
      return true
    } catch (err: any) {
      if (err.response?.status === 409) {
        error.value = 'Ya existe un post con esa URL.'
      } else {
        error.value = err.response?.data?.message || 'Error al crear el post.'
      }
      return false
    } finally {
      loading.value = false
    }
  }

  async function updatePost(url: string, data: CreatePostRequest): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const payload = {
        ...data,
        translation: typeof data.translation === 'object' ? JSON.stringify(data.translation) : data.translation
      }

      await api.put<GlobalResponse<PostResponse>>(`/api/blog/${url}`, payload)
      await fetchPosts(currentPage.value, pageSize.value)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al actualizar el post.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function deletePost(url: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      await api.delete(`/api/blog/${url}`)
      await fetchPosts(currentPage.value, pageSize.value)
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Error al eliminar el post.'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    posts,
    loading,
    error,
    currentPage,
    totalPages,
    totalElements,
    pageSize,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
  }
})
