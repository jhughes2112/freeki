// Fake Semantic API - Simulates server operations using in-memory data
// This implementation provides the same interface but works with test data

import type { 
  ISemanticApi, 
  PageCreateRequest, 
  PageUpdateRequest, 
  PageWithContent, 
  SearchResult, 
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
      const result = [...this.fakePages]
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
      const metadata = this.fakePages.find(p => p.pageId === pageId)
      if (!metadata) {
        const duration = Math.round(performance.now() - startTime)
        this.logResponse('getSinglePage', null, duration)
        return null
      }

      const content = this.fakeContent[pageId] || `# ${metadata.title}\n\nContent not found.`
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
        path: request.filepath,
        tags: [...request.tags],
        lastModified: Date.now() / 1000,
        version: 1
      }

      this.fakePages.push(newPage)
      this.fakeContent[pageId] = request.content
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
      const index = this.fakePages.findIndex(p => p.pageId === request.pageId)
      if (index === -1) {
        const duration = Math.round(performance.now() - startTime)
        this.logResponse('updatePage', null, duration)
        return null
      }

      const updatedPage: PageMetadata = {
        ...this.fakePages[index],
        title: request.title,
        path: request.filepath,
        tags: [...request.tags],
        lastModified: Date.now() / 1000,
        version: this.fakePages[index].version + 1
      }

      this.fakePages[index] = updatedPage
      this.fakeContent[request.pageId] = request.content
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

  async searchPagesWithContent(searchTerm: string): Promise<SearchResult[]> {
    const startTime = performance.now()
    this.logRequest('searchPagesWithContent', { searchTerm })
    
    try {
      const results: SearchResult[] = []
      const term = searchTerm.toLowerCase()

      console.log(`?? FakeSemanticApi: Searching for "${term}" in ${this.fakePages.length} pages`)

      this.fakePages.forEach(page => {
        const content = this.fakeContent[page.pageId] || ''
        const titleMatch = page.title.toLowerCase().includes(term)
        const tagMatch = page.tags.some(tag => tag.toLowerCase().includes(term))
        const contentMatch = content.toLowerCase().includes(term)
        
        if (titleMatch || tagMatch || contentMatch) {
          console.log(`? Found match in page "${page.title}": title=${titleMatch}, tags=${tagMatch}, content=${contentMatch}`)
          
          // Calculate a more realistic score based on content matches
          let score = 0
          const lowerTitle = page.title.toLowerCase()
          const lowerContent = content.toLowerCase()
          
          // Count occurrences in title (weighted more heavily)
          let titleIndex = 0
          while ((titleIndex = lowerTitle.indexOf(term, titleIndex)) !== -1) {
            score += 3
            titleIndex += term.length
          }
          
          // Count occurrences in content
          let contentIndex = 0
          while ((contentIndex = lowerContent.indexOf(term, contentIndex)) !== -1) {
            score += 1
            contentIndex += term.length
          }
          
          // Count tag matches
          page.tags.forEach(tag => {
            if (tag.toLowerCase().includes(term)) {
              score += 2
            }
          })
          
          // Create excerpt around first match
          let excerpt = content.substring(0, 100) + '...'
          const firstMatch = lowerContent.indexOf(term)
          if (firstMatch >= 0) {
            const start = Math.max(0, firstMatch - 25)
            const end = Math.min(content.length, firstMatch + term.length + 45)
            excerpt = content.substring(start, end)
            if (start > 0) excerpt = '...' + excerpt
            if (end < content.length) excerpt = excerpt + '...'
          }
          
          results.push({
            id: page.pageId,
            title: page.title,
            path: page.path,
            excerpt,
            score
          })
        }
      })

      // Sort by score descending
      results.sort((a, b) => b.score - a.score)

      console.log(`?? FakeSemanticApi: Found ${results.length} results for "${term}"`)
      results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.title} (score: ${result.score})`)
      })

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
      const page = this.fakePages.find(p => p.pageId === pageId)
      if (!page) {
        const duration = Math.round(performance.now() - startTime)
        this.logResponse('getPageHistory', [], duration)
        return []
      }

      const result = [
        { ...page, version: page.version },
        { ...page, version: Math.max(1, page.version - 1), lastModified: page.lastModified - 3600 }
      ]
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
      const page = this.fakePages.find(p => p.pageId === pageId)
      if (!page) {
        const duration = Math.round(performance.now() - startTime)
        this.logResponse('retrievePageVersion', null, duration)
        return null
      }

      const content = this.fakeContent[pageId] || `# ${page.title}\n\nOld version content.`
      const result = {
        metadata: { ...page, version },
        content
      }
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