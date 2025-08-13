import * as React from 'react'
import { useEffect } from 'react'
import { Box, AppBar, Toolbar, Typography, Button, IconButton, Avatar, Divider, useMediaQuery, Tooltip } from '@mui/material'
import { Edit, Save, Cancel, Delete, Settings, AccountCircle, LightMode, DarkMode, Monitor, ChevronLeft, ChevronRight } from '@mui/icons-material'
import FolderTree from './FolderTree'
import PageViewer from './PageViewer'
import PageEditor from './PageEditor'
import PageMetadataPanel from './PageMetadata'
import AdminSettingsDialog from './AdminSettingsDialog'
import ConfirmDialog, { useConfirmOrProceed } from './ConfirmDialog'
import { useUserSettings } from './useUserSettings'
import { useGlobalState, globalState, getCurrentLayoutState } from './globalState'
import { buildPageTree, sortPagesByDisplayOrder } from './pageTreeUtils'
import type { PageMetadata } from './globalState'
import type { DragData, DropTarget } from './pageTreeUtils'
import { fetchAdminSettings } from './adminSettings'
import { createSemanticApi } from './semanticApiFactory'
import type { ISemanticApi } from './semanticApiInterface'
import './themeService'
import './App.css'

/***************** Small Helpers *****************/
const FadePanelContent = ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (
  <div className={`fade-panel${visible ? '' : ' hidden'}`}>{children}</div>
)

const EnhancedTooltip = ({ children, title, ...props }: { children: React.ReactElement; title: string; placement?: 'top'|'bottom'|'left'|'right'; arrow?: boolean }) => (
  <Tooltip title={title} enterDelay={150} leaveDelay={0} arrow {...props}>{children}</Tooltip>
)

function upsertPageMetadata(list: PageMetadata[], updated: PageMetadata): PageMetadata[] {
  const filtered = list.filter(p => p.pageId !== updated.pageId)
  return [...filtered, updated]
}

