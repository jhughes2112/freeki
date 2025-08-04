import { useState, useEffect, useCallback } from 'react'
import apiService from './apiService'
import type { WikiPage } from './App'
import type { PageCreateRequest, PageUpdateRequest, MediaFile, SearchResult } from './apiService'

// Custom hook for managing pages data
export function usePages() {
  const [pages, setPages] = useState<WikiPage[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const loadPages = useCallback(async (query?: string, includeContent?: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getPages(query, includeContent)
      setPages(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages')
      console.error('Failed to load pages:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createPage = useCallback(async (pageData: PageCreateRequest): Promise<WikiPage | null> => {
    setLoading(true)
    setError(null)
    try {
      const newPage = await apiService.createPage(pageData)
      if (newPage) {
        setPages(prev => [...prev, newPage])
      }
      return newPage
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create page')
      console.error('Failed to create page:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePage = useCallback(async (pageId: string, updates: PageUpdateRequest): Promise<WikiPage | null> => {
    setLoading(true)
    setError(null)
    try {
      const updatedPage = await apiService.updatePage(pageId, updates)
      if (updatedPage) {
        setPages(prev => prev.map(page => page.id === pageId ? updatedPage : page))
      }
      return updatedPage
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update page')
      console.error('Failed to update page:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deletePage = useCallback(async (pageId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const success = await apiService.deletePage(pageId)
      if (success) {
        setPages(prev => prev.filter(page => page.id !== pageId))
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete page')
      console.error('Failed to delete page:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    pages,
    loading,
    error,
    loadPages,
    createPage,
    updatePage,
    deletePage,
    clearError: () => setError(null)
  }
}

// Custom hook for managing individual page data
export function usePage(pageId: string | null) {
  const [page, setPage] = useState<WikiPage | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const loadPage = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getPage(id)
      setPage(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page')
      console.error('Failed to load page:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (pageId) {
      loadPage(pageId)
    } else {
      setPage(null)
    }
  }, [pageId, loadPage])

  return {
    page,
    loading,
    error,
    reload: () => pageId ? loadPage(pageId) : undefined,
    clearError: () => setError(null)
  }
}

// Custom hook for media file management
export function useMediaFiles() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const loadMediaFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiService.getMediaFiles()
      setMediaFiles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media files')
      console.error('Failed to load media files:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadFile = useCallback(async (file: File, filepath?: string): Promise<MediaFile | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiService.uploadMediaFile(file, filepath)
      if (result) {
        setMediaFiles(prev => [...prev, result])
      }
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
      console.error('Failed to upload file:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteFile = useCallback(async (filepath: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const success = await apiService.deleteMediaFile(filepath)
      if (success) {
        setMediaFiles(prev => prev.filter(file => file.filepath !== filepath))
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file')
      console.error('Failed to delete file:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    mediaFiles,
    loading,
    error,
    loadMediaFiles,
    uploadFile,
    deleteFile,
    clearError: () => setError(null)
  }
}

// Custom hook for search functionality
export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (query: string, includeContent: boolean = false) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await apiService.searchPages(query, includeContent)
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  return {
    results,
    loading,
    error,
    search,
    clearResults,
    clearError: () => setError(null)
  }
}

// Custom hook for API configuration and health monitoring
export function useApiStatus() {
  const [isHealthy, setIsHealthy] = useState<boolean>(true)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkHealth = useCallback(async () => {
    try {
      const healthy = await apiService.healthCheck()
      setIsHealthy(healthy)
      setLastCheck(new Date())
      return healthy
    } catch (err) {
      setIsHealthy(false)
      setLastCheck(new Date())
      console.error('Health check failed:', err)
      return false
    }
  }, [])

  const configureApi = useCallback((config: {
    baseUrl?: string
    timeout?: number
    authToken?: string
    defaultHeaders?: Record<string, string>
  }) => {
    apiService.configureApiClient(config)
  }, [])

  const getDebugInfo = useCallback(() => {
    return apiService.getDebugInfo()
  }, [])

  useEffect(() => {
    // Perform initial health check
    checkHealth()
  }, [checkHealth])

  return {
    isHealthy,
    lastCheck,
    checkHealth,
    configureApi,
    getDebugInfo
  }
}