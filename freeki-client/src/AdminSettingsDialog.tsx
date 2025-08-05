import * as React from 'react';
import { useState, useEffect } from 'react'
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
  Box
} from '@mui/material'
import {
  Close,
  Save,
  Refresh,
  Photo
} from '@mui/icons-material'
import type { AdminSettings, ColorScheme } from './adminSettings'
import { DEFAULT_ADMIN_SETTINGS, fetchAdminSettings, saveAdminSettings } from './adminSettings'
import AdvancedColorPicker from './AdvancedColorPicker'

// Default style objects for AdminSettingsDialog only
const ADMIN_DIALOG_LIGHT_STYLE = {
  backgroundColor: '#f7fafd', // very light blue-gray
  color: '#222c36',           // deep blue-gray for text
  border: '1px solid #dbe6ee',// soft blue border
  boxShadow: '0 4px 24px #00000055', // Dark shadow for light mode
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
  backgroundColor: '#23272b',
  color: '#e0e0e0',
  border: '1px solid #31343a',
  boxShadow: '0 8px 32px #ffffff33', // Light shadow for dark mode
  borderRadius: 'var(--border-radius)', // Use CSS variable
  headerBg: '#222c36',
  headerText: '#f5f7fa',
  inputBg: '#23272b',
  inputBorder: '#444444',
  inputBorderHover: '#888888',
  paperBg: '#23272b',
  divider: '#31343a',
  styleBoxBg: '#262b31',       // dark blue for style boxes
  rowEvenBg: '#23272b',        // dark for even rows
  rowOddBg: '#202225'          // slightly lighter for odd rows
};

