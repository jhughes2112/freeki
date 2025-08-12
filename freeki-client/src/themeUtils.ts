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
    /* Apply consistent border radius - use higher specificity selectors instead of !important */
    html body .MuiTextField-root .MuiOutlinedInput-root,
    html body .MuiButton-root,
    html body .MuiPaper-root,
    html body .MuiDialog-paper,
    html body .MuiCard-root,
    html body .MuiChip-root,
    html body .MuiAlert-root,
    html body .MuiAutocomplete-paper,
    html body .MuiMenu-paper,
    html body .MuiPopover-paper,
    html body .MuiSnackbar-root .MuiPaper-root,
    html body .MuiAccordion-root,
    html body .MuiDrawer-paper,
    html body .MuiTabs-root .MuiTab-root,
    html body .MuiAvatar-root,
    html body .MuiTooltip-tooltip,
    html body .MuiLinearProgress-root,
    html body .MuiSkeleton-root {
      border-radius: var(--freeki-border-radius);
    }

    /* Special cases for smaller border radius on small elements */
    html body .MuiSlider-thumb,
    html body .MuiCheckbox-root,
    html body .MuiRadio-root,
    html body .MuiSwitch-thumb {
      border-radius: calc(var(--freeki-border-radius) * 0.7);
    }

    /* Switch track uses larger border radius for pill shape */
    html body .MuiSwitch-track {
      border-radius: calc(var(--freeki-border-radius) * 3);
    }

    /* Apply to custom elements with freeki classes */
    .freeki-rounded,
    .freeki-card,
    .freeki-input,
    .freeki-button {
      border-radius: var(--freeki-border-radius);
    }

    /* Consistent shadow for elevated elements - higher specificity beats MUI defaults */
    html body .MuiPaper-elevation1:not(.freeki-flat),
    html body .MuiPopover-paper,
    html body .MuiMenu-paper {
      box-shadow: 0 2px 8px var(--freeki-shadow-color);
    }

    html body .MuiPaper-elevation2:not(.freeki-flat) {
      box-shadow: 0 4px 12px var(--freeki-shadow-color);
    }

    html body .MuiPaper-elevation3:not(.freeki-flat) {
      box-shadow: 0 6px 16px var(--freeki-shadow-color);
    }

    html body .MuiDialog-paper {
      box-shadow: 0 8px 32px var(--freeki-shadow-color);
    }

    /* Enhanced tooltip styling */
    html body .MuiTooltip-tooltip {
      background-color: var(--freeki-app-bar-background);
      color: var(--freeki-app-bar-text-color);
      font-size: 0.75rem;
      font-weight: 500;
      padding: 8px 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      backdrop-filter: blur(8px);
      border: 1px solid var(--freeki-app-bar-divider);
      max-width: 300px;
    }

    html body .MuiTooltip-arrow {
      color: var(--freeki-app-bar-background);
    }

    /* Flat papers with no shadow or border */
    .freeki-flat {
      box-shadow: none;
      border: none;
    }

    /* Page content typography styling - scope to content class for higher specificity */
    .freeki-page-content {
      margin-left: 2vw;
      margin-right: 2vw;
      padding-left: 0;
      padding-right: 0;
      /* Remove max-width so content can expand */
      /* max-width: unset; */
    }
    .freeki-page-content .ProseMirror {
      white-space: pre-wrap;
    }
    .freeki-page-content h1 {
      color: var(--freeki-h1-font-color);
      font-size: var(--freeki-h1-font-size);
      text-align: center;
    }
    .freeki-page-content h2 {
      color: var(--freeki-h2-font-color);
      font-size: var(--freeki-h2-font-size);
      text-align: left;
    }
    .freeki-page-content h3 {
      color: var(--freeki-h3-font-color);
      font-size: var(--freeki-h3-font-size);
      text-align: left;
    }
    .freeki-page-content p {
      color: var(--freeki-p-font-color);
      font-size: var(--freeki-p-font-size);
    }
    .freeki-page-content li {
      color: var(--freeki-p-font-color);
      font-size: var(--freeki-p-font-size);
    }

    /* Search field styling - specific selectors beat MUI defaults */
    html body .freeki-folder-search .MuiTextField-root .MuiOutlinedInput-root {
      background-color: var(--freeki-folders-background);
      color: var(--freeki-folders-font-color);
    }

    html body .MuiTextField-root .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline {
      border-color: var(--freeki-border-color);
    }

    html body .MuiTextField-root .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
      border-color: var(--freeki-primary);
    }

    html body .MuiTextField-root .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
      border-color: var(--freeki-primary);
    }

    html body .MuiTextField-root .MuiOutlinedInput-input {
      color: var(--freeki-folders-font-color);
    }

    html body .MuiTextField-root .MuiOutlinedInput-input::placeholder {
      opacity: 0.6;
    }

    /* Fix invisible clear button and other icons in search field */
    html body .MuiTextField-root .MuiIconButton-root {
      color: var(--freeki-folders-font-color);
    }

    html body .MuiTextField-root .MuiIconButton-root:hover {
      color: var(--freeki-primary);
      background-color: rgba(var(--freeki-primary-rgb), 0.1);
    }

    /* Hover highlighting for folder tree navigation */
    html body .MuiListItem-root:hover:not(.Mui-selected) {
      background-color: var(--freeki-hover-background, rgba(var(--freeki-primary-rgb), 0.08));
    }
    
    html body .MuiListItem-root:hover {
      background-color: var(--freeki-hover-background, rgba(var(--freeki-primary-rgb), 0.12));
      transition: background-color 0.15s ease;
    }
    
    html body .MuiListItem-root.Mui-selected {
      background-color: var(--freeki-folders-selected-background);
    }
    
    html body .MuiListItem-root.Mui-selected:hover {
      background-color: var(--freeki-folders-selected-background);
      filter: brightness(1.05);
    }

    /* Chevron button styling - scoped to specific buttons */
    html body .chevron-button {
      border: 1px solid var(--freeki-border-color);
      border-radius: var(--freeki-border-radius);
    }

    html body .chevron-button.chevron-sidebar-theme,
    html body .chevron-button.sidebar-chevron {
      border-color: var(--freeki-border-color);
    }

    html body .chevron-button.chevron-metadata-theme,
    html body .chevron-button.metadata-chevron {
      border-color: var(--freeki-border-color);
    }

    /* Search pip button styling - attribute selector has high specificity */
    html body .MuiIconButton-root[aria-label="Search configuration"] {
      padding: 0;
      background-color: var(--freeki-border-color);
      border: 1px solid var(--freeki-border-color);
      border-radius: var(--freeki-border-radius);
    }

    html body .MuiIconButton-root[aria-label="Search configuration"]:hover {
      background-color: var(--freeki-border-color);
      filter: brightness(95%);
    }

    /* Set font size for sidebar and metadata panels so all text inside inherits the correct size */
    .sidebar-panel {
      font-size: var(--freeki-folders-font-size);
    }
    .metadata-panel {
      font-size: var(--freeki-page-details-font-size);
    }

    /* Admin panel text fields: use admin-specific font and background color, and fixed font size */
    .admin-panel .MuiTextField-root .MuiOutlinedInput-root,
    .admin-theme .MuiTextField-root .MuiOutlinedInput-root {
      background-color: var(--freeki-admin-textfield-bg, #fffbe7);
      color: var(--freeki-admin-textfield-font, #b71c1c);
      font-size: 15px;
    }
    .admin-panel .MuiTextField-root .MuiOutlinedInput-input,
    .admin-theme .MuiTextField-root .MuiOutlinedInput-input {
      color: var(--freeki-admin-textfield-font, #b71c1c);
      font-size: 15px;
    }
    .admin-panel .MuiTextField-root .MuiOutlinedInput-input::placeholder,
    .admin-theme .MuiTextField-root .MuiOutlinedInput-input::placeholder {
      color: var(--freeki-admin-textfield-font, #b71c1c);
      opacity: 0.7;
      font-size: 15px;
    }

    /* Force font size for all Typography in sidebar and metadata panels, override MUI's .MuiTypography-root */
    .sidebar-panel .MuiTypography-root {
      font-size: var(--freeki-folders-font-size) !important;
    }
    .metadata-panel .MuiTypography-root {
      font-size: var(--freeki-page-details-font-size) !important;
    }

    /* Tag button styling for better visibility, especially in dark mode */
    html body .MuiChip-root {
      background-color: var(--freeki-tag-bg, #e3ecfa);
      border: 1px solid var(--freeki-input-border, #b0c4de);
      color: var(--freeki-tag-color, inherit);
      border-radius: var(--freeki-border-radius);
      font-weight: 500;
      transition: background-color 0.15s, border-color 0.15s;
    }
    html body .MuiChip-root .MuiChip-label {
      color: var(--freeki-tag-color, inherit);
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

  // Set body and html background color to match viewBackground for seamless dark/light mode
  document.body.style.backgroundColor = colorScheme.viewBackground || '#ffffff';
  document.documentElement.style.backgroundColor = colorScheme.viewBackground || '#ffffff';

  // Set toolbar icon color from theme (required, do not check existence)
  root.style.setProperty('--freeki-toolbar-icon-color', colorScheme.toolbarIconColor);

  // Use direct color values, fallback to hardcoded if missing
  root.style.setProperty('--freeki-app-bar-background', colorScheme.appBarBackground || '#1976d2');
  root.style.setProperty('--freeki-app-bar-text-color', colorScheme.appBarTextColor || '#ffffff');
  root.style.setProperty('--freeki-app-bar-divider', colorScheme.appBarDivider || 'rgba(255, 255, 255, 0.2)');
  root.style.setProperty('--freeki-folders-font-color', colorScheme.foldersFontColor || '#222222');
  root.style.setProperty('--freeki-folders-font-size', (colorScheme.foldersFontSize || 12) + 'px');
  root.style.setProperty('--freeki-folders-background', colorScheme.foldersBackground || '#fafafa');
  root.style.setProperty('--freeki-page-details-font-color', colorScheme.pageDetailsFontColor || '#222222');
  root.style.setProperty('--freeki-page-details-font-size', (colorScheme.pageDetailsFontSize || 12) + 'px');
  root.style.setProperty('--freeki-page-details-background', colorScheme.pageDetailsBackground || '#f9f9f9');
	root.style.setProperty('--freeki-selection-background', colorScheme.selectionBackground || '#d5e9fb');
  // Derived backgrounds for details, tags, and revision blocks
  // Light theme defaults
  if (currentTheme === 'dark' || (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    // Dark theme
    root.style.setProperty('--freeki-details-block-bg', colorScheme.detailsBlockBackground || '#23272b'); // slightly lighter than main bg
    root.style.setProperty('--freeki-tags-block-bg', colorScheme.tagsBlockBackground || '#26324a'); // deep blue-gray, button-like
    root.style.setProperty('--freeki-revision-block-bg', colorScheme.revisionBlockBackground || '#2a2320'); // muted warm gray
  } else {
    // Light theme
    root.style.setProperty('--freeki-details-block-bg', colorScheme.detailsBlockBackground || '#f2f6fa'); // soft gray-blue
    root.style.setProperty('--freeki-tags-block-bg', colorScheme.tagsBlockBackground || '#e3ecfa'); // filtered 0.8 of #f7fafd, button-like
    root.style.setProperty('--freeki-revision-block-bg', colorScheme.revisionBlockBackground || '#fff9e3'); // gentle pale yellow
  }
  root.style.setProperty('--freeki-h1-font-color', colorScheme.h1FontColor || '#222222');
  root.style.setProperty('--freeki-h1-font-size', (colorScheme.h1FontSize || 32) + 'px');
  root.style.setProperty('--freeki-h2-font-color', colorScheme.h2FontColor || '#333333');
  root.style.setProperty('--freeki-h2-font-size', (colorScheme.h2FontSize || 24) + 'px');
  root.style.setProperty('--freeki-h3-font-color', colorScheme.h3FontColor || '#444444');
  root.style.setProperty('--freeki-h3-font-size', (colorScheme.h3FontSize || 20) + 'px');
  root.style.setProperty('--freeki-p-font-color', colorScheme.pFontColor || '#000000');
  root.style.setProperty('--freeki-p-font-size', (colorScheme.pFontSize || 14) + 'px');
  root.style.setProperty('--freeki-view-background', colorScheme.viewBackground || '#ffffff');
  root.style.setProperty('--freeki-edit-background', colorScheme.editBackground || '#ffffff');
  root.style.setProperty('--freeki-footer-background', colorScheme.footerBackground || '#fafafa');
  root.style.setProperty('--freeki-footer-text-color', colorScheme.footerTextColor || '#666666');
  root.style.setProperty('--freeki-border-color', colorScheme.borderColor || '#e0e0e0');
  root.style.setProperty('--freeki-shadow-color', colorScheme.shadowColor || '#22222233');

  // DRAG AND DROP: Set primary color for drag indicators
  const primaryColor = colorScheme.appBarBackground || '#1976d2';
  root.style.setProperty('--freeki-primary', primaryColor);
  
  // Extract RGB values from hex color for use with rgba()
  const hexToRgb = (hex: string): string => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  };
  
  root.style.setProperty('--freeki-primary-rgb', hexToRgb(primaryColor));
  
  // Add the new color properties
  root.style.setProperty('--freeki-style-row-font-color', colorScheme.styleRowFontColor || '#222c36');
  root.style.setProperty('--freeki-slider-mark-color', colorScheme.sliderMarkColor || '#7da4c7');
  root.style.setProperty('--freeki-slider-thumb-outline', colorScheme.sliderThumbOutline || '#b0c4de');
  root.style.setProperty('--freeki-style-box-bg', colorScheme.styleBoxBg || '#eaf3fb');
  root.style.setProperty('--freeki-input-border', colorScheme.inputBorder || '#b0c4de');
  root.style.setProperty('--freeki-row-even-bg', colorScheme.rowEvenBg || '#f7fafd');
  root.style.setProperty('--freeki-row-odd-bg', colorScheme.rowOddBg || '#eaf3fb');
  root.style.setProperty('--freeki-revision-list-background', colorScheme.revisionListBackground || '#f0f6ff'); // NEW
  root.style.setProperty('--freeki-hover-background', colorScheme.hoverBackground || '#e3ecfa'); // NEW
  // Tag button background and color for visibility
  root.style.setProperty('--freeki-tag-bg', colorScheme.tagBackground || (currentTheme === 'dark' ? '#313a4a' : '#e3ecfa'));
  root.style.setProperty('--freeki-tag-color', colorScheme.tagColor || (currentTheme === 'dark' ? '#e0e0e0' : '#26324a'));

  // Admin panel text field colors (set dynamically by theme)
  if (currentTheme === 'dark' || (currentTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.style.setProperty('--freeki-admin-textfield-bg', '#23272b'); // dark gray
    root.style.setProperty('--freeki-admin-textfield-font', '#f0f2f4'); // near white
  } else {
    root.style.setProperty('--freeki-admin-textfield-bg', '#ffffff'); // white for light mode
    root.style.setProperty('--freeki-admin-textfield-font', '#222c36'); // deep blue-gray
  }
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
    selectionBackground: computedStyle.getPropertyValue('--freeki-selection-background').trim(),
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
    shadowColor: computedStyle.getPropertyValue('--freeki-shadow-color').trim(),
    styleRowFontColor: computedStyle.getPropertyValue('--freeki-style-row-font-color').trim(),
    sliderMarkColor: computedStyle.getPropertyValue('--freeki-slider-mark-color').trim(),
    sliderThumbOutline: computedStyle.getPropertyValue('--freeki-slider-thumb-outline').trim(),
    styleBoxBg: computedStyle.getPropertyValue('--freeki-style-box-bg').trim(),
    inputBorder: computedStyle.getPropertyValue('--freeki-input-border').trim(),
    rowEvenBg: computedStyle.getPropertyValue('--freeki-row-even-bg').trim(),
    rowOddBg: computedStyle.getPropertyValue('--freeki-row-odd-bg').trim(),
    revisionListBackground: computedStyle.getPropertyValue('--freeki-revision-list-background').trim() // NEW
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
//    <div className="freeki-button">Button</div>
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
      backgroundColor: 'var(--freeki-selection-background)',
      filter: 'brightness(95%)'
    },
    '&.selected': {
      backgroundColor: 'var(--freeki-selection-background)'
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