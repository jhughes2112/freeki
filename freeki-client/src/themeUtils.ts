import type { ColorScheme } from './adminSettings'

// Function to inject global CSS for consistent styling across all MUI components
export function injectGlobalStyles() {
  // Check if styles are already injected
  if (document.getElementById('freeki-global-styles')) {
    return
  }

  const style = document.createElement('style')
  style.id = 'freeki-global-styles'
  style.textContent = `
    /* Apply consistent border radius to all MUI components */
    .MuiTextField-root .MuiOutlinedInput-root,
    .MuiButton-root,
    .MuiPaper-root,
    .MuiDialog-paper,
    .MuiCard-root,
    .MuiChip-root,
    .MuiAlert-root,
    .MuiAutocomplete-paper,
    .MuiMenu-paper,
    .MuiPopover-paper,
    .MuiSnackbar-root .MuiPaper-root,
    .MuiAccordion-root,
    .MuiDrawer-paper,
    .MuiTabs-root .MuiTab-root,
    .MuiAvatar-root,
    .MuiTooltip-tooltip,
    .MuiLinearProgress-root,
    .MuiSkeleton-root {
      border-radius: var(--freeki-border-radius) !important;
    }

    /* Special cases for smaller border radius on small elements */
    .MuiSlider-thumb,
    .MuiCheckbox-root,
    .MuiRadio-root,
    .MuiSwitch-thumb {
      border-radius: calc(var(--freeki-border-radius) * 0.7) !important;
    }

    /* Switch track uses larger border radius for pill shape */
    .MuiSwitch-track {
      border-radius: calc(var(--freeki-border-radius) * 3) !important;
    }

    /* Apply to custom elements with freeki classes */
    .freeki-rounded,
    .freeki-card,
    .freeki-input,
    .freeki-button {
      border-radius: var(--freeki-border-radius);
    }

    /* Consistent shadow for elevated elements using theme variable */
    /* Only apply shadows to elevation1+ Papers that don't have the flat class */
    .MuiPaper-elevation1:not(.freeki-flat),
    .MuiPopover-paper,
    .MuiMenu-paper {
      box-shadow: 0 2px 8px var(--freeki-shadow-color) !important;
    }

    .MuiPaper-elevation2:not(.freeki-flat) {
      box-shadow: 0 4px 12px var(--freeki-shadow-color) !important;
    }

    .MuiPaper-elevation3:not(.freeki-flat) {
      box-shadow: 0 6px 16px var(--freeki-shadow-color) !important;
    }

    /* Enhanced shadows for dialogs and large popups */
    .MuiDialog-paper {
      box-shadow: 0 4px 14px var(--freeki-shadow-color) !important;
    }

    /* Flat papers with no shadow or border */
    .freeki-flat {
      box-shadow: none !important;
      border: none !important;
    }
  `
  document.head.appendChild(style)
}

// Function to apply theme colors to the entire application
export function applyTheme(colorSchemes: { light: ColorScheme; dark: ColorScheme }, currentTheme: 'light' | 'dark' | 'auto') {
  const colorScheme = currentTheme === 'dark' || (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ? colorSchemes.dark
    : colorSchemes.light;

  const root = document.documentElement;

  // Set consistent border radius for the entire application
  root.style.setProperty('--freeki-border-radius', '6px');

  // Inject global styles for consistent theming
  injectGlobalStyles()

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
// USAGE EXAMPLES:
// 
// 1. Use predefined styles:
//    <TextField sx={themeStyles.textField} />
//    <Button sx={themeStyles.button} />
//    <Paper sx={themeStyles.paper} />
//
// 2. Use CSS variables directly:
//    <Box sx={{ borderRadius: 'var(--freeki-border-radius)' }} />
//    <Card sx={{ borderRadius: 'var(--freeki-border-radius)', boxShadow: '0 2px 8px var(--freeki-shadow-color)' }} />
//
// 3. Apply freeki classes in HTML:
//    <div className="freeki-rounded freeki-card">Content</div>
//
// All MUI components will automatically inherit the border radius via global CSS injection
export const themeStyles = {
  appBar: {
    backgroundColor: 'var(--freeki-app-bar-background)',
    color: 'var(--freeki-app-bar-text-color)',
    borderRadius: 'var(--freeki-border-radius)'
  },
  sidebar: {
	  backgroundColor: 'var(--freeki-folders-background)',
    borderColor: 'var(--freeki-border-color)',
    color: 'var(--freeki-folders-font-color)',
    borderRadius: 'var(--freeki-border-radius)'
  },
  sidebarItem: {
    color: 'var(--freeki-folders-font-color)',
    borderRadius: 'var(--freeki-border-radius)',
    '&:hover': {
      filter: 'brightness(95%)'
    },
    '&.selected': {
      backgroundColor: 'var(--freeki-folders-selected-background)'
    }
  },
  viewMode: {
    backgroundColor: 'var(--freeki-view-background)',
    color: 'var(--freeki-p-font-color)',
    borderRadius: 'var(--freeki-border-radius)'
  },
  editMode: {
    backgroundColor: 'var(--freeki-edit-background)',
    color: 'var(--freeki-p-font-color)',
    borderRadius: 'var(--freeki-border-radius)'
  },
  pageDetails: {
    backgroundColor: 'var(--freeki-page-details-background)',
    borderColor: 'var(--freeki-border-color)',
    color: 'var(--freeki-page-details-font-color)',
    borderRadius: 'var(--freeki-border-radius)'
  },
  footer: {
    backgroundColor: 'var(--freeki-footer-background)',
    borderColor: 'var(--freeki-border-color)',
    color: 'var(--freeki-footer-text-color)',
    borderRadius: 'var(--freeki-border-radius)'
  },
  // Common component styles that can be reused throughout the app
  textField: {
    borderRadius: 'var(--freeki-border-radius)',
    '& .MuiOutlinedInput-root': {
      borderRadius: 'var(--freeki-border-radius)',
      borderColor: 'var(--freeki-border-color)'
    }
  },
  button: {
    borderRadius: 'var(--freeki-border-radius)'
  },
  paper: {
    borderRadius: 'var(--freeki-border-radius)',
    boxShadow: '0 2px 8px var(--freeki-shadow-color)'
  },
  card: {
    borderRadius: 'var(--freeki-border-radius)',
    borderColor: 'var(--freeki-border-color)',
    boxShadow: '0 2px 8px var(--freeki-shadow-color)'
  },
  dialog: {
    borderRadius: 'var(--freeki-border-radius)',
    boxShadow: '0 8px 32px var(--freeki-shadow-color)'
  },
  // Flat section for areas that should not have shadows or borders (like General Settings)
  flatSection: {
    borderRadius: 'var(--freeki-border-radius)',
    boxShadow: 'none',
    border: 'none'
  }
}