interface AdminSettingsDialogProps {
  open: boolean
  onClose: () => void
  onThemeChange?: (colorSchemes: { light: ColorScheme; dark: ColorScheme }) => void
  initialSettings?: { light: ColorScheme; dark: ColorScheme }
  themeMode?: 'light' | 'dark' | 'auto'; // NEW: user theme mode
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
  step?: number
  marks?: { value: number; label?: string }[]
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
  min = 12,
  max = 32,
  step = 1,
  marks = [
    { value: 12 },
    { value: 14 },
    { value: 16 },
    { value: 18 },
    { value: 20 },
    { value: 24 },
    { value: 32 }
  ],
  style,
  mode
}: SettingRowProps & { style: typeof ADMIN_DIALOG_LIGHT_STYLE | typeof ADMIN_DIALOG_DARK_STYLE, mode: 'light' | 'dark' }) {
  const safeLightValue = typeof lightValue === 'string' ? lightValue : '';
  const safeDarkValue = typeof darkValue === 'string' ? darkValue : '';
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr 1fr 1fr',
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
        height: '100%'
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
            step={step}
            marks={marks}
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

function AdminSettingsDialog({ open, onClose, onThemeChange, initialSettings, themeMode }: AdminSettingsDialogProps) {
  const [settings, setSettings] = useState<AdminSettings>(() => {
    if (initialSettings) {
      return {
        ...DEFAULT_ADMIN_SETTINGS,
        colorSchemes: initialSettings
      }
    }
    return DEFAULT_ADMIN_SETTINGS
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [hasLoadedSettings, setHasLoadedSettings] = useState(!!initialSettings)
  const mode = resolveMode(themeMode);
  const style = mode === 'light' ? ADMIN_DIALOG_LIGHT_STYLE : ADMIN_DIALOG_DARK_STYLE;

  useEffect(() => {
    if (initialSettings && !hasLoadedSettings) {
      setSettings(prevSettings => ({
        ...prevSettings,
        colorSchemes: initialSettings
      }))
      setHasLoadedSettings(true)
    }
  }, [initialSettings, hasLoadedSettings])

  useEffect(() => {
    if (open && !hasLoadedSettings) {
      loadSettings()
    }
  }, [open, hasLoadedSettings])

  useEffect(() => {
    if (onThemeChange) {
      onThemeChange(settings.colorSchemes)
    }
  }, [settings.colorSchemes, onThemeChange])

  const loadSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const loadedSettings = await fetchAdminSettings()
      if (loadedSettings) {
        setSettings(loadedSettings)
        setHasLoadedSettings(true)
      } else {
        setError('Unable to load admin settings - insufficient permissions')
      }
    } catch (error) {
      console.warn('Error loading admin settings:', error)
      setError('Failed to load admin settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const result = await saveAdminSettings(settings)
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
    setSettings(DEFAULT_ADMIN_SETTINGS)
    setError(null)
    setSuccess(false)
  }

  const handleClose = () => {
    setError(null)
    setSuccess(false)
    onClose()
  }

  // Update: Allow updateLightColor/updateDarkColor to accept string | number
  const updateLightColor = (property: keyof ColorScheme, value: string | number) => {
    setSettings({
      ...settings,
      colorSchemes: {
        ...settings.colorSchemes,
        light: {
          ...settings.colorSchemes.light,
          [property]: value
        }
      }
    })
  }

  const updateDarkColor = (property: keyof ColorScheme, value: string | number) => {
    setSettings({
      ...settings,
      colorSchemes: {
        ...settings.colorSchemes,
        dark: {
          ...settings.colorSchemes.dark,
          [property]: value
        }
      }
    })
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
              disabled={loading || saving}
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
              disabled={loading || saving} 
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
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography sx={{ color: '#e0e0e0' }}>
              Loading settings...
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1} sx={{ p: 0 }}>
            {/* General Settings */}
            <Paper 
              className="freeki-flat"
              sx={{
                p: 2,
                backgroundColor: style.paperBg,
                color: style.color,
                mb: 0,
                borderRadius: 'var(--freeki-border-radius)'
              }}>
              <Typography variant="h6" sx={{ mb: 2, color: style.color, fontWeight: 700, letterSpacing: '1px', fontSize: '1rem', py: 0 }}>
                General Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr auto' }, 
                    gap: 2, 
                    alignItems: 'stretch' 
                  }}>
                    <TextField
                      label="Company Name"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      size="small"
                      aria-label="Company Name"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: style.inputBg,
                          color: style.color,
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
                          color: style.color,
                          fontWeight: 400
                        }
                      }}
                    />
                    <TextField
                      label="Wiki Title"
                      value={settings.wikiTitle}
                      onChange={(s) => setSettings({ ...settings, wikiTitle: s.target.value })}
                      size="small"
                      aria-label="Wiki Title"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: style.inputBg,
                          color: style.color,
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
                          color: style.color,
                          fontWeight: 400
                        }
                      }}
                    />
                    <TextField
                      label="Company Logo Path"
                      value={settings.companyLogoPath}
                      onChange={(e) => setSettings({ ...settings, companyLogoPath: e.target.value })}
                      size="small"
                      aria-label="Company Logo Path"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: style.inputBg,
                          color: style.color,
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
                          color: style.color,
                          fontWeight: 400
                        }
                      }}
                    />
                    <IconButton 
                      onClick={() => {/* TODO: Open media browser */}}
                      size="small"
                      aria-label="Browse media files"
                      sx={{ 
                        color: style.color,
                        opacity: 0.7,
                        borderRadius: 'var(--freeki-border-radius)',
                        '&:hover': {
                          opacity: 1,
                          color: style.inputBorderHover,
                          backgroundColor: style.styleBoxBg
                        }
                      }}
                    >
                      <Photo fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
            {/* Style & Font Settings - Remove border and fix alignment */}
            <Box sx={{
              p: 2,
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
                gap: 1,
                justifyContent: 'space-between'
              }}>
                {/* Left column */}
                <Box sx={{
                  flex: '1 1 340px',
                  minWidth: 320,
                  maxWidth: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.25,
                  backgroundColor: style.styleBoxBg,
                  border: `1px solid ${style.inputBorder}`,
                  borderRadius: 2,
                  boxShadow: '0 2px 8px #00000022',
                  p: 1
                }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', alignItems: 'center', py: 0.5, px: 1, backgroundColor: style.paperBg, borderBottom: `1px solid ${style.inputBorder}`, color: style.color, gap: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', color: style.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>Element</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: style.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Light</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: style.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Dark</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: style.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Size</Typography>
                  </Box>
                  <SettingRow label="Header BG" lightValue={settings.colorSchemes.light.appBarBackground} darkValue={settings.colorSchemes.dark.appBarBackground} onLightChange={value => updateLightColor('appBarBackground', value)} onDarkChange={value => updateDarkColor('appBarBackground', value)} style={style} mode={mode} />
                  <SettingRow label="Header Font" lightValue={settings.colorSchemes.light.appBarTextColor} darkValue={settings.colorSchemes.dark.appBarTextColor} onLightChange={value => updateLightColor('appBarTextColor', value)} onDarkChange={value => updateDarkColor('appBarTextColor', value)} style={style} mode={mode} />
                  <SettingRow label="Footer BG" lightValue={settings.colorSchemes.light.footerBackground} darkValue={settings.colorSchemes.dark.footerBackground} onLightChange={value => updateLightColor('footerBackground', value)} onDarkChange={value => updateDarkColor('footerBackground', value)} style={style} mode={mode} />
                  <SettingRow label="Footer Font" lightValue={settings.colorSchemes.light.footerTextColor} darkValue={settings.colorSchemes.dark.footerTextColor} onLightChange={value => updateLightColor('footerTextColor', value)} onDarkChange={value => updateDarkColor('footerTextColor', value)} style={style} mode={mode} />
                  <SettingRow label="H1 Font" lightValue={settings.colorSchemes.light.h1FontColor} darkValue={settings.colorSchemes.dark.h1FontColor} onLightChange={value => updateLightColor('h1FontColor', value)} onDarkChange={value => updateDarkColor('h1FontColor', value)} fontSize={settings.colorSchemes.light.h1FontSize} onFontSizeChange={value => updateLightColor('h1FontSize', value)} style={style} mode={mode} />
                  <SettingRow label="H2 Font" lightValue={settings.colorSchemes.light.h2FontColor} darkValue={settings.colorSchemes.dark.h2FontColor} onLightChange={value => updateLightColor('h2FontColor', value)} onDarkChange={value => updateDarkColor('h2FontColor', value)} fontSize={settings.colorSchemes.light.h2FontSize} onFontSizeChange={value => updateLightColor('h2FontSize', value)} style={style} mode={mode} />
                  <SettingRow label="H3 Font" lightValue={settings.colorSchemes.light.h3FontColor} darkValue={settings.colorSchemes.dark.h3FontColor} onLightChange={value => updateLightColor('h3FontColor', value)} onDarkChange={value => updateDarkColor('h3FontColor', value)} fontSize={settings.colorSchemes.light.h3FontSize} onFontSizeChange={value => updateLightColor('h3FontSize', value)} style={style} mode={mode} />
                  <SettingRow label="Text Font" lightValue={settings.colorSchemes.light.pFontColor} darkValue={settings.colorSchemes.dark.pFontColor} onLightChange={value => updateLightColor('pFontColor', value)} onDarkChange={value => updateDarkColor('pFontColor', value)} fontSize={settings.colorSchemes.light.pFontSize} onFontSizeChange={value => updateLightColor('pFontSize', value)} style={style} mode={mode} />
				  <SettingRow label="Page View BG" lightValue={settings.colorSchemes.light.viewBackground} darkValue={settings.colorSchemes.dark.viewBackground} onLightChange={value => updateLightColor('viewBackground', value)} onDarkChange={value => updateDarkColor('viewBackground', value)} style={style} mode={mode} />
				  <SettingRow label="Page Edit BG" lightValue={settings.colorSchemes.light.editBackground} darkValue={settings.colorSchemes.dark.editBackground} onLightChange={value => updateLightColor('editBackground', value)} onDarkChange={value => updateDarkColor('editBackground', value)} style={style} mode={mode} />
                </Box>
                {/* Right column */}
                <Box sx={{
                  flex: '1 1 340px',
                  minWidth: 320,
                  maxWidth: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.25,
                  backgroundColor: style.styleBoxBg,
                  border: `1px solid ${style.inputBorder}`,
                  borderRadius: 2,
                  boxShadow: '0 2px 8px #00000022',
                  p: 1
                }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', alignItems: 'center', py: 0.5, px: 1, backgroundColor: style.paperBg, borderBottom: `1px solid ${style.inputBorder}`, color: style.color, gap: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', color: style.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left' }}>Element</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: style.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Light</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: style.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Dark</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: style.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Size</Typography>
                  </Box>
                  <SettingRow label="Folders BG" lightValue={settings.colorSchemes.light.foldersBackground} darkValue={settings.colorSchemes.dark.foldersBackground} onLightChange={value => updateLightColor('foldersBackground', value)} onDarkChange={value => updateDarkColor('foldersBackground', value)} style={style} mode={mode} />
                  <SettingRow label="Folders Selected BG" lightValue={settings.colorSchemes.light.foldersSelectedBackground} darkValue={settings.colorSchemes.dark.foldersSelectedBackground} onLightChange={value => updateLightColor('foldersSelectedBackground', value)} onDarkChange={value => updateDarkColor('foldersSelectedBackground', value)} style={style} mode={mode} />
                  <SettingRow label="Folders Font" lightValue={settings.colorSchemes.light.foldersFontColor} darkValue={settings.colorSchemes.dark.foldersFontColor} onLightChange={value => updateLightColor('foldersFontColor', value)} onDarkChange={value => updateDarkColor('foldersFontColor', value)} fontSize={settings.colorSchemes.light.foldersFontSize} onFontSizeChange={value => updateLightColor('foldersFontSize', value)} style={style} mode={mode} />
                  <SettingRow label="Page Details BG" lightValue={settings.colorSchemes.light.pageDetailsBackground} darkValue={settings.colorSchemes.dark.pageDetailsBackground} onLightChange={value => updateLightColor('pageDetailsBackground', value)} onDarkChange={value => updateDarkColor('pageDetailsBackground', value)} style={style} mode={mode} />
				  <SettingRow label="Page Details Font" lightValue={settings.colorSchemes.light.pageDetailsFontColor} darkValue={settings.colorSchemes.dark.pageDetailsFontColor} onLightChange={value => updateLightColor('pageDetailsFontColor', value)} onDarkChange={value => updateDarkColor('pageDetailsFontColor', value)} fontSize={settings.colorSchemes.light.pageDetailsFontSize} onFontSizeChange={value => updateLightColor('pageDetailsFontSize', value)} style={style} mode={mode} />
				  <SettingRow label="Border Color" lightValue={settings.colorSchemes.light.borderColor} darkValue={settings.colorSchemes.dark.borderColor} onLightChange={value => updateLightColor('borderColor', value)} onDarkChange={value => updateDarkColor('borderColor', value)} style={style} mode={mode} />
                  <SettingRow label="Shadow Color" lightValue={settings.colorSchemes.light.shadowColor} darkValue={settings.colorSchemes.dark.shadowColor} onLightChange={value => updateLightColor('shadowColor', value)} onDarkChange={value => updateDarkColor('shadowColor', value)} style={style} mode={mode} />
                </Box>
              </Box>
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AdminSettingsDialog
