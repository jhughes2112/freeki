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

### 3. ALPHABETICAL SORTING SYSTEM
**Location**: `src/pageTreeUtils.ts`
**Pattern**: Simple alphabetical sorting with files before folders

```typescript
// Pages are sorted alphabetically by path, files before folders
const sortedPages = sortPagesByDisplayOrder(pageMetadata)

// Results in clean, predictable ordering:
// - home.md (file)
// - welcome.md (file)  
// - documentation/ (folder)
//   - intro.md
//   - basic.md
```

**Key Principles**:
- Simple alphabetical sorting by path
- Files appear before folders at each level
- No complex ordering management needed
- Predictable, consistent results

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

#### FolderTree.tsx - Tree Visualization
- Converts flat pageMetadata to visual tree
- Search filtering with multiple modes  
- Auto-expansion and selection tracking
- Enhanced drag/drop with folder-wide visual feedback
- Bandwidth-efficient updates using returned metadata

#### Semantic Components
- Each component imports `createSemanticApi()` directly
- No intermediate service layers
- Clean separation of concerns

---

## ??? DEVELOPMENT UTILITIES

### Test Data System
**Location**: `src/testData.ts`

- `testPageMetadata[]` - Clean test data for alphabetical sorting
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
- ? Alphabetical sorting across folders
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
- Simple alphabetical sorting across folder hierarchies  
- Runtime theming without CSS rebuilds
- Comprehensive testing without server dependencies

*/

export const API_SUMMARY_VERSION = '2.0.0'
export const LAST_UPDATED = '2024-12-19'

// Export this summary for runtime access
export default {
  version: API_SUMMARY_VERSION,
  lastUpdated: LAST_UPDATED,
  overview: 'Clean semantic API + reactive global state + alphabetical sorting system'
} as ArchitectureSummary