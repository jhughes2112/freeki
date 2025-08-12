import * as React from 'react';
import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  TextField,
  Typography,
  Grid,
  IconButton,
  Alert,
  Paper,
  Stack,
  Slider,
  Box,
  InputAdornment
} from '@mui/material'
import {
  Close,
  Save,
  Refresh,
  Photo
} from '@mui/icons-material'
import type { ColorScheme } from './adminSettings'
import { DEFAULT_ADMIN_SETTINGS, saveAdminSettings } from './adminSettings'
import { createSemanticApi } from './semanticApiFactory'
import { useGlobalState, globalState } from './globalState'
import AdvancedColorPicker from './AdvancedColorPicker'

// Default style objects for AdminSettingsDialog only
const ADMIN_DIALOG_LIGHT_STYLE = {
  backgroundColor: '#f7fafd', // very light blue-gray
  color: '#222c36',           // deep blue-gray for text
  border: '1px solid #dbe6ee',// soft blue border
  boxShadow: '0 8px 32px #00000055', // Revert to preferred shadow pattern
  borderRadius: 'var(--border-radius)', // Use CSS variable
  headerBg: '#eaf3fb',        // pale blue for header
  headerText: '#222c36',      // deep blue-gray for header text
  inputBg: '#ffffff',         // pure white for inputs
  inputBorder: '#b0c4de',     // light blue border for inputs
  inputBorderHover: '#7da4c7',// medium blue on hover
  paperBg: '#f7fafd',         // match dialog background
  divider: '#dbe6ee',         // soft blue divider
  styleBoxBg: '#eaf3fb',      // light blue for style boxes
  rowEvenBg: '#f7fafd',       // very light for even rows
  rowOddBg: '#eaf3fb'         // slightly deeper for odd rows
};

const ADMIN_DIALOG_DARK_STYLE = {
  backgroundColor: '#1a1d21',   // Darker main background
  color: '#d8d8d8',            // Slightly dimmer text (was #e8e8e8)
  border: '1px solid #3a4047', // Brighter borders 
  boxShadow: '0 8px 32px #ffffff33', // Revert to preferred shadow pattern
  borderRadius: 'var(--border-radius)', // Use CSS variable
  headerBg: '#1f242a',         // Darker header
  headerText: '#f0f2f4',       // Slightly dimmer header text (was #f8f9fa)
  inputBg: '#1a1d21',          // Match main background
  inputBorder: '#4a5057',      // Brighter input borders (was #3a4047)
  inputBorderHover: '#9aa1a9', // Brighter hover state (was #8a9199)
  paperBg: '#1a1d21',          // Match main background
  divider: '#3a4047',          // Brighter divider (was #2a2f35)
  styleBoxBg: '#252a32',       // Brighter style boxes (was #212730)
  rowEvenBg: '#1a1d21',        // Match main background
  rowOddBg: '#1f242a'          // Contrasting odd rows
};

interface AdminSettingsDialogProps {
  open: boolean
  onClose: () => void
  themeMode?: 'light' | 'dark' | 'auto'; // User theme mode for dialog styling
}

// New: Unified SettingRow for all style settings
interface SettingRowProps {
  label: string
  lightValue: string
  darkValue: string
  onLightChange: (value: string) => void
  onDarkChange: (value: string) => void
  fontSize?: number
  onFontSizeChange?: (value: number) => void
  min?: number
  max?: number
}

