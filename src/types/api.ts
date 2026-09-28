// Types matching the Spring Boot backend DTOs

// --- Global ---
export interface GlobalResponse<T> {
  status: number
  message: string
  data: T
}

// --- Auth ---
export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
}

// --- Blog ---
export interface Translation {
  title: string
  summary?: string
  content: string
}

export interface CreatePostRequest {
  url: string
  translation: Record<string, Translation>
  published: boolean
}

export interface PostResponse {
  url: string
  translation: Record<string, Translation>
  published: boolean
  createdAt: string
  updatedAt: string
}

// Spring Boot Pageable response
export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}

// --- Snippets ---
export interface SnippetTranslation {
  description: string
  code: string
}

export interface SnippetIo {
  input_data?: string
  output_data?: string
}

export interface SnippetRequest {
  url: string
  category: string
  command: string
  translation: Record<string, SnippetTranslation>
  visualizer: 'NONE' | 'LIST' | 'TABLE'
  io?: SnippetIo
}

export interface SnippetResponse extends SnippetRequest {
  createdAt?: string
  updatedAt?: string
}
