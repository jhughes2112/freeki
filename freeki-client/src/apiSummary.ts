// FreeKi Client Architecture Summary
// Comprehensive guide to the unique architectural patterns and systems in this codebase

export interface ArchitectureSummary {
  version: string
  lastUpdated: string
  overview: string
}

export const API_SUMMARY_VERSION = '3.3.0'
export const LAST_UPDATED = '2024-12-19'

// Export this summary for runtime access
export default {
  version: API_SUMMARY_VERSION,
  lastUpdated: LAST_UPDATED,
  overview: 'Consolidated global state + immediate reactive updates + drag-synced scrolling tree + drag-responsive floating UI + runtime theming'
} as ArchitectureSummary

/*
# FREEKI CLIENT ARCHITECTURE SUMMARY

## CORE ARCHITECTURAL PATTERNS

### 1. SEMANTIC API SYSTEM (Replaces Old HTTP Client Layers)
**Location**: `src/semanticApi*.ts`
**Pattern**: Clean interface matching server-side handlers exactly

```typescript
// Simple factory decision point
const USE_FAKE_API = false
export function createSemanticApi(): ISemanticApi {
  return USE_FAKE_API ? new FakeSemanticApi() : new RealSemanticApi()
}

// Usage throughout app
const api = createSemanticApi()
const pages = await api.listAllPages()
const page = await api.getSinglePage(pageId)
```

**Key Files**:
- `semanticApiInterface.ts` - Clean interface (no HTTP details)
- `realSemanticApi.ts` - Network implementation (hardcoded auth)
- `fakeSemanticApi.ts` - In-memory implementation (no network simulation)
- `semanticApiFactory.ts` - One-line factory

**Benefits**:
- Direct function calls matching server handlers
- No configuration ceremony or network abstractions
- Easy testing with fake implementation
- Zero unnecessary layers

---

### 2. CONSOLIDATED GLOBAL STATE SYSTEM
**Location**: `src/globalState.ts`
**Pattern**: Immediate reactive state with property-path targeting and unified user settings

```typescript
// CRITICAL: No batching, no throttling - immediate updates
globalState.set('currentPageMetadata', pageData)
globalState.setProperty('userSettings.expandedFolderPaths', ['docs', 'docs/guides'])

// Property path targeting for nested updates
globalState.setProperty('adminSettings.colorSchemes.light.appBarBackground', '#FF0000')
globalState.setProperty('userSettings.searchConfig.titles', true)

// React hooks with automatic re-renders
const expandedPaths = useGlobalState('userSettings.expandedFolderPaths') as string[]
const searchConfig = useGlobalState('userSettings.searchConfig')
const appBarColor = useGlobalState('adminSettings.colorSchemes.light.appBarBackground')
```

**CONSOLIDATED STATE ARCHITECTURE**:
- **Complete user settings** stored in globalState for consistency
- **Automatic device-aware persistence** - separate settings per device type/screen
- **Admin settings** for theme colors and branding (server-side)
- **User settings** for personal preferences (client-side, per-device)
- **Page data and UI state** for application functionality

**State Structure**:
```typescript
interface AppState {
  adminSettings: AdminSettings           // Server-side theme colors, branding
  userSettings: UserSettings             // Client-side user preferences (device-specific)
  currentUser: UserInfo | null           // Current authenticated user
  pageMetadata: PageMetadata[]           // Flat server data (source of truth)
  currentPageMetadata: PageMetadata      // Selected page
  currentPageContent: PageContent        // Selected page content
  // + search, UI state, loading flags
}

interface UserSettings {
  theme: 'light' | 'dark' | 'auto'       // Theme preference
  searchConfig: { ... }                  // Search configuration
  wideScreenLayout: { 
    showFolderPanel: boolean
    metadataCollapsed: boolean
    sidebarWidth: number
    metadataWidth: number
    showMetadataPanel: boolean           // Whether to show metadata panel on wide screens
  }
  narrowScreenLayout: { 
    showFolderPanel: boolean
    metadataCollapsed: boolean
    showMetadataPanel: boolean           // Whether to show metadata panel on narrow screens
  }
  expandedFolderPaths: string[]          // PERSISTENT: Which folders are expanded
}
```

**USER SETTINGS CONSOLIDATION**:
- **Removed duplication** between useUserSettings and globalState
- **Eliminated dead entries** like companyName/wikiTitle (now in adminSettings)
- **Simplified UserSettings** to only user-specific preferences
- **Automatic persistence** through globalState observers
- **Device-aware storage** with unified device key generation

---

### 3. SIMPLIFIED USER SETTINGS HOOK
**Location**: `src/useUserSettings.ts`
**Pattern**: Thin wrapper around globalState for user settings management

```typescript
// Now works with globalState instead of local state
const { settings, userInfo, updateSetting } = useUserSettings(semanticApi)

// Updates go directly to global state
updateSetting('searchConfig', { titles: true, tags: false, content: false })

// Automatic persistence handled by globalState
// No duplication of device key logic or storage management
```

**SIMPLIFIED ARCHITECTURE**:
- **No local state** - everything goes through globalState
- **Automatic persistence** - handled by StatePersistenceManager
- **No duplication** - single source of truth for all settings
- **Clean interface** - same API, better implementation

---

### 4. FOLDER TREE HORIZONTAL SCROLLING SYSTEM
**Location**: `src/FolderTree.tsx`
**Pattern**: Intelligent text positioning with hover-responsive scrolling

```typescript
// Container is 200px wider than visible area to prevent scroll gaps
width: 'calc(100% + 200px)'

// Smart scrolling logic:
// 1. On row hover - check if ANY row is too wide, scroll to show icons
// 2. On drag hover - scroll to show the specific folder name being hovered
// 3. Reset to natural position when all content fits
```

**SCROLLING BEHAVIOR**:
- **Hover-responsive** - automatically positions content based on what user is looking at
- **Drag-aware** - shows folder names during drag operations AND syncs during actual drag
- **Gap prevention** - extra 200px prevents visual gaps during horizontal translation
- **Hidden scrollbars** - clean appearance across browsers

**Key Functions**:
- `handleRowHover()` - measures content width and positions for optimal visibility
- `handleDragEnter()` - CALLS handleRowHover() to sync scrolling behavior during drag
- Container uses invisible overlay buttons that float at right edge regardless of scroll

**DRAG SYNC FIX**: `handleDragEnter()` now calls `handleRowHover()` to ensure container scrolling works identically during drag operations as normal hover.

---

### 5. FLOATING UI BUTTON SYSTEM
**Location**: `src/FolderTree.tsx`
**Pattern**: Invisible overlay with intelligent positioning

```typescript
// Floating overlay positioned relative to target row
<Box ref={buttonOverlayRef} sx={{ position: 'absolute', zIndex: 20 }}>
  // Buttons positioned at right edge, track Y position only
</Box>

// Position calculation
const topOffset = rowRect.top - containerRect.top
overlay.style.top = `${topOffset}px`
```

**BUTTON BEHAVIOR**:
- **Y-axis tracking** - follows current page folder or drag hover folder
- **X-axis independent** - always at right edge regardless of horizontal scroll
- **State-aware rendering** - New Page (normal) vs New Folder (during drag)
- **Hover color transitions** - proper CSS transitions on all interactive elements

**HOVER FIX**: Both buttons use identical IconButton structure with `pointerEvents: 'auto'` override for consistent hover behavior and tooltip display.

**DRAG HOVER FIX**: New Folder button includes explicit drag event handlers (`onDragEnter`, `onDragLeave`, `onDragOver`) to provide visual feedback during drag operations, since normal mouse events are suppressed during drag.

---

### 6. ALPHABETICAL SORTING SYSTEM
**Location**: `src/pageTreeUtils.ts`
**Pattern**: Simple alphabetical sorting with files before folders

```typescript
// Pages sorted by title within folders, not by filename
const sortedPages = sortPagesByDisplayOrder(pageMetadata)

// Results in clean, predictable ordering:
// - home.md (file)
// - welcome.md (file)  
// - documentation/ (folder)
//   - intro.md
//   - basic.md
```

**Key Principles**:
- **Title-based sorting** - uses page.title, not filename
- **Files before folders** - at each level
- **Depth-first traversal** - shallower folders first
- **No complex ordering** - simple, predictable results

---

### 7. DYNAMIC CSS CUSTOM PROPERTIES THEME SYSTEM
**Location**: `src/themeUtils.ts` + `adminSettings.ts`
**Pattern**: Runtime CSS variable updates for complete visual customization

```typescript
// Admin can customize any color/size in real-time
const colorScheme = {
  appBarBackground: '#2979FF',
  foldersFontColor: '#2E2E2E', 
  foldersFontSize: 14,
  h1FontColor: '#2979FF',
  // ... 20+ customizable properties
}

// Applied as CSS custom properties
document.documentElement.style.setProperty('--freeki-app-bar-background', '#2979FF')
document.documentElement.style.setProperty('--freeki-folders-font-color', '#2E2E2E')
```

**Features**:
- **Separate light/dark schemes** - complete theme independence
- **Live preview** - changes apply immediately during editing
- **Granular control** - every UI element is themeable
- **No CSS rebuilding** - runtime variable updates only

---

### 8. COMPONENT ARCHITECTURE PATTERNS

#### App.tsx - Main Orchestrator
- Initializes semantic API
- Manages global state subscriptions  
- Handles all CRUD operations directly (no service layer)
- Responsive layout with collapsible panels

#### FolderTree.tsx - Advanced Tree Visualization
- **Single monolithic component** - contains all tree logic (NOT split into sub-components)
- **Uses global state directly** - no local user settings duplication
- Converts flat pageMetadata to visual tree with virtual folder nodes
- Search filtering with configurable modes (titles, tags, content, author)
- Auto-expansion of parent folders for selected pages
- Enhanced drag/drop with hover-to-expand and visual validation
- Floating button overlay system for contextual actions
- Intelligent horizontal scrolling with hover responsiveness

#### useUserSettings - Simplified Global State Wrapper
- **Thin wrapper** around globalState for user settings
- **No local persistence** - handled automatically by globalState
- **No duplication** - single device key, single storage mechanism
- **Clean API** - same interface, better implementation

---

### 9. RESPONSIVE CHEVRON BUTTON SYSTEM
**Location**: `src/App.tsx` + `src/App.css`
**Pattern**: Multi-tier responsive chevron buttons that adapt to screen size and panel state

```typescript
// Wide screen chevrons - positioned in center content area
<button className={`chevron-button chevron-wide-screen chevron-sidebar-theme ${collapsed ? 'closed' : 'open'}`}>
  {collapsed ? <ChevronRight /> : <ChevronLeft />}
</button>

// Narrow screen chevrons - positioned on panel edges, slide with panels
<button className={`chevron-button chevron-narrow-screen sidebar-chevron chevron-sidebar-theme`}
*/