function resolveMode(themeMode?: 'light' | 'dark' | 'auto'): 'light' | 'dark' {
  if (themeMode === 'light' || themeMode === 'dark') {
    return themeMode;
  }
  // auto or undefined: use browser
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function SettingRow({
  label,
  lightValue,
  darkValue,
  onLightChange,
  onDarkChange,
  fontSize,
  onFontSizeChange,
  min = 10,
  max = 32,
  style,
  mode
}: SettingRowProps & { style: typeof ADMIN_DIALOG_LIGHT_STYLE | typeof ADMIN_DIALOG_DARK_STYLE, mode: 'light' | 'dark' }) {
  const safeLightValue = typeof lightValue === 'string' ? lightValue : '';
  const safeDarkValue = typeof darkValue === 'string' ? darkValue : '';
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: '110px 40px 40px 60px', // narrower label column
      alignItems: 'center',
      py: 0.1,
      px: 0,
      backgroundColor: 'unset',
      '&:nth-of-type(even)': {
        backgroundColor: style.rowEvenBg,
      },
      '&:nth-of-type(odd)': {
        backgroundColor: style.rowOddBg,
      },
      color: style.color,
      gap: 0.5,
      minHeight: 26
    }}>
      <Typography sx={{
        fontSize: '0.8rem',
        minWidth: 0,
        color: style.color,
        fontWeight: 500,
        px: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, mx: 'auto', height: '100%' }}>
        <AdvancedColorPicker
          value={safeLightValue.startsWith('#') ? safeLightValue : '#000000'}
          onChange={onLightChange}
          themeMode={mode}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, mx: 'auto', height: '100%' }}>
        <AdvancedColorPicker
          value={safeDarkValue.startsWith('#') ? safeDarkValue : '#000000'}
          onChange={onDarkChange}
          themeMode={mode}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, mx: 'auto', width: '100%', height: '100%' }}>
        {(fontSize !== undefined && onFontSizeChange) ? (
          <Slider
            value={fontSize}
            min={min}
            max={max}
            step={1}
            marks={[]}
            valueLabelDisplay="auto"
            onChange={(_, value) => onFontSizeChange(value as number)}
            sx={{
              width: '80px',
              color: style.color,
              p: 0,
              mx: 0,
              '& .MuiSlider-thumb': {
                borderRadius: 1,
                width: 18,
                height: 18,
                backgroundColor: style.styleBoxBg,
                boxShadow: '0 2px 8px #00000033',
                border: `2px solid ${style.inputBorder}`,
              },
              '& .MuiSlider-track': {
                backgroundColor: style.color,
                border: 'none',
              },
              '& .MuiSlider-rail': {
                backgroundColor: style.styleBoxBg,
                opacity: 1,
              },
              '& .MuiSlider-markLabel': {
                color: style.color,
                fontSize: '0.75rem',
              },
              '& .MuiSlider-mark': {
                backgroundColor: style.inputBorder,
              }
            }}
          />
        ) : null}
      </Box>
    </Box>
  )
}

