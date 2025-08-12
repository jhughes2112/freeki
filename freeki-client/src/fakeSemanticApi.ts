// Fake Semantic API - Simulates server operations using in-memory data
// This implementation provides the same interface but works with test data

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
import { testPageMetadata, testPageContent } from './testData'
import { DEFAULT_ADMIN_SETTINGS } from './adminSettings'

export class FakeSemanticApi implements ISemanticApi {
  // In-memory storage
  private fakePages: PageMetadata[] = [...testPageMetadata]
  private fakeContent: Record<string, string> = { ...testPageContent }
  private fakeMedia: MediaFile[] = []
  private fakeMediaContent: Map<string, Blob> = new Map()
  private fakeAdminSettings: AdminSettings = {
    ...DEFAULT_ADMIN_SETTINGS,
    companyName: 'Demo Company',
    wikiTitle: 'FreeKi Demo Wiki'
  }

  private logRequest(method: string, params?: unknown): void {
    const timestamp = new Date().toISOString()
    console.log(`?? [${timestamp}] FakeSemanticApi.${method}`, params ? params : '')
  }

  private logResponse(method: string, result: unknown, duration: number): void {
    const timestamp = new Date().toISOString()
    const resultInfo = result === null ? 'null' : 
                      result === undefined ? 'undefined' :
                      Array.isArray(result) ? `Array(${result.length})` :
                      typeof result === 'object' ? 'Object' :
                      typeof result
    console.log(`? [${timestamp}] FakeSemanticApi.${method} completed in ${duration}ms, result: ${resultInfo}`)
  }

