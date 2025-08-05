import type { ColorScheme } from './adminSettings'

// Function to apply theme colors to the entire application
export function applyTheme(colorSchemes: { light: ColorScheme; dark: ColorScheme }, currentTheme: 'light' | 'dark' | 'auto') {
  const colorScheme = currentTheme === 'dark' || (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ? colorSchemes.dark
    : colorSchemes.light;

  const root = document.documentElement;

  // Use direct color values, fallback to hardcoded if missing
  root.style.setProperty('--freeki-app-bar-background', colorScheme.appBarBackground || '#1976d2');
  root.style.setProperty('--freeki-app-bar-text-color', colorScheme.appBarTextColor || '#ffffff');
  root.style.setProperty('--freeki-app-bar-divider', colorScheme.appBarDivider || 'rgba(255, 255, 255, 0.2)');
  root.style.setProperty('--freeki-folders-font-color', colorScheme.foldersFontColor || '#222222');
  root.style.setProperty('--freeki-folders-font-size', (colorScheme.foldersFontSize || 16) + 'px');
  root.style.setProperty('--freeki-folders-background', colorScheme.foldersBackground || '#fafafa');
  root.style.setProperty('--freeki-page-details-font-color', colorScheme.pageDetailsFontColor || '#222222');
  root.style.setProperty('--freeki-page-details-font-size', (colorScheme.pageDetailsFontSize || 16) + 'px');
  root.style.setProperty('--freeki-page-details-background', colorScheme.pageDetailsBackground || '#f9f9f9');
  root.style.setProperty('--freeki-folders-selected-background', colorScheme.foldersSelectedBackground || '#e3f2fd');
  root.style.setProperty('--freeki-h1-font-color', colorScheme.h1FontColor || '#222222');
  root.style.setProperty('--freeki-h1-font-size', (colorScheme.h1FontSize || 32) + 'px');
  root.style.setProperty('--freeki-h2-font-color', colorScheme.h2FontColor || '#333333');
  root.style.setProperty('--freeki-h2-font-size', (colorScheme.h2FontSize || 24) + 'px');
  root.style.setProperty('--freeki-h3-font-color', colorScheme.h3FontColor || '#444444');
  root.style.setProperty('--freeki-h3-font-size', (colorScheme.h3FontSize || 20) + 'px');
  root.style.setProperty('--freeki-p-font-color', colorScheme.pFontColor || '#000000');
  root.style.setProperty('--freeki-p-font-size', (colorScheme.pFontSize || 16) + 'px');
  root.style.setProperty('--freeki-view-background', colorScheme.viewBackground || '#ffffff');
  root.style.setProperty('--freeki-edit-background', colorScheme.editBackground || '#ffffff');
  root.style.setProperty('--freeki-footer-background', colorScheme.footerBackground || '#fafafa');
  root.style.setProperty('--freeki-footer-text-color', colorScheme.footerTextColor || '#666666');
  root.style.setProperty('--freeki-border-color', colorScheme.borderColor || '#e0e0e0');
  root.style.setProperty('--freeki-shadow-color', colorScheme.shadowColor || '#22222233');
}

// Get current theme CSS values for real-time preview
export function getCurrentThemeColors(): Record<string, string> {
  const root = document.documentElement
  const computedStyle = window.getComputedStyle(root)
  
  return {
    appBarBackground: computedStyle.getPropertyValue('--freeki-app-bar-background').trim(),
    appBarTextColor: computedStyle.getPropertyValue('--freeki-app-bar-text-color').trim(),
    appBarDivider: computedStyle.getPropertyValue('--freeki-app-bar-divider').trim(),
    foldersFontColor: computedStyle.getPropertyValue('--freeki-folders-font-color').trim(),
    foldersFontSize: computedStyle.getPropertyValue('--freeki-folders-font-size').trim(),
    foldersBackground: computedStyle.getPropertyValue('--freeki-folders-background').trim(),
    foldersSelectedBackground: computedStyle.getPropertyValue('--freeki-folders-selected-background').trim(),
    pageDetailsFontColor: computedStyle.getPropertyValue('--freeki-page-details-font-color').trim(),
    pageDetailsFontSize: computedStyle.getPropertyValue('--freeki-page-details-font-size').trim(),
    pageDetailsBackground: computedStyle.getPropertyValue('--freeki-page-details-background').trim(),
    h1FontColor: computedStyle.getPropertyValue('--freeki-h1-font-color').trim(),
    h1FontSize: computedStyle.getPropertyValue('--freeki-h1-font-size').trim(),
    h2FontColor: computedStyle.getPropertyValue('--freeki-h2-font-color').trim(),
    h2FontSize: computedStyle.getPropertyValue('--freeki-h2-font-size').trim(),
    h3FontColor: computedStyle.getPropertyValue('--freeki-h3-font-color').trim(),
    h3FontSize: computedStyle.getPropertyValue('--freeki-h3-font-size').trim(),
    pFontColor: computedStyle.getPropertyValue('--freeki-p-font-color').trim(),
    pFontSize: computedStyle.getPropertyValue('--freeki-p-font-size').trim(),
    viewBackground: computedStyle.getPropertyValue('--freeki-view-background').trim(),
    editBackground: computedStyle.getPropertyValue('--freeki-edit-background').trim(),
    footerBackground: computedStyle.getPropertyValue('--freeki-footer-background').trim(),
    footerTextColor: computedStyle.getPropertyValue('--freeki-footer-text-color').trim(),
    borderColor: computedStyle.getPropertyValue('--freeki-border-color').trim(),
    shadowColor: computedStyle.getPropertyValue('--freeki-shadow-color').trim()
  }
}

// Generate sx styles for MUI components using CSS variables
export const themeStyles = {
  appBar: {
    backgroundColor: 'var(--freeki-app-bar-background)',
    color: 'var(--freeki-app-bar-text-color)'
  },
  sidebar: {
	  backgroundColor: 'var(--freeki-folders-background)',
    borderColor: 'var(--freeki-border-color)',
    color: 'var(--freeki-folders-font-color)'
  },
  sidebarItem: {
    color: 'var(--freeki-folders-font-color)',
    '&:hover': {
      filter: 'brightness(95%)'
    },
    '&.selected': {
      backgroundColor: 'var(--freeki-folders-selected-background)'
    }
  },
  viewMode: {
    backgroundColor: 'var(--freeki-view-background)',
    color: 'var(--freeki-p-font-color)'
  },
  editMode: {
    backgroundColor: 'var(--freeki-edit-background)',
    color: 'var(--freeki-p-font-color)'
  },
  pageDetails: {
    backgroundColor: 'var(--freeki-page-details-background)',
    borderColor: 'var(--freeki-border-color)',
    color: 'var(--freeki-page-details-font-color)'
  },
  footer: {
    backgroundColor: 'var(--freeki-footer-background)',
    borderColor: 'var(--freeki-border-color)',
    color: 'var(--freeki-footer-text-color)'
  }
}