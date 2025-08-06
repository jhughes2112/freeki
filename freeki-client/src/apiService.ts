import apiClient from './apiClient'
import type { WikiPage } from './globalState'
import type { UserInfo } from './useUserSettings'
import type { AdminSettings } from './adminSettings'

// Type definitions for API requests - MUST match server expectations exactly
export interface PageCreateRequest {
  title: string          // Required - no optional fields
  content: string        // Required - sent as raw text, not JSON
  filepath: string       // Required - sent as URL parameter
  tags: string[]         // Required - sent as comma-separated URL parameter
}

export interface PageUpdateRequest {
  title: string          // Required - all fields must be provided
  content: string        // Required - sent as raw text, not JSON  
  filepath: string       // Required - sent as URL parameter
  tags: string[]         // Required - sent as comma-separated URL parameter
}

// Fixed: Server returns PageMetadata for history, not Git commit info
export interface PageHistoryItem {
  pageId: string
  tags: string[]
  title: string
  lastModified: number   // Unix timestamp from server
  version: number        // Server uses long but can be treated as number in TS
  path: string
}

export interface MediaFile {
  filepath: string
  size: number
  contentType: string
  lastModified?: string  // Made optional since server doesn't always provide it
}

export interface SearchResult {
  id: string
  title: string
  path: string
  excerpt: string        // Required - no optional fields
  score: number          // Server uses int, but compatible with number
}

