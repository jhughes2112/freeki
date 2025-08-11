// Real Semantic API - Makes actual HTTP calls to the server
// This implementation handles all network communication and URL construction

import type { 
  ISemanticApi, 
  PageCreateRequest, 
  PageUpdateRequest, 
  PageWithContent, 
  MediaFile 
} from './semanticApiInterface'
import type { PageMetadata } from './globalState'
import type { UserInfo } from './useUserSettings'
import type { AdminSettings } from './adminSettings'

export class RealSemanticApi implements ISemanticApi {
  private logRequest(method: string, params?: unknown): void {
    const timestamp = new Date().toISOString()
    console.log(`?? [${timestamp}] RealSemanticApi.${method}`, params ? params : '')
  }

  private logResponse(method: string, result: unknown, duration: number): void {
    const timestamp = new Date().toISOString()
    const resultInfo = result === null ? 'null' : 
                      result === undefined ? 'undefined' :
                      Array.isArray(result) ? `Array(${result.length})` :
                      typeof result === 'object' ? 'Object' :
                      typeof result
    console.log(`? [${timestamp}] RealSemanticApi.${method} completed in ${duration}ms, result: ${resultInfo}`)
  }

  private logError(method: string, error: unknown, duration: number): void {
    const timestamp = new Date().toISOString()
    console.error(`? [${timestamp}] RealSemanticApi.${method} failed after ${duration}ms:`, error)
  }

