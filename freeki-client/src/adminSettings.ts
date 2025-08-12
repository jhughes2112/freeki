import type { ISemanticApi } from './semanticApiInterface'

export interface AdminSettings {
  companyName: string
  iconUrl: string
  wikiTitle: string
  colorSchemes: {
    light: ColorScheme
    dark: ColorScheme
  }
}

export interface ColorScheme {
  // Header
  appBarBackground: string;
  appBarTextColor: string;
  appBarDivider: string;

  // Folders
  foldersFontColor: string;
  foldersFontSize: number;
  foldersBackground: string;
  selectionBackground: string; // Renamed from foldersSelectedBackground

  // Page view fonts
  h1FontColor: string;
  h1FontSize: number;
  h2FontColor: string;
  h2FontSize: number;
  h3FontColor: string;
  h3FontSize: number;
  pFontColor: string;
  pFontSize: number;

  // Page backgrounds
  viewBackground: string;
  editBackground: string;

  // Page details
  pageDetailsBackground: string;
  pageDetailsFontColor: string;
  pageDetailsFontSize: number;

  // Derived backgrounds for details, tags, and revision blocks
  detailsBlockBackground: string;
  tagsBlockBackground: string;
  revisionBlockBackground: string;

  // Footer
  footerBackground: string;
  footerTextColor: string;
  // Border
  borderColor: string;
  // Shadow
  shadowColor: string;
  // Style row font color
  styleRowFontColor: string;
  // New: slider mark and thumb outline colors
  sliderMarkColor: string;
  sliderThumbOutline: string;
  styleBoxBg: string;
  inputBorder: string;
  rowEvenBg: string;
  rowOddBg: string;
  revisionListBackground: string; // NEW: for revision list background
  hoverBackground: string; // NEW: for hover color
  // New: tag colors
  tagColor: string; // NEW: for tag text color
  tagBackground: string; // NEW: for tag background color
}

const DEFAULT_LIGHT_SCHEME: ColorScheme = {
  appBarBackground: '#2979FF',
  appBarTextColor: '#FFFFFF',
  appBarDivider: 'rgba(255, 255, 255, 0.2)',
  foldersFontColor: '#2E2E2E',
  foldersFontSize: 14,
  foldersBackground: '#F5F5F5',
  selectionBackground: '#c2d8ff',
  h1FontColor: '#2979FF',
  h1FontSize: 32,
  h2FontColor: '#1E88E5',
  h2FontSize: 24,
  h3FontColor: '#1565C0',
  h3FontSize: 20,
  pFontColor: '#212121',
  pFontSize: 16,
  viewBackground: '#FAFAFA',
  editBackground: '#FFFDE7',
  pageDetailsBackground: '#ffffff',
  pageDetailsFontColor: '#333333',
  pageDetailsFontSize: 14,
  detailsBlockBackground: '#f2f6fa', // soft gray-blue
  tagsBlockBackground: '#e3ecfa',    // filtered 0.8 of #f7fafd, button-like
  revisionBlockBackground: '#fff9e3',// gentle pale yellow
  footerBackground: '#ECECEC',
  footerTextColor: '#606060',
  borderColor: '#D1D5DB',
  shadowColor: '#0000001F',
  styleRowFontColor: '#222c36',
  sliderMarkColor: '#7da4c7',
  sliderThumbOutline: '#b0c4de',
  styleBoxBg: '#eaf3fb',
  inputBorder: '#b0c4de',
  rowEvenBg: '#f7fafd',
  rowOddBg: '#eaf3fb',
  revisionListBackground: '#f0f6ff', // NEW: default for revision list
  hoverBackground: '#e3ecfa', // NEW: default hover for light theme (matches tags block bg)
  tagColor: '#26324a', // NEW: default tag text color (dark)
  tagBackground: '#e3ecfa', // NEW: default tag background (matches tags block bg)
}

