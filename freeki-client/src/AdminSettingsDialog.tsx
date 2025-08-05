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
  Refresh
} from '@mui/icons-material'
import type { AdminSettings, ColorScheme } from './adminSettings'
import { DEFAULT_ADMIN_SETTINGS, fetchAdminSettings, saveAdminSettings } from './adminSettings'
import AdvancedColorPicker from './AdvancedColorPicker'

// Admin panel color constants
const ADMIN_BG_COLOR = '#23272b';
const ADMIN_HEADER_BG = '#222c36';
const ADMIN_HEADER_TEXT = '#f5f7fa';
const ADMIN_BORDER_COLOR = '#31343a';
const ADMIN_TEXT_PRIMARY = '#e0e0e0';
const ADMIN_TEXT_SECONDARY = '#b0b0b0';
const ADMIN_SHADOW_COLOR = '#00000033';
const ADMIN_BUTTON_HOVER = '#2a3442';
const ADMIN_PAPER_BG = '#23272b';
const ADMIN_INPUT_BG = '#23272b';
const ADMIN_INPUT_BORDER = '#444';
const ADMIN_INPUT_BORDER_HOVER = '#888';

interface AdminSettingsDialogProps {
  open: boolean
  onClose: () => void
  onThemeChange?: (colorSchemes: { light: ColorScheme; dark: ColorScheme }) => void
  initialSettings?: { light: ColorScheme; dark: ColorScheme }
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
  ]
}: SettingRowProps) {
  const safeLightValue = typeof lightValue === 'string' ? lightValue : '';
  const safeDarkValue = typeof darkValue === 'string' ? darkValue : '';
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr 1fr 1fr',
      alignItems: 'center',
      py: 0.1, // reduce vertical padding
      px: 0,
      backgroundColor: 'unset',
      '&:nth-of-type(even)': {
        backgroundColor: '#23272b',
      },
      '&:nth-of-type(odd)': {
        backgroundColor: '#202225',
      },
      color: '#e0e0e0',
      gap: 0.5, // reduce gap between columns
      minHeight: 26 // reduce row height
    }}>
      <Typography sx={{
        fontSize: '0.8rem',
        minWidth: 0,
        color: '#e0e0e0',
        fontWeight: 500,
        px: 0.5, // reduce horizontal padding
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, mx: 'auto', height: '100%' }}>
        <AdvancedColorPicker
          value={safeLightValue.startsWith('#') ? safeLightValue : '#000000'}
          onChange={onLightChange}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, mx: 'auto', height: '100%' }}>
        <AdvancedColorPicker
          value={safeDarkValue.startsWith('#') ? safeDarkValue : '#000000'}
          onChange={onDarkChange}
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
              color: '#b0b0b0',
              p: 0,
              mx: 0,
              '& .MuiSlider-thumb': {
                borderRadius: 1,
                width: 18,
                height: 18,
                backgroundColor: '#31343a',
                boxShadow: '0 2px 8px #00000033',
                border: '2px solid #888',
              },
              '& .MuiSlider-track': {
                backgroundColor: '#444',
                border: 'none',
              },
              '& .MuiSlider-rail': {
                backgroundColor: '#23272b',
                opacity: 1,
              },
              '& .MuiSlider-markLabel': {
                color: '#b0b0b0',
                fontSize: '0.75rem',
              },
              '& .MuiSlider-mark': {
                backgroundColor: '#888',
              }
            }}
          />
        ) : null}
      </Box>
    </Box>
  )
}

