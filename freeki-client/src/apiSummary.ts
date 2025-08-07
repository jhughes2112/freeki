// FreeKi Client Architecture Summary
// Comprehensive guide to the unique architectural patterns and systems in this codebase

export interface ArchitectureSummary {
  version: string
  lastUpdated: string
  overview: string
}

/*
# FREEKI CLIENT ARCHITECTURE SUMMARY

## ? CORE ARCHITECTURAL PATTERNS

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
- `semanticApiFactory.ts` - One-line decision (no server detection)

**Benefits**:
- ? Direct function calls matching server handlers
- ? No configuration ceremony or network abstractions
- ? Easy testing with fake implementation
- ? Zero unnecessary layers

---

### 2. GLOBAL STATE OBSERVER SYSTEM
**Location**: `src/globalState.ts`
**Pattern**: Simple reactive state with property-path listeners

```typescript
// Set state anywhere
globalState.set('currentPageMetadata', pageData)
globalState.set('adminSettings.colorSchemes.light.appBarBackground', '#FF0000')

// React to changes in components
const currentPage = useGlobalState('currentPageMetadata')
const appBarColor = useGlobalState('adminSettings.colorSchemes.light.appBarBackground')
```

**Key Features**:
- Property path targeting (e.g., 'adminSettings.wikiTitle')
- Immediate updates (no batching/throttling)
- Deep cloning for immutability
- TypeScript-safe with AppState interface
- Simple listener pattern for React hooks

**State Structure**:
```typescript
interface AppState {
  adminSettings: AdminSettings           // Company branding, color schemes
  currentUser: UserInfo | null          // Auth and user profile
  pageMetadata: PageMetadata[]          // All pages (flat list from server)
  currentPageMetadata: PageMetadata     // Selected page metadata
  currentPageContent: PageContent       // Selected page content (loaded separately)
  isEditing: boolean                    // Edit mode state
  searchQuery: string                   // Current search
  searchResults: PageMetadata[]         // Search results
  theme: 'light' | 'dark' | 'auto'     // Theme selection
  // + loading states and UI flags
}
```

---

### 3. FLATTENED SORTORDER SYSTEM
**Location**: `src/pageTreeUtils.ts` + test data
**Pattern**: Global sortOrder maintains sequence across all folder depths

```typescript
// Server sends flat list with sortOrder values
const pages = [
  { pageId: 'welcome', path: 'welcome.md', sortOrder: 1.0 },
  { pageId: 'api-start', path: 'docs/api/start.md', sortOrder: 1.5 },
  { pageId: 'overview', path: 'overview.md', sortOrder: 2.0 },
  { pageId: 'api-ref', path: 'docs/api/reference.md', sortOrder: 3.0 }
]

// UI displays in global sortOrder regardless of folder structure:
// 1.0 Welcome (root)
// 1.5 API Getting Started (docs/api/)
// 2.0 Overview (root) 
// 3.0 API Reference (docs/api/)
```

**Key Principles**:
- sortOrder is GLOBAL across all pages
- Tree structure is visual only (folders derived from paths)
- Drag & drop updates sortOrder to maintain sequence
- Prevents traditional "folder then contents" ordering issues

**Test Data**: `testData.ts` contains comprehensive sortOrder test cases:
- Decimal values (1.1, 1.5, 2.5)
- Large values (2024.01 for dates)
- Edge cases (negative, zero, 999.9)
- Complex nesting scenarios

---

### 4. DYNAMIC CSS CUSTOM PROPERTIES THEME SYSTEM
**Location**: `src/themeService.ts` + `adminSettings.ts`
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

**CSS Usage**:
```css
.app-bar {
  background-color: var(--freeki-app-bar-background);
  color: var(--freeki-app-bar-text-color);
}

.folder-tree {
  color: var(--freeki-folders-font-color);
  font-size: var(--freeki-folders-font-size);
}
```

**Features**:
- Separate light/dark schemes
- Live preview during editing
- Granular control over every UI element
- No CSS rebuilding required

---

### 5. COMPONENT ARCHITECTURE PATTERNS

#### App.tsx - Main Orchestrator
- Initializes semantic API
- Manages global state subscriptions
- Handles all CRUD operations directly (no service layer)
- Responsive layout with collapsible panels

#### FolderTree.tsx - Tree Visualization + Drag/Drop
- Converts flat pageMetadata to visual tree
- Implements drag & drop with sortOrder recalculation
- Search filtering with multiple modes
- Auto-expansion and selection tracking

#### Semantic Components
- Each component imports `createSemanticApi()` directly
- No intermediate service layers
- Clean separation of concerns

---

## ??? DEVELOPMENT UTILITIES

### Test Data System
**Location**: `src/testData.ts`

- `testPageMetadata[]` - Comprehensive sortOrder test cases
- `testPageContent` - Sample content for all test pages
- Used by FakeSemanticApi for realistic testing

---

## ?? KEY ARCHITECTURAL DECISIONS

### What We ELIMINATED:
- ? Complex HTTP client abstractions
- ? Multiple API service layers  
- ? Configuration ceremony
- ? Network simulation in fake clients
- ? Redundant React hook wrappers
- ? Server health detection complexity

### What We BUILT:
- ? Direct semantic function calls
- ? Clean real/fake implementations
- ? Hardcoded auth (no configuration)
- ? Global reactive state system
- ? Flattened sortOrder across folders
- ? Runtime CSS customization
- ? Comprehensive test data

### Design Philosophy:
> "Every unnecessary line of code is a bug"
> 
> - Minimal abstraction layers
> - Direct mapping to server handlers
> - Immediate state updates
> - Simple factory decisions
> - No premature optimization

---

## ?? FILE ORGANIZATION

```
src/
??? semanticApiInterface.ts    # Clean API contract
??? realSemanticApi.ts         # Network implementation
??? fakeSemanticApi.ts         # In-memory implementation  
??? semanticApiFactory.ts      # One-line factory
??? globalState.ts             # Reactive state system
??? pageTreeUtils.ts           # Tree building + drag/drop
??? themeService.ts            # CSS custom properties
??? adminSettings.ts           # Color scheme definitions
??? testData.ts                # Comprehensive test data
??? App.tsx                    # Main orchestrator
??? FolderTree.tsx             # Tree visualization
??? useUserSettings.ts         # Local storage + user prefs
??? ...other components
```

This architecture provides a clean, maintainable foundation with unique solutions for:
- API abstraction without over-engineering
- Global state management without complexity
- Flexible visual ordering across folder hierarchies  
- Runtime theming without CSS rebuilds
- Comprehensive testing without server dependencies

*/

export const API_SUMMARY_VERSION = '2.0.0'
export const LAST_UPDATED = '2024-12-19'

// Export this summary for runtime access
export default {
  version: API_SUMMARY_VERSION,
  lastUpdated: LAST_UPDATED,
  overview: 'Clean semantic API + reactive global state + flattened sortOrder system'
} as ArchitectureSummary