const DEFAULT_DARK_SCHEME: ColorScheme = {
  appBarBackground: '#2979FF',
  appBarTextColor: '#ffffff',
  appBarDivider: 'rgba(0, 0, 0, 0.2)',
  foldersFontColor: '#E0E0E0',
  foldersFontSize: 16,
  foldersBackground: '#1E1E1E',
  selectionBackground: '#28324E',
  h1FontColor: '#64B5F6',
  h1FontSize: 32,
  h2FontColor: '#42A5F5',
  h2FontSize: 24,
  h3FontColor: '#2196F3',
  h3FontSize: 20,
  pFontColor: '#E0e0e0',
  pFontSize: 16,
  viewBackground: '#121212',
  editBackground: '#262626',
  pageDetailsBackground: '#2b2b2b',
  pageDetailsFontColor: '#cccccc',
  pageDetailsFontSize: 16,
  detailsBlockBackground: '#23272b', // slightly lighter than main bg
  tagsBlockBackground: '#26324a',    // deep blue-gray, button-like
  revisionBlockBackground: '#2a2320',// muted warm gray
  footerBackground: '#202020',
  footerTextColor: '#A0A0A0',
  borderColor: '#2A2A2A',
  shadowColor: '#FFFFFF19',
  styleRowFontColor: '#e0e0e0',
  sliderMarkColor: '#888',
  sliderThumbOutline: '#888',
  styleBoxBg: '#262b31',
  inputBorder: '#444444',
  rowEvenBg: '#23272b',
  rowOddBg: '#202225',
  revisionListBackground: '#121212', // Assuming a dark background for dark theme
  hoverBackground: '#26324a', // NEW: default hover for dark theme (matches tags block bg)
  tagColor: '#e0e0e0', // NEW: default tag text color (light)
  tagBackground: '#313a4a', // NEW: default tag background (lighter blue-gray)
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  companyName: 'Your Company Here',
  iconUrl: '/assets/freeki-icon.png',
  wikiTitle: 'FreeKi Wiki',
  colorSchemes: {
    light: DEFAULT_LIGHT_SCHEME,
    dark: DEFAULT_DARK_SCHEME
  }
}

function deepMergeDefaults<T>(defaults: T, source: Partial<T>, path: string = ''): T {
  if (typeof defaults !== 'object' || defaults === null) {
    return defaults;
  }

  const result = Array.isArray(defaults) ? [...defaults] as T : { ...defaults };
  
  for (const key in defaults) {
    const fullPath = path ? `${path}.${key}` : key;
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (
        typeof defaults[key] === 'object' && defaults[key] !== null &&
        typeof source[key] === 'object' && source[key] !== null
      ) {
        (result as Record<string, unknown>)[key] = deepMergeDefaults(defaults[key], source[key], fullPath);
      } else {
        (result as Record<string, unknown>)[key] = source[key];
      }
    } else {
      (result as Record<string, unknown>)[key] = defaults[key];
      console.info(`[AdminSettings] Filled missing field from defaults: ${fullPath} =`, defaults[key]);
    }
  }
  return result;
}

export async function fetchAdminSettings(semanticApi: ISemanticApi): Promise<AdminSettings | null> {
  try {
    const settings = await semanticApi.getAdminSettings()
    
    if (settings) {
      // Merge server data with defaults to fill missing fields
      console.info('[AdminSettings] Merging server settings with defaults...');
      return deepMergeDefaults(DEFAULT_ADMIN_SETTINGS, settings)
    }
    
    // Use defaults if no settings found
    console.info('No admin settings found - using defaults')
    return DEFAULT_ADMIN_SETTINGS
  } catch (error) {
    console.warn('Failed to fetch admin settings:', error)
    return DEFAULT_ADMIN_SETTINGS
  }
}

export async function saveAdminSettings(settings: AdminSettings, semanticApi: ISemanticApi): Promise<boolean> {
  try {
    return await semanticApi.saveAdminSettings(settings)
  } catch (error) {
    console.warn('Failed to save admin settings:', error)
    return false
  }
}