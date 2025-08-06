import apiClient from './apiClient'

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
  foldersSelectedBackground: string;

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
}

const DEFAULT_LIGHT_SCHEME: ColorScheme = {
  appBarBackground: '#2979FF',
  appBarTextColor: '#FFFFFF',
  appBarDivider: 'rgba(255, 255, 255, 0.2)',
  foldersFontColor: '#2E2E2E',
  foldersFontSize: 14,
  foldersBackground: '#F5F5F5',
  foldersSelectedBackground: '#c2d8ff',
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
  rowOddBg: '#eaf3fb'
}

const DEFAULT_DARK_SCHEME: ColorScheme = {
  appBarBackground: '#2979FF',
  appBarTextColor: '#ffffff',
  appBarDivider: 'rgba(0, 0, 0, 0.2)',
  foldersFontColor: '#E0E0E0',
  foldersFontSize: 16,
  foldersBackground: '#1E1E1E',
  foldersSelectedBackground: '#28324E',
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
  rowOddBg: '#202225'
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
  const result: any = Array.isArray(defaults) ? [...defaults] : { ...defaults };
  for (const key in defaults) {
    const fullPath = path ? `${path}.${key}` : key;
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (
        typeof defaults[key] === 'object' && defaults[key] !== null &&
        typeof source[key] === 'object' && source[key] !== null
      ) {
        result[key] = deepMergeDefaults(defaults[key], source[key], fullPath);
      } else {
        result[key] = source[key];
      }
    } else {
      result[key] = defaults[key];
      console.info(`[AdminSettings] Filled missing field from defaults: ${fullPath} =`, defaults[key]);
    }
  }
  return result;
}

export async function fetchAdminSettings(): Promise<AdminSettings | null> {
  const response = await apiClient.get<AdminSettings>('/api/admin/settings')
  
  if (response.success && response.data) {
    // Merge server data with defaults to fill missing fields
    console.info('[AdminSettings] Merging server settings with defaults...');
    return deepMergeDefaults(DEFAULT_ADMIN_SETTINGS, response.data)
  }
  
  // If error is 401 or 403, return null without showing error UI
  if (response.error && (response.error.status === 401 || response.error.status === 403)) {
    console.info('Admin settings not available - insufficient permissions')
    return null
  }
  
  // If error is 404, no settings file exists yet - use defaults without error
  if (response.error && response.error.status === 404) {
    console.info('No admin settings file found - using defaults')
    return DEFAULT_ADMIN_SETTINGS
  }
  
  // For other errors, return defaults (error UI already shown by apiClient)
  return DEFAULT_ADMIN_SETTINGS
}

export async function saveAdminSettings(settings: AdminSettings): Promise<boolean> {
  const response = await apiClient.post<{ success: boolean }>('/api/admin/settings', settings)
  
  if (response.success) {
    return true
  }
  
  // For 401/403, don't show error UI since these are expected permission errors
  if (response.error && (response.error.status === 401 || response.error.status === 403)) {
    console.warn('Admin role required to save settings')
    return false
  }
  
  // Other errors are already handled by apiClient error handler
  return false
}