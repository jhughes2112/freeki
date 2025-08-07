// Semantic API Interface - High-level API that matches server-side handlers
// This interface defines all the business operations available, abstracting away HTTP details

import type { PageMetadata } from './globalState'
import type { UserInfo } from './useUserSettings'
import type { AdminSettings } from './adminSettings'

// Page-related types
export interface PageCreateRequest {
  title: string
  content: string
  filepath: string
  tags: string[]
}

export interface PageUpdateRequest {
  pageId: string
  title: string
  content: string
  filepath: string
  tags: string[]
}

export interface PageWithContent {
  metadata: PageMetadata
  content: string
}

export interface SearchResult {
  id: string
  title: string
  path: string
  excerpt: string
  score: number
}

// Media-related types
export interface MediaFile {
  filepath: string
  size: number
  contentType: string
  lastModified?: string
}

// Semantic API Interface - mirrors the server-side handlers exactly
export interface ISemanticApi {
  // Pages API (from PagesApiHandler.cs)
  listAllPages(): Promise<PageMetadata[]>
  getSinglePage(pageId: string): Promise<PageWithContent | null>
  createPage(request: PageCreateRequest): Promise<PageMetadata | null>
  updatePage(request: PageUpdateRequest): Promise<PageMetadata | null>
  deletePage(pageId: string): Promise<boolean>
  searchPages(searchTerm: string): Promise<SearchResult[]>
  searchPagesWithContent(searchTerm: string): Promise<SearchResult[]>
  getPageHistory(pageId: string): Promise<PageMetadata[]>
  retrievePageVersion(pageId: string, version: number): Promise<PageWithContent | null>

  // Media API (from MediaApiHandler.cs)
  listAllMedia(): Promise<MediaFile[]>
  getMediaFile(filepath: string): Promise<Blob | null>
  createMediaFile(filepath: string, content: Blob): Promise<MediaFile | null>
  updateMediaFile(filepath: string, content: Blob): Promise<MediaFile | null>
  deleteMediaFile(filepath: string): Promise<boolean>
  getMediaHistory(filepath: string): Promise<PageMetadata[]>
  retrieveMediaVersion(filepath: string, commit: string): Promise<Blob | null>

  // User API (from UserApiHandler.cs)
  getCurrentUser(): Promise<UserInfo | null>

  // Admin API (from AdminSettingsApiHandler.cs)
  getAdminSettings(): Promise<AdminSettings | null>
  saveAdminSettings(settings: AdminSettings): Promise<boolean>

  // Health check
  healthCheck(): Promise<boolean>
}