/***************** Component *****************/
export default function App() {
  /***** Core (semanticApi non-null from start) *****/
  const semanticApi: ISemanticApi = React.useMemo(() => createSemanticApi(), [])
  const { settings, userInfo, isLoaded, updateSetting, fetchUserInfo } = useUserSettings(semanticApi)
  const adminSettings       = useGlobalState('adminSettings')
  const pageMetadata        = useGlobalState('pageMetadata')
  const currentPageMetadata = useGlobalState('currentPageMetadata')
  const currentPageContent  = useGlobalState('currentPageContent')
  const isEditing           = useGlobalState('isEditing')
  const searchResults       = useGlobalState('searchResults')
  const isLoadingPages      = useGlobalState('isLoadingPages')
  const isNarrowScreen = useMediaQuery('(max-width: 900px)')
  const [searchQueryForFolderTree, setSearchQueryForFolderTree] = React.useState('')
  const [showAdminSettings, setShowAdminSettings]               = React.useState(false)
  const [editorContent, setEditorContent]                       = React.useState<string|null>(null)
  const [viewingRevision, setViewingRevision]                   = React.useState<{ metadata: PageMetadata; content: string } | null>(null)
  const [revisionDataCache, setRevisionDataCache]               = React.useState<Record<string, { metadata: PageMetadata; content: string }>>({})
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const didInitRef = React.useRef(false)
  const editLockActive = useGlobalState('editLockActive') as boolean;
  const editLockReason = useGlobalState('editLockReason') as string | null;

  // helper to fully clear editing state consistently
  function clearEditingState() { setEditorContent(null); globalState.set('isEditing', false) }

  const hasUnsaved = isEditing && editorContent !== null && editorContent !== currentPageContent?.content
  const currentLayout = React.useMemo(() => getCurrentLayoutState(settings), [settings, isNarrowScreen])
  const effectivePageMetadata = React.useMemo(() => searchQueryForFolderTree.trim() ? searchResults : pageMetadata, [searchResults, pageMetadata, searchQueryForFolderTree])
  const pageTree = React.useMemo(() => buildPageTree(effectivePageMetadata), [effectivePageMetadata])
  const viewedMetadata = viewingRevision ? viewingRevision.metadata : currentPageMetadata
  const viewedCurrentPageVersion = React.useMemo(() => { if (!viewedMetadata) return 0; const allVersions = pageMetadata.filter(p => p.pageId === viewedMetadata.pageId); return allVersions.length ? Math.max(...allVersions.map(p => p.version)) : viewedMetadata.version }, [pageMetadata, viewedMetadata])
  const isLatestRevision = !!viewedMetadata && viewedMetadata.version === viewedCurrentPageVersion

  /***** Unsaved Changes Confirm *****/
  const { confirmOrProceed, dialog: confirmDialog } = useConfirmOrProceed({
    isEditing, hasUnsaved,
    onSave: async () => { if (editorContent !== null && currentPageMetadata) { await handleSave(editorContent) } },
    onDiscard: () => { clearEditingState() },
    message:'You have unsaved changes. What do you want to do?', title:'Unsaved Changes', dangerous:true,
    confirmText:'Proceed', cancelText:'Cancel', saveText:'Save', discardText:'Discard'
  })

  /***** Revision Handling (confirmed) *****/
  async function loadRevision(revision: { metadata: PageMetadata; content?: string } | null) {
    if (!revision) { setViewingRevision(null); clearEditingState(); return }
    const key = `${revision.metadata.pageId}:${revision.metadata.version}`
    if (revision.content) { setRevisionDataCache(p => p[key] ? p : { ...p, [key]: { metadata: revision.metadata, content: revision.content! } }); setViewingRevision({ metadata: revision.metadata, content: revision.content }); clearEditingState(); return }
    if (revisionDataCache[key]) { const cached = revisionDataCache[key]; setViewingRevision({ metadata: cached.metadata, content: cached.content }); clearEditingState(); return }
    try { const result = await semanticApi.retrievePageVersion(revision.metadata.pageId, revision.metadata.version); const content = result && result.content ? result.content : '# Revision content unavailable'; setRevisionDataCache(p => ({ ...p, [key]: { metadata: revision.metadata, content } })); setViewingRevision({ metadata: revision.metadata, content }) } catch { const errContent = '# Error loading revision content'; setRevisionDataCache(p => ({ ...p, [key]: { metadata: revision.metadata, content: errContent } })); setViewingRevision({ metadata: revision.metadata, content: errContent }) } finally { clearEditingState() }
  }
  function handleViewRevision(revision: { metadata: PageMetadata; content?: string } | null) { confirmOrProceed(() => { loadRevision(revision) }) }

  useEffect(() => { if (currentPageMetadata && currentPageContent) { const key = `${currentPageMetadata.pageId}:${currentPageMetadata.version}`; setRevisionDataCache(prev => prev[key] ? prev : { ...prev, [key]: { metadata: currentPageMetadata, content: currentPageContent.content } }) } }, [currentPageMetadata, currentPageContent])

  /***** Page Selection (confirm unsaved) *****/
  function handlePageSelect(md: PageMetadata) {
    confirmOrProceed(async () => {
      const latest = pageMetadata.filter(p => p.pageId === md.pageId).sort((a,b)=> b.version - a.version)[0] || md
      if (currentPageMetadata?.pageId === latest.pageId && currentPageMetadata.version === latest.version) return
      setViewingRevision(null); clearEditingState();
      globalState.set('currentPageMetadata', latest)
      globalState.set('isLoadingPageContent', true)
      try {
        const pageWithContent = await semanticApi.getSinglePage(latest.pageId)
        const content = pageWithContent ? pageWithContent.content : `# ${latest.title}\n\nContent could not be loaded.`
        globalState.set('currentPageContent', { pageId: latest.pageId, content })
        const key = `${latest.pageId}:${latest.version}`
        setRevisionDataCache(prev => prev[key] ? prev : { ...prev, [key]: { metadata: latest, content } })
      } catch { const fallback = `# ${latest.title}\n\nContent could not be loaded.`; globalState.set('currentPageContent', { pageId: latest.pageId, content: fallback }) }
      finally { globalState.set('isLoadingPageContent', false) }
    })
  }

  /***** Edit / Save / Cancel *****/
  function handleEdit() {
    if (!currentPageContent) return
    if (viewingRevision) { if (currentPageMetadata && viewingRevision.metadata.pageId === currentPageMetadata.pageId && viewingRevision.metadata.version === currentPageMetadata.version) { setViewingRevision(null) } else { return } }
    setEditorContent(currentPageContent.content); globalState.set('isEditing', true)
  }
  function handleEditorContentChange(content: string) { setEditorContent(content) }
  function handleCancel() { confirmOrProceed(() => { clearEditingState() }) }
  async function handleSave(content: string) {
    if (!currentPageMetadata) return
    try { const updatedMetadata = await semanticApi.updatePage({ pageId: currentPageMetadata.pageId, title: currentPageMetadata.title, content, filepath: currentPageMetadata.path, tags: currentPageMetadata.tags }); if (updatedMetadata) { globalState.set('currentPageMetadata', updatedMetadata); globalState.set('pageMetadata', upsertPageMetadata(pageMetadata, updatedMetadata)); globalState.set('currentPageContent', { pageId: updatedMetadata.pageId, content }); const key = `${updatedMetadata.pageId}:${updatedMetadata.version}`; setRevisionDataCache(prev => ({ ...prev, [key]: { metadata: updatedMetadata, content } })); clearEditingState() } } catch (e) { console.error('Failed to save page:', e) }
  }

  /***** Tag Handlers *****/
  async function handleTagAdd(tag: string): Promise<PageMetadata|null> { if (!currentPageMetadata || !currentPageContent) return null; if (currentPageMetadata.tags.includes(tag)) return null; try { const newTags = [...currentPageMetadata.tags, tag]; const updatedMetadata = await semanticApi.updatePage({ pageId: currentPageMetadata.pageId, title: currentPageMetadata.title, content: currentPageContent.content, filepath: currentPageMetadata.path, tags: newTags }); if (updatedMetadata) { globalState.set('currentPageMetadata', updatedMetadata); globalState.set('pageMetadata', upsertPageMetadata(pageMetadata, updatedMetadata)); const key = `${updatedMetadata.pageId}:${updatedMetadata.version}`; setRevisionDataCache(prev => ({ ...prev, [key]: { metadata: updatedMetadata, content: currentPageContent.content } })); return updatedMetadata } } catch(e){ console.error('Failed to add tag:', e) } return null }
  async function handleTagRemove(tag: string): Promise<PageMetadata|null> { if (!currentPageMetadata || !currentPageContent) return null; try { const newTags = currentPageMetadata.tags.filter(t => t !== tag); const updatedMetadata = await semanticApi.updatePage({ pageId: currentPageMetadata.pageId, title: currentPageMetadata.title, content: currentPageContent.content, filepath: currentPageMetadata.path, tags: newTags }); if (updatedMetadata) { globalState.set('currentPageMetadata', updatedMetadata); globalState.set('pageMetadata', upsertPageMetadata(pageMetadata, updatedMetadata)); const key = `${updatedMetadata.pageId}:${updatedMetadata.version}`; setRevisionDataCache(prev => ({ ...prev, [key]: { metadata: updatedMetadata, content: currentPageContent.content } })); return updatedMetadata } } catch(e){ console.error('Failed to remove tag:', e) } return null }

  /***** Search *****/
  function handleTagClick(tag: string) { globalState.setProperty('userSettings.searchConfig', { titles:false, tags:true, author:false, content:false }); setSearchQueryForFolderTree(tag) }
  function handleAuthorClick(author: string) { globalState.setProperty('userSettings.searchConfig', { titles:false, tags:false, author:true, content:false }); setSearchQueryForFolderTree(author) }
  async function performSearch() {
    const query = searchQueryForFolderTree
    const cfg = settings.searchConfig
    if (!query.trim()) { globalState.set('searchResults', []); return }
    if (!cfg.titles && !cfg.tags && !cfg.author && !cfg.content) { globalState.set('searchResults', []); return }
    try {
      let results: string[] = []
      if (cfg.content) { results = await semanticApi.searchPagesWithContent(query) }
      const term = query.toLowerCase()
      const matches: Array<{ page: PageMetadata; score: number }> = []
      pageMetadata.forEach(p => {
        let score = 0; let matched = false
        if (cfg.titles && p.title.toLowerCase().includes(term)) { matched = true; score += 3 }
        if (cfg.tags) p.tags.forEach(t => { if (t.toLowerCase().includes(term)) { matched = true; score += 2 } })
        if (cfg.author && p.author.toLowerCase().includes(term)) { matched = true; score += 2 }
        if (matched && p.path.toLowerCase().includes(term)) score += 1
        if (matched) matches.push({ page: p, score })
      })
      matches.sort((a,b)=> b.score - a.score)
      const clientIds = matches.map(m => m.page.pageId)
      if (cfg.content) { const serverSet = new Set(results); clientIds.filter(id => !serverSet.has(id)).forEach(id => results.push(id)) } else { results = clientIds }
      const resultMetadata = results.map(id => { const m = pageMetadata.find(p => p.pageId === id); if (!m) throw new Error(`Search integrity error: ${id}`); return m })
      globalState.set('searchResults', sortPagesByDisplayOrder(resultMetadata))
    } catch (e) { console.error('Search failed:', e); globalState.set('searchResults', []) }
  }

  /***** Create Page (and wrapper with confirm) *****/
  async function handleCreatePage(title: string, content: string, filepath: string, tags: string[]) { try { const newMd = await semanticApi.createPage({ title, content, filepath, tags }); if (newMd) { globalState.set('pageMetadata', upsertPageMetadata(pageMetadata, newMd)); handlePageSelect(newMd) } } catch(e){ console.error('Failed to create page:', e); throw e } }
  async function handleCreatePageWithConfirm(title: string, content: string, filepath: string, tags: string[]) { await confirmOrProceed(async () => { await handleCreatePage(title, content, filepath, tags) }) }

  /***** Delete (nearest selection) *****/
  function findNearestPage(deletedPath: string, candidates: PageMetadata[]): PageMetadata | null { if (!candidates.length) return null; const deletedDirs = deletedPath.split('/').slice(0,-1); let best: PageMetadata|null=null; let bestScore=-1; candidates.forEach(c=>{ const dirs = c.path.split('/').slice(0,-1); let i=0; while (i<deletedDirs.length && i<dirs.length && deletedDirs[i]===dirs[i]) i++; if (i>bestScore) { bestScore=i; best=c } }); return best }
  function handleDelete() { if (!currentPageMetadata) return; setShowDeleteDialog(true) }
  async function executeDelete(pageId: string) { try { clearEditingState(); const ok = await semanticApi.deletePage(pageId); if(!ok) return; const deletedMeta = pageMetadata.find(p=>p.pageId===pageId); const remaining = pageMetadata.filter(p=>p.pageId!==pageId); globalState.set('pageMetadata', remaining); setViewingRevision(null); globalState.set('currentPageMetadata', null); globalState.set('currentPageContent', null); setRevisionDataCache(prev=>{ const next: typeof prev = {}; Object.keys(prev).forEach(k=>{ if(!k.startsWith(pageId+':')) next[k]=prev[k] }); return next }); if (remaining.length && deletedMeta) { const nearest = findNearestPage(deletedMeta.path, remaining) || sortPagesByDisplayOrder(remaining)[0]; const latest = nearest; globalState.set('currentPageMetadata', latest); try { const pageWithContent = await semanticApi.getSinglePage(latest.pageId); const content = pageWithContent ? pageWithContent.content : `# ${latest.title}\n\nContent could not be loaded.`; globalState.set('currentPageContent', { pageId: latest.pageId, content }) } catch { globalState.set('currentPageContent', { pageId: latest.pageId, content: `# ${latest.title}\n\nContent could not be loaded.` }) } } } catch(e){ console.error('Delete page failed:', e) } }

  /***** Drag & Drop *****/
  // Wrapper to confirm unsaved edits before performing drag/drop (treat as navigation-affecting)
  function handleDragDropWithConfirm(dragData: DragData, dropTarget: DropTarget): Promise<void> {
    return new Promise(resolve => {
      confirmOrProceed(() => {
        clearEditingState()
        Promise.resolve(handleDragDrop(dragData, dropTarget)).finally(() => resolve())
      })
    })
  }
  async function handleDragDrop(dragData: DragData, dropTarget: DropTarget) { try { if (dragData.isFolder) { const affected = pageMetadata.filter(p => p.path.startsWith(dragData.path + '/')); if (!affected.length) return; let newBasePath: string; if (dropTarget.position === 'inside') { if (dropTarget.targetPageId.startsWith('folder_')) newBasePath = dropTarget.targetPath; else { const parts = dropTarget.targetPath.split('/'); newBasePath = parts.length>1 ? parts.slice(0,-1).join('/') : '' } } else { const parts = dropTarget.targetPath.split('/'); newBasePath = parts.length>1 ? parts.slice(0,-1).join('/') : '' } const folderName = dragData.path.split('/').pop() || dragData.path; const newFolderPath = newBasePath ? `${newBasePath}/${folderName}` : folderName; if (newFolderPath === dragData.path) return; const updatedMeta: PageMetadata[] = []; for (const page of affected) { const rel = page.path.substring(dragData.path.length + 1); const newPath = `${newFolderPath}/${rel}`; const pageWithContent = await semanticApi.getSinglePage(page.pageId); if (!pageWithContent) continue; const updated = await semanticApi.updatePage({ pageId:page.pageId, title:page.title, content:pageWithContent.content, filepath:newPath, tags:page.tags }); if (updated) { updatedMeta.push(updated); if (currentPageMetadata?.pageId === page.pageId) globalState.set('currentPageMetadata', updated) } } const merged = pageMetadata.map(p => updatedMeta.find(u => u.pageId === p.pageId) || p); globalState.set('pageMetadata', sortPagesByDisplayOrder(merged)) } else { const dragged = pageMetadata.find(p => p.pageId === dragData.pageId); if (!dragged) return; let newPath: string; if (dropTarget.position === 'inside') { const fileName = dragged.path.split('/').pop() || dragged.path; if (dropTarget.targetPageId.startsWith('folder_')) newPath = `${dropTarget.targetPath}/${fileName}`; else { const parts = dropTarget.targetPath.split('/'); const folder = parts.length>1 ? parts.slice(0,-1).join('/') : ''; newPath = folder ? `${folder}/${fileName}` : fileName } } else { const parts = dropTarget.targetPath.split('/'); const folder = parts.length>1 ? parts.slice(0,-1).join('/') : ''; const fileName = dragged.path.split('/').pop() || dragged.path; newPath = folder ? `${folder}/${fileName}` : fileName } if (newPath === dragged.path) return; const pageWithContent = await semanticApi.getSinglePage(dragged.pageId); if (!pageWithContent) return; const updated = await semanticApi.updatePage({ pageId:dragged.pageId, title:dragged.title, content:pageWithContent.content, filepath:newPath, tags:dragged.tags }); if (updated) { const merged = pageMetadata.map(p => p.pageId === dragged.pageId ? updated : p); globalState.set('pageMetadata', sortPagesByDisplayOrder(merged)); if (currentPageMetadata?.pageId === dragged.pageId) globalState.set('currentPageMetadata', updated) } } } catch(e){ console.error('Error during drag and drop operation:', e) } }

  /***** Keyboard Shortcuts *****/
  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if ((ev.ctrlKey || ev.metaKey) && (ev.key === 's' || ev.key === 'S')) {
        ev.preventDefault()
        if (isEditing && editorContent !== null && currentPageMetadata) {
          handleSave(editorContent)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isEditing, editorContent, currentPageMetadata])

  /***** Theme *****/
  function handleThemeToggle() { const next = settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'auto' : 'light'; updateSetting('theme', next) }
  function getThemeIcon() { return settings.theme === 'light' ? <LightMode/> : settings.theme === 'dark' ? <DarkMode/> : <Monitor/> }
  function getThemeTooltip() { return settings.theme === 'light' ? 'Switch to Dark Mode' : settings.theme === 'dark' ? 'Switch to Auto Mode' : 'Switch to Light Mode' }

  /***** Init (initial load) *****/
  useEffect(() => { if (didInitRef.current) return; didInitRef.current = true; (async () => { try { await fetchUserInfo(); globalState.set('isLoadingAdminSettings', true); const s = await fetchAdminSettings(semanticApi); if (s) globalState.set('adminSettings', s); globalState.set('isLoadingPages', true); const pages = await semanticApi.listAllPages(); if (pages.length) { globalState.set('pageMetadata', pages); const sorted = sortPagesByDisplayOrder(pages); const first = sorted[0]; globalState.set('currentPageMetadata', first); const pageWithContent = await semanticApi.getSinglePage(first.pageId); globalState.set('currentPageContent', { pageId:first.pageId, content: pageWithContent ? pageWithContent.content : `# ${first.title}\n\nContent could not be loaded.` }) } else { globalState.set('pageMetadata', []); globalState.set('currentPageMetadata', null); globalState.set('currentPageContent', null) } } catch(e){ console.error('Failed to load initial data:', e); globalState.set('pageMetadata', []); globalState.set('currentPageMetadata', null); globalState.set('currentPageContent', null) } finally { globalState.set('isLoadingAdminSettings', false); globalState.set('isLoadingPages', false) } })() }, [semanticApi])
  useEffect(() => { performSearch() }, [searchQueryForFolderTree, settings.searchConfig, semanticApi, pageMetadata])

  /***** Render *****/
  if (!isLoaded) return <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}><Typography>Loading...</Typography></Box>
  return (
    <Box sx={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <AppBar position='static' sx={{ backgroundColor:'var(--freeki-app-bar-background)' }}>
        <Toolbar sx={{ display:'flex', flexDirection:'row', alignItems:'center', justifyContent:'space-between', minHeight:40, px:0 }}>
          <Box sx={{ display:'flex', alignItems:'center', minWidth:0 }}>
            <Button onClick={()=>{ if(pageMetadata.length){ const sorted = sortPagesByDisplayOrder(pageMetadata); handlePageSelect(sorted[0]) } }} sx={{ color:'var(--freeki-app-bar-text-color)', textTransform:'none', '&:hover':{ backgroundColor:'rgba(255,255,255,0.1)' }, minWidth:0, pr:1 }} aria-label='Return to home page'>
              <Avatar src={adminSettings.iconUrl} alt={`${adminSettings.companyName} icon`} sx={{ mr:1, width:32, height:32, backgroundColor:'white', flexShrink:0 }} aria-label={adminSettings.companyName}>{adminSettings.companyName.charAt(0)}</Avatar>
              <Typography variant='h6' sx={{ color:'var(--freeki-app-bar-text-color)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:220, fontWeight:700, fontSize:20 }} variantMapping={{ h6:'div' }}>{adminSettings.wikiTitle}</Typography>
            </Button>
          </Box>
          {!isNarrowScreen && currentPageMetadata && (
            <Box sx={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center', minWidth:0, position:'absolute', left:0, right:0, pointerEvents:'none', zIndex:0 }}>
              <Typography variant='h6' sx={{ color:'var(--freeki-app-bar-text-color)', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:500, fontWeight:600, fontSize:18, mx:'auto', pointerEvents:'auto', background:'transparent', zIndex:1 }} title={currentPageMetadata.title}>{currentPageMetadata.title}</Typography>
            </Box>
          )}
          <Box sx={{ display:'flex', alignItems:'center', gap:1, minWidth:0, marginLeft:'auto', zIndex:2 }}>
            {currentPageMetadata && isEditing && (
              <EnhancedTooltip title='Save changes'><span><IconButton color='success' onClick={()=>handleSave(editorContent ?? (currentPageContent?.content||''))} sx={{ color:'var(--freeki-app-bar-text-color)', fontSize:24 }} aria-label='Save changes' disabled={!!viewingRevision || editorContent===null || editorContent===currentPageContent?.content}><Save sx={{ fontSize:24 }}/></IconButton></span></EnhancedTooltip>
            )}
            {currentPageMetadata && (isEditing ? (
              <EnhancedTooltip title='Cancel editing'><IconButton color='error' onClick={handleCancel} sx={{ color:'var(--freeki-app-bar-text-color)', fontSize:24 }} aria-label='Cancel editing'><Cancel sx={{ fontSize:24 }}/></IconButton></EnhancedTooltip>
            ) : (
              isLatestRevision ? (
                <EnhancedTooltip title='Edit page'><span><IconButton sx={{ color:'var(--freeki-app-bar-text-color)', fontSize:24 }} onClick={handleEdit} aria-label='Edit page'><Edit sx={{ fontSize:24 }}/></IconButton></span></EnhancedTooltip>
              ) : (
                <span><IconButton sx={{ color:'var(--freeki-app-bar-text-color)', fontSize:24 }} aria-label='Edit page' disabled><Edit sx={{ fontSize:24 }}/></IconButton></span>
              )
            ))}
            {currentPageMetadata && (
              <EnhancedTooltip title='Delete page'><IconButton sx={{ color:'var(--freeki-app-bar-text-color)' }} onClick={handleDelete} aria-label='Delete page'><Delete/></IconButton></EnhancedTooltip>
            )}
            <Divider orientation='vertical' flexItem sx={{ backgroundColor:'var(--freeki-app-bar-divider)', mx:1 }} />
            <EnhancedTooltip title={getThemeTooltip()}><IconButton sx={{ color:'var(--freeki-app-bar-text-color)' }} onClick={handleThemeToggle} aria-label={getThemeTooltip()}>{getThemeIcon()}</IconButton></EnhancedTooltip>
            {userInfo?.isAdmin && (<EnhancedTooltip title='Administration settings'><IconButton sx={{ color:'var(--freeki-app-bar-text-color)' }} onClick={()=>setShowAdminSettings(true)} aria-label='Open administration settings'><Settings/></IconButton></EnhancedTooltip>)}
            <EnhancedTooltip title={userInfo ? `${userInfo.fullName}\n${userInfo.email}` : 'Not signed in'}>
              <IconButton sx={{ color:'var(--freeki-app-bar-text-color)', p:0.5 }} aria-label={userInfo ? `User: ${userInfo.fullName}` : 'Not signed in'}>
                {userInfo?.gravatarUrl ? (
                  <Avatar src={userInfo.gravatarUrl} alt={userInfo.fullName} sx={{ width:32, height:32, border:'2px solid var(--freeki-app-bar-divider)' }} aria-label={userInfo.fullName}>{userInfo.fullName.charAt(0)}</Avatar>
                ) : (<AccountCircle/>) }
              </IconButton>
            </EnhancedTooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <div className={`main-layout${isNarrowScreen && (currentLayout.showFolderPanel || currentLayout.showMetadataPanel) ? ' panel-open' : ''}`} style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Left Sidebar */}
        <div className={`sidebar-panel${currentLayout.showFolderPanel ? '' : ' collapsed'}${isNarrowScreen && currentLayout.showFolderPanel ? ' narrow-opened' : ''}`} style={{ '--sidebar-width': `${isNarrowScreen ? '90vw' : settings.wideScreenLayout.sidebarWidth + 'px'}` } as React.CSSProperties}>
          <button className={`chevron-button chevron-narrow-screen sidebar-chevron chevron-sidebar-theme ${currentLayout.showFolderPanel ? 'sidebar-open' : 'sidebar-closed'}`} onClick={()=>{ const nv=!currentLayout.showFolderPanel; if (isNarrowScreen) { updateSetting('narrowScreenLayout', { ...settings.narrowScreenLayout, showFolderPanel:nv, showMetadataPanel: nv ? false : settings.narrowScreenLayout.showMetadataPanel }) } else { updateSetting('wideScreenLayout', { ...settings.wideScreenLayout, showFolderPanel:nv }) } }} aria-label={currentLayout.showFolderPanel ? 'Close sidebar':'Open sidebar'} title={currentLayout.showFolderPanel ? 'Close sidebar':'Open sidebar'}>{currentPageMetadata && currentLayout.showFolderPanel ? <ChevronLeft/> : <ChevronRight/>}</button>
          <FadePanelContent visible={currentLayout.showFolderPanel}>
            {isLoadingPages ? (
              <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', height:200, color:'var(--freeki-folders-font-color)' }}><Typography>Loading pages...</Typography></Box>
            ) : (
              <FolderTree pageTree={pageTree} selectedPageMetadata={currentPageMetadata} onPageSelect={handlePageSelect} onSearch={setSearchQueryForFolderTree} searchQuery={searchQueryForFolderTree} pageMetadata={effectivePageMetadata} onDragDrop={handleDragDropWithConfirm} onCreatePage={handleCreatePageWithConfirm} confirmOrProceed={confirmOrProceed} />
            )}
          </FadePanelContent>
          {currentLayout.showFolderPanel && !isNarrowScreen && (
            <Box onMouseDown={(e)=>{ const startX=e.clientX; const startW=settings.wideScreenLayout.sidebarWidth; const mv = (ev:MouseEvent)=>{ const nw=startW + (ev.clientX-startX); const c=Math.max(100, Math.min(window.innerWidth*0.8, nw)); updateSetting('wideScreenLayout', { ...settings.wideScreenLayout, sidebarWidth:c }) }; const up=()=>{ document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); document.body.style.cursor=''; document.body.style.userSelect='' }; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); document.body.style.cursor='col-resize'; document.body.style.userSelect='none' }} tabIndex={0} aria-label='Sidebar width resizer' sx={{ position:'absolute', top:0, right:0, width:4, height:'100%', backgroundColor:'transparent', cursor:'col-resize', '&:hover':{ backgroundColor:'primary.main' }, zIndex:1 }} />
          )}
        </div>

        {/* Center Content */}
        <div className='center-content' style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', marginLeft:(!isNarrowScreen && !currentLayout.showFolderPanel)?`-${settings.wideScreenLayout.sidebarWidth}px`:'0', marginRight:(!isNarrowScreen && !currentLayout.showMetadataPanel)?`-${settings.wideScreenLayout.metadataWidth}px`:'0', transition:'margin-left 0.3s cubic-bezier(0.4,0,0.2,1), margin-right 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
          <button className={`chevron-button chevron-wide-screen chevron-sidebar-theme ${currentLayout.showFolderPanel ? 'sidebar-open':'sidebar-closed'}`} onClick={()=>{ const nv=!currentLayout.showFolderPanel; if (isNarrowScreen) { updateSetting('narrowScreenLayout', { ...settings.narrowScreenLayout, showFolderPanel:nv, showMetadataPanel: nv ? false : settings.narrowScreenLayout.showMetadataPanel }) } else { updateSetting('wideScreenLayout', { ...settings.wideScreenLayout, showFolderPanel:nv }) } }} aria-label={currentLayout.showFolderPanel ? 'Close sidebar':'Open sidebar'} title={currentLayout.showFolderPanel ? 'Close sidebar':'Open sidebar'}>{currentLayout.showFolderPanel ? <ChevronLeft/> : <ChevronRight/>}</button>
          <button className={`chevron-button chevron-wide-screen chevron-metadata-theme ${currentLayout.showMetadataPanel ? 'metadata-open':'metadata-closed'}`} onClick={()=>{ const nv=!currentLayout.showMetadataPanel; if (isNarrowScreen) { updateSetting('narrowScreenLayout', { ...settings.narrowScreenLayout, showMetadataPanel:nv, showFolderPanel: nv ? false : settings.narrowScreenLayout.showFolderPanel }) } else { updateSetting('wideScreenLayout', { ...settings.wideScreenLayout, showMetadataPanel:nv }) } }} aria-label={currentLayout.showMetadataPanel ? 'Close metadata panel':'Open metadata panel'} title={currentLayout.showMetadataPanel ? 'Close metadata panel':'Open metadata panel'}>{currentLayout.showMetadataPanel ? <ChevronRight/> : <ChevronLeft/>}</button>
          <Box sx={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }} role='main'>
            <Box sx={{ flex:1, overflow:'auto' }} role='main'>
              {viewingRevision ? (
                <PageViewer metadata={viewingRevision.metadata} content={{ pageId:viewingRevision.metadata.pageId, content:viewingRevision.content }} />
              ) : (currentPageMetadata && currentPageContent && (isEditing ? (
                <PageEditor content={currentPageContent} onContentChange={handleEditorContentChange} />
              ) : (
                <PageViewer metadata={currentPageMetadata} content={currentPageContent} />
              )))}
            </Box>
          </Box>
        </div>

        {/* Metadata Panel */}
        <div className={`metadata-panel${currentLayout.showMetadataPanel ? '' : ' collapsed'}${isNarrowScreen && currentLayout.showMetadataPanel ? ' narrow-opened' : ''}`} style={{ '--metadata-width': `${isNarrowScreen ? '90vw' : settings.wideScreenLayout.metadataWidth + 'px'}` } as React.CSSProperties}>
          <button className={`chevron-button chevron-narrow-screen metadata-chevron chevron-metadata-theme ${currentLayout.showMetadataPanel ? 'metadata-open':'metadata-closed'}`} onClick={()=>{ const nv=!currentLayout.showMetadataPanel; if (isNarrowScreen) { updateSetting('narrowScreenLayout', { ...settings.narrowScreenLayout, showMetadataPanel:nv, showFolderPanel: nv ? false : settings.narrowScreenLayout.showFolderPanel }) } else { updateSetting('wideScreenLayout', { ...settings.wideScreenLayout, showMetadataPanel:nv }) } }} aria-label={currentLayout.showMetadataPanel ? 'Close metadata panel':'Open metadata panel'} title={currentLayout.showMetadataPanel ? 'Close metadata panel':'Open metadata panel'}>{currentLayout.showMetadataPanel ? <ChevronRight/> : <ChevronLeft/>}</button>
          <FadePanelContent visible={currentLayout.showMetadataPanel}>
            {viewingRevision ? (
              <PageMetadataPanel metadata={viewingRevision.metadata} content={{ pageId:viewingRevision.metadata.pageId, content:viewingRevision.content }} semanticApi={semanticApi} onTagClick={handleTagClick} onTagAdd={handleTagAdd} onTagRemove={handleTagRemove} onAuthorClick={handleAuthorClick} onViewRevision={handleViewRevision} currentPageVersion={currentPageMetadata?.version || viewingRevision.metadata.version} />
            ) : (currentPageMetadata && currentPageContent ? (
              <PageMetadataPanel metadata={currentPageMetadata} content={currentPageContent} semanticApi={semanticApi} onTagClick={handleTagClick} onTagAdd={handleTagAdd} onTagRemove={handleTagRemove} onAuthorClick={handleAuthorClick} onViewRevision={handleViewRevision} currentPageVersion={currentPageMetadata.version} />
            ) : (
              <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', height:200, color:'var(--freeki-page-details-font-color)', p:2 }}><Typography variant='body2' sx={{ textAlign:'center', opacity:0.6 }}>{currentPageMetadata ? 'Loading page content...' : 'No page selected'}</Typography></Box>
            ))}

          </FadePanelContent>
          {currentLayout.showMetadataPanel && !isNarrowScreen && (
            <Box onMouseDown={(e)=>{ const startX=e.clientX; const startW=settings.wideScreenLayout.metadataWidth; const mv = (ev:MouseEvent)=>{ const nw=startW - (ev.clientX-startX); const c=Math.max(100, Math.min(window.innerWidth*0.8, nw)); updateSetting('wideScreenLayout', { ...settings.wideScreenLayout, metadataWidth:c }) }; const up=()=>{ document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); document.body.style.cursor=''; document.body.style.userSelect='' }; document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up); document.body.style.cursor='col-resize'; document.body.style.userSelect='none' }} tabIndex={0} aria-label='Metadata panel width resizer' sx={{ position:'absolute', top:0, left:0, width:4, height:'100%', backgroundColor:'transparent', cursor:'col-resize', '&:hover':{ backgroundColor:'primary.main' }, zIndex:1 }} />
          )}
        </div>
      </div>

      {/* Footer */}
      <Box component='footer' role='contentinfo' sx={{ borderTop:'1px solid var(--freeki-border-color)', backgroundColor:'var(--freeki-footer-background)', py:1, px:2, textAlign:'center' }}>
        <Typography variant='caption' sx={{ color:'var(--freeki-footer-text-color)' }}>Copyright (c) {new Date().getFullYear()} {adminSettings.companyName} powered by FreeKi</Typography>
      </Box>

      <AdminSettingsDialog open={showAdminSettings} onClose={()=>setShowAdminSettings(false)} themeMode={settings.theme} />
      {confirmDialog}
      {showDeleteDialog && (
        <ConfirmDialog open={showDeleteDialog} onClose={()=> setShowDeleteDialog(false)} onProceed={async ()=> { if (currentPageMetadata) { await executeDelete(currentPageMetadata.pageId) }; setShowDeleteDialog(false) }} title='Delete Page' message={`Are you sure you want to delete the page "${currentPageMetadata?.title||''}"? This cannot be undone.`} confirmText='Delete' cancelText='Cancel' dangerous isEditing={false} hasUnsaved={false} />
      )}
      {editLockActive && (
        <div
          aria-label={editLockReason || 'Operation in progress'}
          aria-busy="true"
          role="alert"
          onMouseDown={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
          onKeyDown={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            background: 'rgba(0,0,0,0.05)',
            cursor: 'wait',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 18,
            color: 'var(--freeki-p-font-color)'
          }}
        >
          <div style={{ padding: '12px 20px', background: 'var(--freeki-page-details-background)', border: '1px solid var(--freeki-border-color)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
            {editLockReason || 'Working…'}
          </div>
        </div>
      )}
    </Box>
  )
}
