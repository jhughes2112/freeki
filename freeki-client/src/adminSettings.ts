import apiClient from './apiClient'

export interface AdminSettings {
  companyName: string
  companyLogoPath: string
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
}

const DEFAULT_LIGHT_SCHEME: ColorScheme = {
  appBarBackground: '#1976d2',
  appBarTextColor: '#ffffff',
  appBarDivider: 'rgba(255, 255, 255, 0.2)',
  foldersFontColor: '#222222',
  foldersFontSize: 16,
  foldersBackground: '#fafafa',
  foldersSelectedBackground: '#e3f2fd',
  h1FontColor: '#222222',
  h1FontSize: 32,
  h2FontColor: '#333333',
  h2FontSize: 24,
  h3FontColor: '#444444',
  h3FontSize: 20,
  pFontColor: '#000000',
  pFontSize: 16,
  viewBackground: '#ffffff',
  editBackground: '#ffffff',
  pageDetailsBackground: '#f9f9f9',
  pageDetailsFontColor: '#222222',
  pageDetailsFontSize: 16,
  footerBackground: '#fafafa',
  footerTextColor: '#666666',
  borderColor: '#e0e0e0',
  shadowColor: '#22222233' // solid shadow with alpha for light mode
}

const DEFAULT_DARK_SCHEME: ColorScheme = {
  appBarBackground: '#1565c0',
  appBarTextColor: '#ffffff',
  appBarDivider: 'rgba(0, 0, 0, 0.2)',
  foldersFontColor: '#eeeeee',
  foldersFontSize: 16,
  foldersBackground: '#2b2b2b',
  foldersSelectedBackground: '#263238',
  h1FontColor: '#eeeeee',
  h1FontSize: 32,
  h2FontColor: '#cccccc',
  h2FontSize: 24,
  h3FontColor: '#bbbbbb',
  h3FontSize: 20,
  pFontColor: '#ffffff',
  pFontSize: 16,
  viewBackground: '#121212',
  editBackground: '#1e1e1e',
  pageDetailsBackground: '#1e1e1e',
  pageDetailsFontColor: '#eeeeee',
  pageDetailsFontSize: 16,
  footerBackground: '#2b2b2b',
  footerTextColor: '#b3b3b3',
  borderColor: '#222222',
  shadowColor: '#00000099' // solid shadow with alpha for dark mode
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  companyName: 'Your Company',
  companyLogoPath: '/logo.png',
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

async function fetchAdminSettings(): Promise<AdminSettings | null> {
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

async function saveAdminSettings(settings: AdminSettings): Promise<boolean> {
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

export { fetchAdminSettings, saveAdminSettings }