// High-level API service that wraps the low-level apiClient
class ApiService {
  // Cache management utilities
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  private getCacheKey(method: string, url: string, params?: any): string {
    return `${method}:${url}:${params ? JSON.stringify(params) : ''}`
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T
    }
    this.cache.delete(key)
    return null
  }

  private setCached(key: string, data: any, ttlMs: number = 300000): void { // 5 minute default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  // Pages API
  async getPages(query?: string, includeContent?: boolean): Promise<WikiPage[]> {
    const url = query 
      ? `/api/pages?q=${encodeURIComponent(query)}&content=${includeContent ? '1' : '0'}`
      : '/api/pages'
    
    const response = await apiClient.get<WikiPage[]>(url)
    return response.success ? response.data || [] : []
  }

  async getPage(pageId: string): Promise<WikiPage | null> {
    const response = await apiClient.get<WikiPage>(`/api/pages/${pageId}`)
    return response.success ? response.data || null : null
  }

  async createPage(page: PageCreateRequest): Promise<WikiPage | null> {
    // Server expects: POST /api/pages?title=X&tags=Y&filepath=Z with content as raw text body
    const params = new URLSearchParams()
    params.set('title', page.title)
    params.set('tags', page.tags.join(','))
    params.set('filepath', page.filepath)
    
    const url = `/api/pages?${params.toString()}`
    const response = await apiClient.post<WikiPage>(url, page.content, {
      headers: { 'Content-Type': 'text/plain' }
    })
    return response.success ? response.data || null : null
  }

  async updatePage(pageId: string, updates: PageUpdateRequest): Promise<WikiPage | null> {
    // Server expects: PUT /api/pages/{id}?title=X&tags=Y&filepath=Z with content as raw text body
    const params = new URLSearchParams()
    params.set('title', updates.title)
    params.set('tags', updates.tags.join(','))
    params.set('filepath', updates.filepath)
    
    const url = `/api/pages/${pageId}?${params.toString()}`
    const response = await apiClient.put<WikiPage>(url, updates.content, {
      headers: { 'Content-Type': 'text/plain' }
    })
    return response.success ? response.data || null : null
  }

  async deletePage(pageId: string): Promise<boolean> {
    const response = await apiClient.delete(`/api/pages/${pageId}`)
    return response.success
  }

  async getPageHistory(pageId: string): Promise<PageHistoryItem[]> {
    const response = await apiClient.get<PageHistoryItem[]>(`/api/pages/${pageId}/history`)
    return response.success ? response.data || [] : []
  }

  async retrievePageVersion(pageId: string, version: string): Promise<WikiPage | null> {
    // Fixed: Server expects version as query parameter, not in POST body
    const response = await apiClient.post<WikiPage>(`/api/pages/${pageId}/retrieve?version=${encodeURIComponent(version)}`, '')
    return response.success ? response.data || null : null
  }

  async searchPages(query: string, includeContent: boolean = false): Promise<SearchResult[]> {
    const url = `/api/pages?q=${encodeURIComponent(query)}&content=${includeContent ? '1' : '0'}`
    const response = await apiClient.get<SearchResult[]>(url)
    return response.success ? response.data || [] : []
  }

  // Media API
  async getMediaFiles(): Promise<MediaFile[]> {
    const response = await apiClient.get<MediaFile[]>('/api/media')
    return response.success ? response.data || [] : []
  }

  async getMediaFile(filepath: string): Promise<Blob | null> {
    const response = await apiClient.downloadFile(`/api/media/${encodeURIComponent(filepath)}`)
    return response.success ? response.data || null : null
  }

  async uploadMediaFile(file: File, filepath?: string): Promise<MediaFile | null> {
    const targetPath = filepath || file.name
    const response = await apiClient.uploadFile<MediaFile>(`/api/media?filepath=${encodeURIComponent(targetPath)}`, file)
    return response.success ? response.data || null : null
  }

  async uploadMediaFiles(files: File[]): Promise<MediaFile[]> {
    const results: MediaFile[] = []
    
    // Upload files sequentially to avoid overwhelming the server
    for (const file of files) {
      const result = await this.uploadMediaFile(file)
      if (result) {
        results.push(result)
      }
    }
    
    return results
  }

  async updateMediaFile(filepath: string, file: File): Promise<MediaFile | null> {
    const response = await apiClient.put<MediaFile>(`/api/media/${encodeURIComponent(filepath)}`, file)
    return response.success ? response.data || null : null
  }

  async deleteMediaFile(filepath: string): Promise<boolean> {
    const response = await apiClient.delete(`/api/media/${encodeURIComponent(filepath)}`)
    return response.success
  }

  async getMediaHistory(filepath: string): Promise<PageHistoryItem[]> {
    const response = await apiClient.get<PageHistoryItem[]>(`/api/media/${encodeURIComponent(filepath)}/history`)
    return response.success ? response.data || [] : []
  }

  async retrieveMediaVersion(filepath: string, commit: string): Promise<Blob | null> {
    const response = await apiClient.post<Blob>(`/api/media/${encodeURIComponent(filepath)}/retrieve`, { commit })
    return response.success ? response.data || null : null
  }

  // User API
  async getCurrentUser(): Promise<UserInfo | null> {
    const response = await apiClient.get<UserInfo>('/api/user/me')
    return response.success ? response.data || null : null
  }

  // Admin API
  async getAdminSettings(): Promise<AdminSettings | null> {
    const response = await apiClient.get<AdminSettings>('/api/admin/settings')
    return response.success ? response.data || null : null
  }

  async saveAdminSettings(settings: AdminSettings): Promise<boolean> {
    const response = await apiClient.post('/api/admin/settings', settings)
    return response.success
  }

  // Health and utility methods
  async healthCheck(): Promise<boolean> {
    return await apiClient.healthCheck()
  }

  // Batch operations
  async batchUpdatePages(updates: Array<{ pageId: string; updates: PageUpdateRequest }>): Promise<WikiPage[]> {
    const results: WikiPage[] = []
    
    // Process updates sequentially to maintain order and avoid conflicts
    for (const { pageId, updates: pageUpdates } of updates) {
      const result = await this.updatePage(pageId, pageUpdates)
      if (result) {
        results.push(result)
      }
    }
    
    return results
  }

  async batchDeletePages(pageIds: string[]): Promise<string[]> {
    const successfulDeletes: string[] = []
    
    // Process deletes sequentially for safety
    for (const pageId of pageIds) {
      const success = await this.deletePage(pageId)
      if (success) {
        successfulDeletes.push(pageId)
      }
    }
    
    return successfulDeletes
  }

  // Advanced search with filters
  async advancedSearch(options: {
    query: string
    includeContent?: boolean
    tags?: string[]
    author?: string
    dateFrom?: string
    dateTo?: string
    contentType?: 'markdown' | 'html' | 'text'
  }): Promise<SearchResult[]> {
    const params = new URLSearchParams()
    params.set('q', options.query)
    
    if (options.includeContent) params.set('content', '1')
    if (options.tags?.length) params.set('tags', options.tags.join(','))
    if (options.author) params.set('author', options.author)
    if (options.dateFrom) params.set('from', options.dateFrom)
    if (options.dateTo) params.set('to', options.dateTo)
    if (options.contentType) params.set('type', options.contentType)
    
    const response = await apiClient.get<SearchResult[]>(`/api/pages?${params.toString()}`)
    return response.success ? response.data || [] : []
  }

  // Configuration methods
  configureApiClient(config: {
    baseUrl?: string
    timeout?: number
    authToken?: string
    defaultHeaders?: Record<string, string>
  }) {
    if (config.baseUrl) apiClient.setBaseUrl(config.baseUrl)
    if (config.timeout) apiClient.setTimeout(config.timeout)
    if (config.authToken) apiClient.setAuthToken(config.authToken)
    if (config.defaultHeaders) apiClient.setDefaultHeaders(config.defaultHeaders)
  }

  // Request management
  cancelAllRequests() {
    apiClient.cancelAllRequests()
  }

  cancelRequest(requestId: string) {
    apiClient.cancelRequest(requestId)
  }

  // Debug information
  getDebugInfo() {
    return {
      ...apiClient.getDebugInfo(),
      serviceVersion: '1.0.0'
    }
  }

  // Enhanced pages methods with caching
  async getPagesCached(query?: string, includeContent?: boolean, cacheTtl?: number): Promise<WikiPage[]> {
    const cacheKey = this.getCacheKey('GET', '/api/pages', { query, includeContent })
    
    const cached = this.getCached<WikiPage[]>(cacheKey)
    if (cached) {
      return cached
    }

    const result = await this.getPages(query, includeContent)
    this.setCached(cacheKey, result, cacheTtl)
    return result
  }

  // Batch operations with progress tracking
  async batchUploadFiles(
    files: File[], 
    onProgress?: (completed: number, total: number, current?: string) => void
  ): Promise<{ successful: MediaFile[]; failed: Array<{ file: File; error: string }> }> {
    const successful: MediaFile[] = []
    const failed: Array<{ file: File; error: string }> = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      onProgress?.(i, files.length, file.name)
      
      try {
        const result = await this.uploadMediaFile(file)
        if (result) {
          successful.push(result)
        } else {
          failed.push({ file, error: 'Upload failed' })
        }
      } catch (error) {
        failed.push({ 
          file, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }
    
    onProgress?.(files.length, files.length)
    return { successful, failed }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear()
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0
    
    for (const [, cached] of this.cache) {
      if (now - cached.timestamp < cached.ttl) {
        validEntries++
      } else {
        expiredEntries++
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries
    }
  }
}

// Create singleton instance
const apiService = new ApiService()

export default apiService
export { ApiService }