// FreeKi Client Architecture Summary
// Comprehensive guide to the unique architectural patterns and systems in this codebase

export interface ArchitectureSummary {
  version: string
  lastUpdated: string
  overview: string
}

export const API_SUMMARY_VERSION = '3.2.0'
export const LAST_UPDATED = '2024-12-19'

// Export this summary for runtime access
export default {
  version: API_SUMMARY_VERSION,
  lastUpdated: LAST_UPDATED,
  overview: 'Immediate reactive state + drag-synced scrolling tree + drag-responsive floating UI + runtime theming'
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

### 2. GLOBAL STATE OBSERVER SYSTEM
**Location**: `src/globalState.ts`
**Pattern**: Immediate reactive state with property-path targeting

```typescript
// CRITICAL: No batching, no throttling - immediate updates
globalState.set('currentPageMetadata', pageData)
globalState.set('expandedFolderPaths', ['docs', 'docs/guides'])

// Property path targeting for nested updates
globalState.setProperty('adminSettings.colorSchemes.light.appBarBackground', '#FF0000')

// React hooks with automatic re-renders
const expandedPaths = useGlobalState('expandedFolderPaths') as string[]
const appBarColor = useGlobalState('adminSettings.colorSchemes.light.appBarBackground')
```

**OBSERVER BEHAVIOR**:
- **Immediate notification** - no delays, no batching
- **Property path listeners** - can listen to 'adminSettings' or 'adminSettings.colorSchemes.light'
- **Deep cloning** - immutable state updates
- **Automatic persistence** - expandedFolderPaths auto-saves to localStorage per device

**State Structure**:
```typescript
interface AppState {
  pageMetadata: PageMetadata[]           // Flat server data (source of truth)
  expandedFolderPaths: string[]          // Which folders are expanded
  currentPageMetadata: PageMetadata      // Selected page
  currentPageContent: PageContent        // Selected page content
  adminSettings: AdminSettings           // Theme colors, branding
  // + search, UI state, loading flags
}
```

---

### 3. FOLDER TREE HORIZONTAL SCROLLING SYSTEM
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

### 4. FLOATING UI BUTTON SYSTEM
**Location**: `src/FolderTree.tsx`
**Pattern**: Invisible overlay with intelligent positioning

```typescript
// Floating overlay positioned relative to target row
<Box ref={buttonOverlayRef} sx={{ position: 'absolute', zIndex: 20 }}>
  {}// Buttons positioned at right edge, track Y position only
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

### 5. ALPHABETICAL SORTING SYSTEM
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

### 6. DYNAMIC CSS CUSTOM PROPERTIES THEME SYSTEM
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

### 7. COMPONENT ARCHITECTURE PATTERNS

#### App.tsx - Main Orchestrator
- Initializes semantic API
- Manages global state subscriptions  
- Handles all CRUD operations directly (no service layer)
- Responsive layout with collapsible panels

#### FolderTree.tsx - Advanced Tree Visualization
- **Single monolithic component** - contains all tree logic (NOT split into sub-components)
- Converts flat pageMetadata to visual tree with virtual folder nodes
- Search filtering with configurable modes (titles, tags, content, author)
- Auto-expansion of parent folders for selected pages
- Enhanced drag/drop with hover-to-expand and visual validation
- Floating button overlay system for contextual actions
- Intelligent horizontal scrolling with hover responsiveness

#### useUserSettings - Pure Data Storage
- **Single responsibility** - only saves/loads user preferences to localStorage
- **Device-specific keys** - separate settings per device type and screen resolution
- **No business logic** - just persistent key-value storage
- **Minimal surface** - only settings actually used by the application

---

## DEVELOPMENT UTILITIES

### Test Data System
**Location**: `src/testData.ts`
- `testPageMetadata[]` - Clean test data for alphabetical sorting
- `testPageContent` - Sample content for all test pages
- Used by FakeSemanticApi for realistic testing

---

## KEY ARCHITECTURAL DECISIONS

### What We ELIMINATED:
- Complex HTTP client abstractions
- Multiple API service layers  
- Configuration ceremony
- Network simulation in fake clients
- Redundant React hook wrappers
- Server health detection complexity
- Component over-decomposition (kept FolderTree as single file)

### What We BUILT:
- **Direct semantic function calls** - no intermediate layers
- **Immediate reactive state** - no batching or throttling
- **Intelligent UI positioning** - hover-responsive scrolling and floating elements
- **Device-aware persistence** - separate settings per device type
- **Runtime CSS customization** - complete visual control without rebuilds
- **Comprehensive test data** - realistic testing without server

### Design Philosophy:
> "Every unnecessary line of code is a bug"
> 
> - Minimal abstraction layers
> - Immediate state updates (no async state reconciliation)
> - Simple factory decisions
> - No premature optimization
> - Keep related functionality together (monolithic components when appropriate)

---

## FILE ORGANIZATION

```
src/
├── semanticApiInterface.ts    # Clean API contract
├── realSemanticApi.ts         # Network implementation
├── fakeSemanticApi.ts         # In-memory implementation  
├── semanticApiFactory.ts      # One-line factory
├── globalState.ts             # Immediate reactive state system
├── pageTreeUtils.ts           # Tree building + drag/drop utilities
├── themeUtils.ts              # CSS custom properties system
├── adminSettings.ts           # Color scheme definitions
├── testData.ts                # Comprehensive test data
├── App.tsx                    # Main orchestrator
├── FolderTree.tsx             # Complete tree visualization (monolithic)
├── useUserSettings.ts         # Device-specific localStorage persistence
└── ...other components
```

**CURRENT STATE**:
- Clean semantic API with immediate global state updates
- Advanced folder tree with intelligent scrolling and floating UI
- Complete theme customization with runtime CSS variables
- Device-aware settings persistence
- Comprehensive drag/drop with visual validation
- Zero compilation errors or warnings

This architecture provides a clean, maintainable foundation with unique solutions for:
- **API abstraction** without over-engineering
- **Global state management** with immediate updates and property-path targeting
- **Advanced tree UI** with intelligent scrolling and floating contextual actions
- **Runtime theming** without CSS rebuilds
- **Comprehensive testing** without server dependencies
*/