  private logError(method: string, error: unknown, duration: number): void {
    const timestamp = new Date().toISOString()
    console.error(`? [${timestamp}] FakeSemanticApi.${method} failed after ${duration}ms:`, error)
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Pages API implementation
  async listAllPages(): Promise<PageMetadata[]> {
    const startTime = performance.now()
    this.logRequest('listAllPages')
    try {
      // Only return the highest version for each pageId
      const pageMap: Record<string, PageMetadata> = {}
      for (const page of this.fakePages) {
        if (!pageMap[page.pageId] || page.version > pageMap[page.pageId].version) {
          pageMap[page.pageId] = page
        }
      }
      const result = Object.values(pageMap)
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('listAllPages', result, duration)
      return result
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
      // Find the highest version for this pageId
      let metadata: PageMetadata | undefined = undefined
      for (let i = 0; i < this.fakePages.length; i++)
      {
        if (this.fakePages[i].pageId === pageId)
        {
          if (!metadata || this.fakePages[i].version > metadata.version)
          {
            metadata = this.fakePages[i]
          }
        }
      }
      if (!metadata)
      {
        const duration = Math.round(performance.now() - startTime)
        this.logResponse('getSinglePage', null, duration)
        return null
      }
      // Use key format pageId:version for content
      const contentKey = pageId + ':' + metadata.version
      const content = this.fakeContent[contentKey] || `# ${metadata.title}\n\nContent not found.`
      const result = { metadata, content }
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
      const pageId = this.generateId()
      const newPage: PageMetadata = {
        pageId,
        title: request.title,
        author: 'Test User',
        path: request.filepath,
        tags: [...request.tags],
        lastModified: Date.now() / 1000,
        version: 1
      }

      this.fakePages.push(newPage)
      this.fakeContent[`${pageId}:1`] = request.content
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('createPage', newPage, duration)
      return newPage
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
      // Find the highest version for this pageId
      let highestVersion = 0
      let latestPage: PageMetadata | undefined = undefined
      for (const page of this.fakePages) {
        if (page.pageId === request.pageId && page.version > highestVersion) {
          highestVersion = page.version
          latestPage = page
        }
      }
      if (!latestPage) {
        const duration = Math.round(performance.now() - startTime)
        this.logResponse('updatePage', null, duration)
        return null
      }

      const newVersion = highestVersion + 1
      const updatedPage: PageMetadata = {
        ...latestPage,
        title: request.title,
        author: 'Test User',
        path: request.filepath,
        tags: [...request.tags],
        lastModified: Date.now() / 1000,
        version: newVersion
      }

      this.fakePages.push(updatedPage)
      this.fakeContent[`${request.pageId}:${newVersion}`] = request.content
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('updatePage', updatedPage, duration)
      return updatedPage
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
      const index = this.fakePages.findIndex(p => p.pageId === pageId)
      if (index === -1) {
        const duration = Math.round(performance.now() - startTime)
        this.logResponse('deletePage', false, duration)
        return false
      }

      this.fakePages.splice(index, 1)
      delete this.fakeContent[pageId]
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('deletePage', true, duration)
      return true
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('deletePage', error, duration)
      throw error
    }
  }

  async searchPagesWithContent(searchTerm: string): Promise<string[]> {
    if (!searchTerm || searchTerm.length < 3) {
      return [];
    }
    const startTime = performance.now()
    this.logRequest('searchPagesWithContent', { searchTerm })
    try {
      const results: string[] = []
      const term = searchTerm.toLowerCase()
      console.log(`?? FakeSemanticApi: Searching for "${term}" in page content only (not metadata)`)
      this.fakePages.forEach(page => {
        const content = this.fakeContent[page.pageId] || ''
        const contentMatch = content.toLowerCase().includes(term)
        if (contentMatch) {
          console.log(`? Found content match in page "${page.title}"`)
          results.push(page.pageId)
        }
      })
      console.log(`?? FakeSemanticApi: Found ${results.length} content-only results for "${term}"`)
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('searchPagesWithContent', results, duration)
      return results
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
      // Return all revisions for this pageId, unsorted
      const result: PageMetadata[] = []
      for (let i = 0; i < this.fakePages.length; i++)
      {
        if (this.fakePages[i].pageId === pageId)
        {
          result.push(this.fakePages[i])
        }
      }
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('getPageHistory', result, duration)
      return result
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
      // Find the revision with both pageId and version
      let page: PageMetadata | undefined = undefined
      for (let i = 0; i < this.fakePages.length; i++)
      {
        if (this.fakePages[i].pageId === pageId && this.fakePages[i].version === version)
        {
          page = this.fakePages[i]
        }
      }
      if (!page)
      {
        const duration = Math.round(performance.now() - startTime)
        this.logResponse('retrievePageVersion', null, duration)
        return null
      }
      // Use key format pageId:version for content
      const contentKey = pageId + ':' + version
      const content = this.fakeContent[contentKey] || `# ${page.title}\n\nOld version content.`
      const result = { metadata: page, content }
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
      const result = [...this.fakeMedia]
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('listAllMedia', result, duration)
      return result
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
      const result = this.fakeMediaContent.get(filepath) || null
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
      const mediaFile: MediaFile = {
        filepath,
        size: content.size,
        contentType: content.type,
        lastModified: new Date().toISOString()
      }

      this.fakeMedia.push(mediaFile)
      this.fakeMediaContent.set(filepath, content)
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('createMediaFile', mediaFile, duration)
      return mediaFile
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
      const index = this.fakeMedia.findIndex(m => m.filepath === filepath)
      if (index === -1) {
        const duration = Math.round(performance.now() - startTime)
        this.logResponse('updateMediaFile', null, duration)
        return null
      }

      const updatedFile: MediaFile = {
        ...this.fakeMedia[index],
        size: content.size,
        contentType: content.type,
        lastModified: new Date().toISOString()
      }

      this.fakeMedia[index] = updatedFile
      this.fakeMediaContent.set(filepath, content)
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('updateMediaFile', updatedFile, duration)
      return updatedFile
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
      const index = this.fakeMedia.findIndex(m => m.filepath === filepath)
      if (index === -1) {
        const duration = Math.round(performance.now() - startTime)
        this.logResponse('deleteMediaFile', false, duration)
        return false
      }

      this.fakeMedia.splice(index, 1)
      this.fakeMediaContent.delete(filepath)
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('deleteMediaFile', true, duration)
      return true
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('deleteMediaFile', error, duration)
      throw error
    }
  }

  async getMediaHistory(filepath: string): Promise<PageMetadata[]> {
    const startTime = performance.now()
    this.logRequest('getMediaHistory', { filepath })
    
    try {
      const result: PageMetadata[] = []
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('getMediaHistory', result, duration)
      return result
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
      const result = this.fakeMediaContent.get(filepath) || null
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
      const result = {
        accountId: 'demo-user',
        fullName: 'Demo User',
        email: 'demo@example.com',
        roles: ['Admin'],
        isAdmin: true,
        gravatarUrl: undefined
      }
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
      const result = { ...this.fakeAdminSettings }
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
      this.fakeAdminSettings = { ...settings }
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('saveAdminSettings', true, duration)
      return true
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('saveAdminSettings', error, duration)
      throw error
    }
  }

  // Health check implementation
  async healthCheck(): Promise<boolean> {
    const startTime = performance.now()
    this.logRequest('healthCheck')
    
    try {
      const duration = Math.round(performance.now() - startTime)
      this.logResponse('healthCheck', true, duration)
      return true
    } catch (error) {
      const duration = Math.round(performance.now() - startTime)
      this.logError('healthCheck', error, duration)
      throw error
    }
  }
}