function AdminSettingsDialog({ open, onClose, onThemeChange, initialSettings }: AdminSettingsDialogProps) {
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
          backgroundColor: ADMIN_HEADER_BG,
          color: ADMIN_HEADER_TEXT,
          boxShadow: `0 8px 32px ${ADMIN_SHADOW_COLOR}`
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
          backgroundColor: ADMIN_HEADER_BG,
          color: ADMIN_HEADER_TEXT,
          borderBottom: `1px solid ${ADMIN_BORDER_COLOR}`,
          py: 1,
          minHeight: 0,
          fontSize: '1.1rem',
          fontWeight: 600,
          mb: 0
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 0 }}>
          <Typography variant="h6" sx={{ color: ADMIN_HEADER_TEXT, fontSize: '1.1rem', fontWeight: 600, py: 0, mb: 0 }}>
            Administration Settings
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button 
              aria-label="Reset to defaults" 
              onClick={handleReset} 
              startIcon={<Refresh />} 
              disabled={loading || saving}
              sx={{ 
                color: ADMIN_HEADER_TEXT,
                '&:hover': {
                  backgroundColor: ADMIN_BUTTON_HOVER
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
              sx={{ color: ADMIN_HEADER_TEXT }}
            >
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ 
        overflow: 'auto',
        backgroundColor: ADMIN_BG_COLOR,
        color: ADMIN_TEXT_PRIMARY,
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
            <Paper sx={{
              p: 2,
              backgroundColor: ADMIN_PAPER_BG,
              border: '1px solid ' + ADMIN_BORDER_COLOR,
              boxShadow: 'none',
              color: ADMIN_TEXT_PRIMARY,
              mb: 0, // Remove bottom margin
              borderRadius: 2,
              borderBottom: 'none' // Remove bottom border
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#e0e0e0', fontWeight: 700, letterSpacing: '1px', textShadow: '0 1px 4px #000', fontSize: '1rem', py: 0 }}>
                General Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 2fr' }, gap: 2, alignItems: 'center' }}>
                    <TextField
                      label="Company Name"
                      value={settings.companyName}
                      onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                      size="small"
                      aria-label="Company Name"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: ADMIN_INPUT_BG,
                          color: ADMIN_TEXT_PRIMARY,
                          fontWeight: 500,
                          borderRadius: 1,
                          fontSize: '1rem',
                          boxShadow: 'none',
                          '& fieldset': {
                            borderColor: ADMIN_INPUT_BORDER,
                          },
                          '&:hover fieldset': {
                            borderColor: ADMIN_INPUT_BORDER_HOVER,
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: ADMIN_TEXT_SECONDARY,
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
                          backgroundColor: ADMIN_INPUT_BG,
                          color: ADMIN_TEXT_PRIMARY,
                          fontWeight: 500,
                          borderRadius: 1,
                          fontSize: '1rem',
                          boxShadow: 'none',
                          '& fieldset': {
                            borderColor: ADMIN_INPUT_BORDER,
                          },
                          '&:hover fieldset': {
                            borderColor: ADMIN_INPUT_BORDER_HOVER,
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: ADMIN_TEXT_SECONDARY,
                          fontWeight: 400
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        label="Company Logo Path"
                        value={settings.companyLogoPath}
                        onChange={(e) => setSettings({ ...settings, companyLogoPath: e.target.value })}
                        size="small"
                        aria-label="Company Logo Path"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: ADMIN_INPUT_BG,
                            color: ADMIN_TEXT_PRIMARY,
                            fontWeight: 500,
                            borderRadius: 1,
                            fontSize: '1rem',
                            boxShadow: 'none',
                            '& fieldset': {
                              borderColor: ADMIN_INPUT_BORDER,
                            },
                            '&:hover fieldset': {
                              borderColor: ADMIN_INPUT_BORDER_HOVER,
                            }
                          },
                          '& .MuiInputLabel-root': {
                            color: ADMIN_TEXT_SECONDARY,
                            fontWeight: 400
                          }
                        }}
                      />
                      <Button 
                        aria-label="Browse media" 
                        variant="outlined" 
                        sx={{ 
                          minWidth: 100,
                          color: ADMIN_TEXT_PRIMARY,
                          borderColor: ADMIN_INPUT_BORDER,
                          backgroundColor: ADMIN_INPUT_BG,
                          fontWeight: 500,
                          borderRadius: 1,
                          boxShadow: 'none',
                          '&:hover': {
                            borderColor: ADMIN_INPUT_BORDER_HOVER,
                            backgroundColor: ADMIN_INPUT_BG
                          }
                        }}
                      >
                        Browse Media
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Unified style, font, and color settings block with two columns */}
            <Paper sx={{
              p: 1, // reduce padding
              backgroundColor: ADMIN_PAPER_BG,
              border: 'none', // remove border
              boxShadow: 'none',
              color: ADMIN_TEXT_PRIMARY,
              mt: 0,
              borderRadius: 2
            }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#e0e0e0', fontWeight: 700, letterSpacing: '1px', textShadow: '0 1px 4px #000', fontSize: '1rem', py: 0 }}>
                Style & Font Settings
              </Typography>
              <Box sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1, // reduce gap
                border: 'none', // remove border
                borderRadius: 0,
                backgroundColor: 'unset',
                overflow: 'hidden',
                p: 0,
                justifyContent: 'center'
              }}>
                {/* Left column */}
                <Box sx={{
                  flex: '1 1 340px',
                  minWidth: 320,
                  maxWidth: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.25, // reduce gap
                  backgroundColor: '#262b31',
                  border: '1px solid #3a3f47',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px #00000022',
                  p: 1
                }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', alignItems: 'center', py: 0.5, px: 1, backgroundColor: ADMIN_PAPER_BG, borderBottom: `1px solid ${ADMIN_INPUT_BORDER}`, color: ADMIN_TEXT_PRIMARY, gap: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', color: ADMIN_TEXT_PRIMARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Element</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: ADMIN_TEXT_PRIMARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Light</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: ADMIN_TEXT_PRIMARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Dark</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: ADMIN_TEXT_PRIMARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Size</Typography>
                  </Box>
                  <SettingRow label="Header BG" lightValue={settings.colorSchemes.light.appBarBackground} darkValue={settings.colorSchemes.dark.appBarBackground} onLightChange={value => updateLightColor('appBarBackground', value)} onDarkChange={value => updateDarkColor('appBarBackground', value)} />
                  <SettingRow label="Header Font" lightValue={settings.colorSchemes.light.appBarTextColor} darkValue={settings.colorSchemes.dark.appBarTextColor} onLightChange={value => updateLightColor('appBarTextColor', value)} onDarkChange={value => updateDarkColor('appBarTextColor', value)} />
                  <SettingRow label="Footer BG" lightValue={settings.colorSchemes.light.footerBackground} darkValue={settings.colorSchemes.dark.footerBackground} onLightChange={value => updateLightColor('footerBackground', value)} onDarkChange={value => updateDarkColor('footerBackground', value)} />
                  <SettingRow label="Footer Font" lightValue={settings.colorSchemes.light.footerTextColor} darkValue={settings.colorSchemes.dark.footerTextColor} onLightChange={value => updateLightColor('footerTextColor', value)} onDarkChange={value => updateDarkColor('footerTextColor', value)} />
                  <SettingRow label="H1 Font" lightValue={settings.colorSchemes.light.h1FontColor} darkValue={settings.colorSchemes.dark.h1FontColor} onLightChange={value => updateLightColor('h1FontColor', value)} onDarkChange={value => updateDarkColor('h1FontColor', value)} fontSize={settings.colorSchemes.light.h1FontSize} onFontSizeChange={value => updateLightColor('h1FontSize', value)} />
                  <SettingRow label="H2 Font" lightValue={settings.colorSchemes.light.h2FontColor} darkValue={settings.colorSchemes.dark.h2FontColor} onLightChange={value => updateLightColor('h2FontColor', value)} onDarkChange={value => updateDarkColor('h2FontColor', value)} fontSize={settings.colorSchemes.light.h2FontSize} onFontSizeChange={value => updateLightColor('h2FontSize', value)} />
                  <SettingRow label="H3 Font" lightValue={settings.colorSchemes.light.h3FontColor} darkValue={settings.colorSchemes.dark.h3FontColor} onLightChange={value => updateLightColor('h3FontColor', value)} onDarkChange={value => updateDarkColor('h3FontColor', value)} fontSize={settings.colorSchemes.light.h3FontSize} onFontSizeChange={value => updateLightColor('h3FontSize', value)} />
                  <SettingRow label="Text Font" lightValue={settings.colorSchemes.light.pFontColor} darkValue={settings.colorSchemes.dark.pFontColor} onLightChange={value => updateLightColor('pFontColor', value)} onDarkChange={value => updateDarkColor('pFontColor', value)} fontSize={settings.colorSchemes.light.pFontSize} onFontSizeChange={value => updateLightColor('pFontSize', value)} />
				  <SettingRow label="Page View BG" lightValue={settings.colorSchemes.light.viewBackground} darkValue={settings.colorSchemes.dark.viewBackground} onLightChange={value => updateLightColor('viewBackground', value)} onDarkChange={value => updateDarkColor('viewBackground', value)} />
				  <SettingRow label="Page Edit BG" lightValue={settings.colorSchemes.light.editBackground} darkValue={settings.colorSchemes.dark.editBackground} onLightChange={value => updateLightColor('editBackground', value)} onDarkChange={value => updateDarkColor('editBackground', value)} />
                </Box>
                {/* Right column */}
                <Box sx={{
                  flex: '1 1 340px',
                  minWidth: 320,
                  maxWidth: 400,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.25, // reduce gap
                  backgroundColor: '#262b31',
                  border: '1px solid #3a3f47',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px #00000022',
                  p: 1
                }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', alignItems: 'center', py: 0.5, px: 1, backgroundColor: ADMIN_PAPER_BG, borderBottom: `1px solid ${ADMIN_INPUT_BORDER}`, color: ADMIN_TEXT_PRIMARY, gap: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', color: ADMIN_TEXT_PRIMARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Element</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: ADMIN_TEXT_PRIMARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Light</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: ADMIN_TEXT_PRIMARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Dark</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: ADMIN_TEXT_PRIMARY, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Size</Typography>
                  </Box>
                  <SettingRow label="Folders BG" lightValue={settings.colorSchemes.light.foldersBackground} darkValue={settings.colorSchemes.dark.foldersBackground} onLightChange={value => updateLightColor('foldersBackground', value)} onDarkChange={value => updateDarkColor('foldersBackground', value)} />
                  <SettingRow label="Folders Selected BG" lightValue={settings.colorSchemes.light.foldersSelectedBackground} darkValue={settings.colorSchemes.dark.foldersSelectedBackground} onLightChange={value => updateLightColor('foldersSelectedBackground', value)} onDarkChange={value => updateDarkColor('foldersSelectedBackground', value)} />
                  <SettingRow label="Folders Font" lightValue={settings.colorSchemes.light.foldersFontColor} darkValue={settings.colorSchemes.dark.foldersFontColor} onLightChange={value => updateLightColor('foldersFontColor', value)} onDarkChange={value => updateDarkColor('foldersFontColor', value)} fontSize={settings.colorSchemes.light.foldersFontSize} onFontSizeChange={value => updateLightColor('foldersFontSize', value)} />
                  <SettingRow label="Page Details BG" lightValue={settings.colorSchemes.light.pageDetailsBackground} darkValue={settings.colorSchemes.dark.pageDetailsBackground} onLightChange={value => updateLightColor('pageDetailsBackground', value)} onDarkChange={value => updateDarkColor('pageDetailsBackground', value)} />
				  <SettingRow label="Page Details Font" lightValue={settings.colorSchemes.light.pageDetailsFontColor} darkValue={settings.colorSchemes.dark.pageDetailsFontColor} onLightChange={value => updateLightColor('pageDetailsFontColor', value)} onDarkChange={value => updateDarkColor('pageDetailsFontColor', value)} fontSize={settings.colorSchemes.light.pageDetailsFontSize} onFontSizeChange={value => updateLightColor('pageDetailsFontSize', value)} />
				  <SettingRow label="Border Color" lightValue={settings.colorSchemes.light.borderColor} darkValue={settings.colorSchemes.dark.borderColor} onLightChange={value => updateLightColor('borderColor', value)} onDarkChange={value => updateDarkColor('borderColor', value)} />
                  <SettingRow label="Shadow Color" lightValue={settings.colorSchemes.light.shadowColor} darkValue={settings.colorSchemes.dark.shadowColor} onLightChange={value => updateLightColor('shadowColor', value)} onDarkChange={value => updateDarkColor('shadowColor', value)} />
                </Box>
              </Box>
            </Paper>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AdminSettingsDialog