  private async makeRequest<T>(
    url: string, 
    method: string = 'GET', 
    body?: unknown
  ): Promise<T | null> {
    const requestInit: RequestInit = {
      method,
      headers: {
        'Authorization': 'testuser<->Test User<->test@example.com<->Admin'
      }
    }

    if (body !== undefined) {
      if (typeof body === 'string') {
        requestInit.body = body
        requestInit.headers = {
          ...requestInit.headers,
          'Content-Type': 'text/plain'
        }
      } else if (body instanceof Blob || body instanceof FormData) {
        requestInit.body = body
      } else {
        requestInit.body = JSON.stringify(body)
        requestInit.headers = {
          ...requestInit.headers,
          'Content-Type': 'application/json'
        }
      }
    }

    const response = await fetch(url, requestInit)
    
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return await response.json()
    } else if (contentType?.includes('text/')) {
      return await response.text() as unknown as T
    } else {
      return await response.blob() as unknown as T
    }
  }

  // Pages API implementation
  async listAllPages(): Promise<PageMetadata[]> {
    const startTime = performance.now()
    this.logRequest('listAllPages')
    
    try {
      const result = await this.makeRequest<PageMetadata[]>('/api/pages')
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('listAllPages', result, duration)
      return result || []
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('listAllPages', error, duration)
      throw error
    }
  }

  async getSinglePage(pageId: string): Promise<PageWithContent | null> {
    const startTime = performance.now()
    this.logRequest('getSinglePage', { pageId })
    
    try {
      const result = await this.makeRequest<PageWithContent>(`/api/pages/${pageId}`)
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('getSinglePage', result, duration)
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('getSinglePage', error, duration)
      throw error
    }
  }

  async createPage(request: PageCreateRequest): Promise<PageMetadata | null> {
    const startTime = performance.now()
    this.logRequest('createPage', { 
      title: request.title, 
      filepath: request.filepath, 
      tags: request.tags,
      contentLength: request.content.length 
    })
    
    try {
      const params = new URLSearchParams()
      params.set('title', request.title)
      params.set('tags', request.tags.join(','))
      params.set('filepath', request.filepath)

      const result = await this.makeRequest<PageMetadata>(
        `/api/pages?${params.toString()}`, 
        'POST', 
        request.content
      )
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('createPage', result, duration)
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('createPage', error, duration)
      throw error
    }
  }

  async updatePage(request: PageUpdateRequest): Promise<PageMetadata | null> {
    const startTime = performance.now()
    this.logRequest('updatePage', { 
      pageId: request.pageId,
      title: request.title, 
      filepath: request.filepath, 
      tags: request.tags,
      contentLength: request.content.length 
    })
    
    try {
      const params = new URLSearchParams()
      params.set('title', request.title)
      params.set('tags', request.tags.join(','))
      params.set('filepath', request.filepath)

      const result = await this.makeRequest<PageMetadata>(
        `/api/pages/${request.pageId}?${params.toString()}`, 
        'PUT', 
        request.content
      )
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('updatePage', result, duration)
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('updatePage', error, duration)
      throw error
    }
  }

  async deletePage(pageId: string): Promise<boolean> {
    const startTime = performance.now()
    this.logRequest('deletePage', { pageId })
    
    try {
      await this.makeRequest(`/api/pages/${pageId}`, 'DELETE')
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('deletePage', true, duration)
      return true
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('deletePage', error, duration)
      return false
    }
  }

  async searchPagesWithContent(searchTerm: string): Promise<string[]> {
    if (!searchTerm || searchTerm.length < 3) {
      return [];
    }
    const startTime = performance.now()
    this.logRequest('searchPagesWithContent', { searchTerm })
    try {
      const result = await this.makeRequest<string[]>(`/api/pages?q=${encodeURIComponent(searchTerm)}`)
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('searchPagesWithContent', result, duration)
      return result || []
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('searchPagesWithContent', error, duration)
      throw error
    }
  }

  async getPageHistory(pageId: string): Promise<PageMetadata[]> {
    const startTime = performance.now()
    this.logRequest('getPageHistory', { pageId })
    
    try {
      const result = await this.makeRequest<PageMetadata[]>(`/api/pages/${pageId}/history`)
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('getPageHistory', result, duration)
      return result || []
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('getPageHistory', error, duration)
      throw error
    }
  }

  async retrievePageVersion(pageId: string, version: number): Promise<PageWithContent | null> {
    const startTime = performance.now()
    this.logRequest('retrievePageVersion', { pageId, version })
    
    try {
      const result = await this.makeRequest<PageWithContent>(
        `/api/pages/${pageId}/retrieve?version=${version}`, 
        'POST'
      )
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('retrievePageVersion', result, duration)
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('retrievePageVersion', error, duration)
      throw error
    }
  }

  // Media API implementation
  async listAllMedia(): Promise<MediaFile[]> {
    const startTime = performance.now()
    this.logRequest('listAllMedia')
    
    try {
      const result = await this.makeRequest<MediaFile[]>('/api/media')
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('listAllMedia', result, duration)
      return result || []
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('listAllMedia', error, duration)
      throw error
    }
  }

  async getMediaFile(filepath: string): Promise<Blob | null> {
    const startTime = performance.now()
    this.logRequest('getMediaFile', { filepath })
    
    try {
      const result = await this.makeRequest<Blob>(`/api/media/${encodeURIComponent(filepath)}`)
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('getMediaFile', result, duration)
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('getMediaFile', error, duration)
      throw error
    }
  }

  async createMediaFile(filepath: string, content: Blob): Promise<MediaFile | null> {
    const startTime = performance.now()
    this.logRequest('createMediaFile', { filepath, size: content.size, type: content.type })
    
    try {
      const result = await this.makeRequest<MediaFile>(
        `/api/media?filepath=${encodeURIComponent(filepath)}`, 
        'POST', 
        content
      )
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('createMediaFile', result, duration)
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('createMediaFile', error, duration)
      throw error
    }
  }

  async updateMediaFile(filepath: string, content: Blob): Promise<MediaFile | null> {
    const startTime = performance.now()
    this.logRequest('updateMediaFile', { filepath, size: content.size, type: content.type })
    
    try {
      const result = await this.makeRequest<MediaFile>(
        `/api/media/${encodeURIComponent(filepath)}`, 
        'PUT', 
        content
      )
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('updateMediaFile', result, duration)
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('updateMediaFile', error, duration)
      throw error
    }
  }

  async deleteMediaFile(filepath: string): Promise<boolean> {
    const startTime = performance.now()
    this.logRequest('deleteMediaFile', { filepath })
    
    try {
      await this.makeRequest(`/api/media/${encodeURIComponent(filepath)}`, 'DELETE')
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('deleteMediaFile', true, duration)
      return true
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('deleteMediaFile', error, duration)
      return false
    }
  }

  async getMediaHistory(filepath: string): Promise<PageMetadata[]> {
    const startTime = performance.now()
    this.logRequest('getMediaHistory', { filepath })
    
    try {
      const result = await this.makeRequest<PageMetadata[]>(`/api/media/${encodeURIComponent(filepath)}/history`)
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('getMediaHistory', result, duration)
      return result || []
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('getMediaHistory', error, duration)
      throw error
    }
  }

  async retrieveMediaVersion(filepath: string, commit: string): Promise<Blob | null> {
    const startTime = performance.now()
    this.logRequest('retrieveMediaVersion', { filepath, commit })
    
    try {
      const result = await this.makeRequest<Blob>(
        `/api/media/${encodeURIComponent(filepath)}/retrieve`, 
        'POST', 
        { commit }
      )
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('retrieveMediaVersion', result, duration)
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('retrieveMediaVersion', error, duration)
      throw error
    }
  }

  // User API implementation
  async getCurrentUser(): Promise<UserInfo | null> {
    const startTime = performance.now()
    this.logRequest('getCurrentUser')
    
    try {
      const result = await this.makeRequest<UserInfo>('/api/user/me')
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('getCurrentUser', result, duration)
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('getCurrentUser', error, duration)
      throw error
    }
  }

  // Admin API implementation
  async getAdminSettings(): Promise<AdminSettings | null> {
    const startTime = performance.now()
    this.logRequest('getAdminSettings')
    
    try {
      const result = await this.makeRequest<AdminSettings>('/api/admin/settings')
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('getAdminSettings', result, duration)
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('getAdminSettings', error, duration)
      throw error
    }
  }

  async saveAdminSettings(settings: AdminSettings): Promise<boolean> {
    const startTime = performance.now()
    this.logRequest('saveAdminSettings', { 
      companyName: settings.companyName,
      wikiTitle: settings.wikiTitle,
      hasColorSchemes: !!settings.colorSchemes
    })
    
    try {
      await this.makeRequest('/api/admin/settings', 'POST', settings)
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('saveAdminSettings', true, duration)
      return true
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('saveAdminSettings', error, duration)
      return false
    }
  }

  // Health check implementation
  async healthCheck(): Promise<boolean> {
    const startTime = performance.now()
    this.logRequest('healthCheck')
    
    try {
      await this.makeRequest('/health')
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('healthCheck', true, duration)
      return true
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('healthCheck', error, duration)
      return false
    }
  }
}