function AdminSettingsDialog({ open, onClose, themeMode }: AdminSettingsDialogProps) {
  // Use global state directly - no local state needed
  const adminSettings = useGlobalState('adminSettings')
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const mode = resolveMode(themeMode);
  const style = mode === 'light' ? ADMIN_DIALOG_LIGHT_STYLE : ADMIN_DIALOG_DARK_STYLE;

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const semanticApi = createSemanticApi()
      const result = await saveAdminSettings(adminSettings, semanticApi)
      if (result) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          onClose()
        }, 1500)
      } else {
        setError('Failed to save admin settings - check permissions')
      }
    } catch (error) {
      console.warn('Error saving admin settings:', error)
      setError('Failed to save admin settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    globalState.set('adminSettings', DEFAULT_ADMIN_SETTINGS)
    setError(null)
    setSuccess(false)
  }

  const handleClose = () => {
    setError(null)
    setSuccess(false)
    onClose()
  }

  // Direct property updates to global state for real-time changes
  const updateLightColor = (property: keyof ColorScheme, value: string | number) => {
    globalState.setProperty(`adminSettings.colorSchemes.light.${String(property)}`, value)
  }

  const updateDarkColor = (property: keyof ColorScheme, value: string | number) => {
    globalState.setProperty(`adminSettings.colorSchemes.dark.${String(property)}`, value)
  }

  // New: update font size for both light and dark schemes
  const updateFontSizeBoth = (property: keyof ColorScheme, value: number) => {
    globalState.setProperty(`adminSettings.colorSchemes.light.${String(property)}`, value)
    globalState.setProperty(`adminSettings.colorSchemes.dark.${String(property)}`, value)
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      aria-labelledby="admin-settings-title"
      aria-modal="true"
      role="dialog"
      PaperProps={{
        sx: {
          height: { xs: '95vh', sm: '85vh', md: '80vh' },
          width: { xs: '95vw', sm: '90vw', md: '85vw' },
          maxWidth: { xs: '100%', sm: '800px', md: '900px' },
          backgroundColor: style.backgroundColor,
          color: style.color,
          boxShadow: style.boxShadow,
          border: style.border,
          borderRadius: 'var(--freeki-border-radius)' // Use CSS variable
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'transparent'
        }
      }}
    >
      {/* --- Compact Header --- */}
      <DialogTitle 
        id="admin-settings-title"
        sx={{ 
          backgroundColor: style.headerBg,
          color: style.headerText,
          borderBottom: `1px solid ${style.divider}`,
          py: 1,
          minHeight: 0,
          fontSize: '1.1rem',
          fontWeight: 600,
          mb: 0
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 0 }}>
          <Typography variant="h6" sx={{ color: style.headerText, fontSize: '1.1rem', fontWeight: 600, py: 0, mb: 0 }}>
            Administration Settings
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button 
              aria-label="Reset to defaults" 
              onClick={handleReset} 
              startIcon={<Refresh />} 
              disabled={saving}
              sx={{ 
                color: style.headerText,
                '&:hover': {
                  backgroundColor: style.headerBg
                },
                fontWeight: 500
              }}
            >
              Reset
            </Button>
            <Button 
              aria-label="Save settings" 
              onClick={handleSave} 
              variant="contained" 
              disabled={saving} 
              startIcon={<Save />}
              sx={{
                fontWeight: 600
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <IconButton 
              onClick={handleClose} 
              aria-label="Close settings dialog"
              sx={{ color: style.headerText }}
            >
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ 
        overflow: 'auto',
        backgroundColor: style.paperBg,
        color: style.color,
        p: 0,
      }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} role="status">
            Settings saved successfully!
          </Alert>
        )}
        <Stack spacing={0.5} sx={{ p: 0 }}>
          {/* General Settings */}
          <Paper 
            className="freeki-flat"
            sx={{
              p: 1, // reduced from 2
              backgroundColor: style.paperBg,
              color: style.color,
              mb: 0, // ensure no extra margin
              borderRadius: 'var(--freeki-border-radius)'
            }}>
            <Typography variant="h6" sx={{ mb: 1, color: style.color, fontWeight: 700, letterSpacing: '1px', fontSize: '1rem', py: 0 }}>
              General Settings
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: 2,
                  alignItems: 'stretch',
                  width: '100%'
                }}>
                  <TextField
                    label="Company Name"
                    value={adminSettings.companyName}
                    onChange={(e) => globalState.setProperty('adminSettings.companyName', e.target.value)}
                    size="small"
                    aria-label="Company Name"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'var(--freeki-admin-textfield-bg)',
                        color: 'var(--freeki-admin-textfield-font)',
                        fontWeight: 500,
                        borderRadius: 'var(--freeki-border-radius)',
                        fontSize: '1rem',
                        boxShadow: 'none',
                        '& fieldset': {
                          borderColor: style.inputBorder,
                        },
                        '&:hover fieldset': {
                          borderColor: style.inputBorderHover,
                        }
                      },
                      '& .MuiInputLabel-root': {
                        color: 'var(--freeki-admin-textfield-font)',
                        fontWeight: 400
                      }
                    }}
                  />
                  <TextField
                    label="Wiki Title"
                    value={adminSettings.wikiTitle}
                    onChange={(e) => globalState.setProperty('adminSettings.wikiTitle', e.target.value)}
                    size="small"
                    aria-label="Wiki Title"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'var(--freeki-admin-textfield-bg)',
                        color: 'var(--freeki-admin-textfield-font)',
                        fontWeight: 500,
                        borderRadius: 'var(--freeki-border-radius)',
                        fontSize: '1rem',
                        boxShadow: 'none',
                        '& fieldset': {
                          borderColor: style.inputBorder,
                        },
                        '&:hover fieldset': {
                          borderColor: style.inputBorderHover,
                        }
                      },
                      '& .MuiInputLabel-root': {
                        color: 'var(--freeki-admin-textfield-font)',
                        fontWeight: 400
                      }
                    }}
                  />
                  <TextField
                    label="Icon URL"
                    value={adminSettings.iconUrl}
                    onChange={(e) => globalState.setProperty('adminSettings.iconUrl', e.target.value)}
                    size="small"
                    aria-label="Icon URL"
                    sx={{
                      flex: 2,
                      minWidth: 0,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'var(--freeki-admin-textfield-bg)',
                        color: 'var(--freeki-admin-textfield-font)',
                        fontWeight: 500,
                        borderRadius: 'var(--freeki-border-radius)',
                        fontSize: '1rem',
                        boxShadow: 'none',
                        '& fieldset': {
                          borderColor: style.inputBorder,
                        },
                        '&:hover fieldset': {
                          borderColor: style.inputBorderHover,
                        }
                      },
                      '& .MuiInputLabel-root': {
                        color: 'var(--freeki-admin-textfield-font)',
                        fontWeight: 400
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => {/* TODO: Open media browser */}}
                            aria-label="Browse media files"
                            edge="end"
                            sx={{
                              color: style.headerText,
                              borderRadius: 'var(--freeki-border-radius)',
                              p: 0.5,
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.08)'
                              }
                            }}
                          >
                            <Photo />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>
          {/* Style & Font Settings - Remove border and fix alignment */}
          <Box sx={{
            p: 1, // reduced from 2
            backgroundColor: style.paperBg,
            boxShadow: 'none',
            color: style.color,
            mb: 0
          }}>
            <Typography variant="h6" sx={{ mb: 2, color: style.color, fontWeight: 700, letterSpacing: '1px', fontSize: '1rem', py: 0 }}>
              Style & Font Settings
            </Typography>
            <Box sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              justifyContent: 'center', // Center the style boxes only
              alignItems: 'flex-start',
              width: '100%',
              p: 0,
            }}>
              {/* System Elements */}
				<Paper sx={{ minWidth: 280, maxWidth: 280, flex: '1 1 280px', backgroundColor: style.styleBoxBg, border: `1px solid ${style.inputBorder}`, borderRadius: 2, boxShadow: '0 8px 32px #00000022', p: 1, mb: 0, overflow: 'hidden', color: style.color }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>System Elements</Typography>
                {SYSTEM_ELEMENT_ROWS.map((row) => (
                  <SettingRow
                    key={row.label}
                    label={row.label}
                    lightValue={String(adminSettings.colorSchemes.light[row.light])}
                    darkValue={String(adminSettings.colorSchemes.dark[row.dark])}
                    onLightChange={value => updateLightColor(row.light, value)}
                    onDarkChange={value => updateDarkColor(row.dark, value)}
                    style={style}
                    mode={mode}
                  />
                ))}
              </Paper>
              {/* Typography & Page BGs */}
				<Paper sx={{ minWidth: 280, maxWidth: 280, flex: '1 1 280px', backgroundColor: style.styleBoxBg, border: `1px solid ${style.inputBorder}`, borderRadius: 2, boxShadow: '0 8px 32px #00000022', p: 1, mb: 0, overflow: 'hidden', color: style.color }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>Typography & Page Backgrounds</Typography>
                {TYPOGRAPHY_ROWS.map((row) => {
                  const fontSize = row.fontSize && typeof adminSettings.colorSchemes.light[row.fontSize] === 'number'
                    ? (adminSettings.colorSchemes.light[row.fontSize] as number)
                    : undefined;
                  return (
                    <SettingRow
                      key={row.label}
                      label={row.label}
                      lightValue={String(adminSettings.colorSchemes.light[row.light])}
                      darkValue={String(adminSettings.colorSchemes.dark[row.dark])}
                      onLightChange={value => updateLightColor(row.light, value)}
                      onDarkChange={value => updateDarkColor(row.dark, value)}
                      fontSize={fontSize}
                      onFontSizeChange={row.fontSize && fontSize !== undefined ? (value => updateFontSizeBoth(row.fontSize!, value)) : undefined}
                      style={style}
                      mode={mode}
                    />
                  );
                })}
              </Paper>
              {/* Folders */}
				<Paper sx={{ minWidth: 280, maxWidth: 280, flex: '1 1 280px', backgroundColor: style.styleBoxBg, border: `1px solid ${style.inputBorder}`, borderRadius: 2, boxShadow: '0 8px 32px #00000022', p: 1, mb: 0, overflow: 'hidden', color: style.color }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>Folders</Typography>
                {FOLDERS_ROWS.map((row) => {
                  const fontSize = row.fontSize && typeof adminSettings.colorSchemes.light[row.fontSize] === 'number'
                    ? (adminSettings.colorSchemes.light[row.fontSize] as number)
                    : undefined;
                  return (
                    <SettingRow
                      key={row.label}
                      label={row.label}
                      lightValue={String(adminSettings.colorSchemes.light[row.light])}
                      darkValue={String(adminSettings.colorSchemes.dark[row.dark])}
                      onLightChange={value => updateLightColor(row.light, value)}
                      onDarkChange={value => updateDarkColor(row.dark, value)}
                      fontSize={fontSize}
                      onFontSizeChange={row.fontSize && fontSize !== undefined ? (value => updateFontSizeBoth(row.fontSize!, value)) : undefined}
                      style={style}
                      mode={mode}
                    />
                  );
                })}
              </Paper>
              {/* Page Details */}
              <Paper sx={{ minWidth: 280, maxWidth: 280, flex: '1 1 280px', backgroundColor: style.styleBoxBg, border: `1px solid ${style.inputBorder}`, borderRadius: 2, boxShadow: '0 8px 32px #00000022', p: 1, mb: 0, overflow: 'hidden', color: style.color }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 1 }}>Page Details</Typography>
                {PAGE_DETAILS_ROWS.map((row) => {
                  const fontSize = row.fontSize && typeof adminSettings.colorSchemes.light[row.fontSize] === 'number'
                    ? (adminSettings.colorSchemes.light[row.fontSize] as number)
                    : undefined;
                  return (
                    <SettingRow
                      key={row.label}
                      label={row.label}
                      lightValue={String(adminSettings.colorSchemes.light[row.light])}
                      darkValue={String(adminSettings.colorSchemes.dark[row.dark])}
                      onLightChange={value => updateLightColor(row.light, value)}
                      onDarkChange={value => updateDarkColor(row.dark, value)}
                      fontSize={fontSize}
                      onFontSizeChange={row.fontSize && fontSize !== undefined ? (value => updateFontSizeBoth(row.fontSize!, value)) : undefined}
                      style={style}
                      mode={mode}
                    />
                  );
                })}
              </Paper>
            </Box>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

export default AdminSettingsDialog

// --- GROUPED ROW TYPES ---
type ColorRow = {
  label: string;
  light: keyof ColorScheme;
  dark: keyof ColorScheme;
  fontSize?: keyof ColorScheme;
};

// --- SYSTEM ELEMENTS ---
const SYSTEM_ELEMENT_ROWS: ColorRow[] = [
  { label: 'Header BG', light: 'appBarBackground', dark: 'appBarBackground' },
  { label: 'Header Font', light: 'appBarTextColor', dark: 'appBarTextColor' },
  { label: 'Footer BG', light: 'footerBackground', dark: 'footerBackground' },
  { label: 'Footer Font', light: 'footerTextColor', dark: 'footerTextColor' },
  { label: 'Selection BG', light: 'selectionBackground', dark: 'selectionBackground' },
  { label: 'Hover BG', light: 'hoverBackground', dark: 'hoverBackground' },
  { label: 'Border Color', light: 'borderColor', dark: 'borderColor' },
  { label: 'Shadow Color', light: 'shadowColor', dark: 'shadowColor' },
];

// --- TYPOGRAPHY & PAGE BACKGROUNDS ---
const TYPOGRAPHY_ROWS: ColorRow[] = [
  { label: 'H1 Font', light: 'h1FontColor', dark: 'h1FontColor', fontSize: 'h1FontSize' },
  { label: 'H2 Font', light: 'h2FontColor', dark: 'h2FontColor', fontSize: 'h2FontSize' },
  { label: 'H3 Font', light: 'h3FontColor', dark: 'h3FontColor', fontSize: 'h3FontSize' },
  { label: 'Text Font', light: 'pFontColor', dark: 'pFontColor', fontSize: 'pFontSize' },
  { label: 'Toolbar Icon', light: 'toolbarIconColor', dark: 'toolbarIconColor' }, // Expose toolbarIconColor
  { label: 'Page View BG', light: 'viewBackground', dark: 'viewBackground' },
  { label: 'Page Edit BG', light: 'editBackground', dark: 'editBackground' },
];

// --- FOLDERS ---
const FOLDERS_ROWS: ColorRow[] = [
  { label: 'Folders BG', light: 'foldersBackground', dark: 'foldersBackground' },
  { label: 'Folders Font', light: 'foldersFontColor', dark: 'foldersFontColor', fontSize: 'foldersFontSize' },
];

// --- PAGE DETAILS ---
const PAGE_DETAILS_ROWS: ColorRow[] = [
  { label: 'Page Details BG', light: 'pageDetailsBackground', dark: 'pageDetailsBackground' },
  { label: 'Page Details Font', light: 'pageDetailsFontColor', dark: 'pageDetailsFontColor', fontSize: 'pageDetailsFontSize' },
  { label: 'Details Block BG', light: 'detailsBlockBackground', dark: 'detailsBlockBackground' },
  { label: 'Tags Block BG', light: 'tagsBlockBackground', dark: 'tagsBlockBackground' },
  { label: 'Tags BG', light: 'tagBackground', dark: 'tagBackground' },
  { label: 'Tags Font', light: 'tagColor', dark: 'tagColor' },
  { label: 'Revision Block BG', light: 'revisionBlockBackground', dark: 'revisionBlockBackground' },
  { label: 'Revision List BG', light: 'revisionListBackground', dark: 'revisionListBackground' }
];
