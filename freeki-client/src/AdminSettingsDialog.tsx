import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Grid,
  IconButton,
  Alert,
  Paper,
  Stack,
  Divider
} from '@mui/material'
import {
  Close,
  Save,
  Refresh
} from '@mui/icons-material'
import type { AdminSettings, ColorScheme } from './adminSettings'
import { DEFAULT_ADMIN_SETTINGS, fetchAdminSettings, saveAdminSettings } from './adminSettings'

interface AdminSettingsDialogProps {
  open: boolean
  onClose: () => void
  onThemeChange?: (colorSchemes: { light: ColorScheme; dark: ColorScheme }) => void
  initialSettings?: { light: ColorScheme; dark: ColorScheme }
}

interface ColorRowProps {
  label: string
  lightValue: string
  darkValue: string
  onLightChange: (value: string) => void
  onDarkChange: (value: string) => void
}

function ColorRow({ label, lightValue, darkValue, onLightChange, onDarkChange }: ColorRowProps) {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      py: 1, 
      px: 2,
      '&:nth-of-type(even)': {
        backgroundColor: 'rgba(0, 0, 0, 0.02)'
      }
    }}>
      <Typography sx={{ 
        flex: 1, 
        fontSize: '0.9rem',
        minWidth: 200
      }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <input
          type="color"
          value={lightValue.startsWith('#') ? lightValue : '#000000'}
          onChange={(e) => onLightChange(e.target.value)}
          style={{ width: 32, height: 32, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
          title="Light mode color"
          aria-label={`Light mode color for ${label}`}
        />
        <input
          type="color"
          value={darkValue.startsWith('#') ? darkValue : '#000000'}
          onChange={(e) => onDarkChange(e.target.value)}
          style={{ width: 32, height: 32, border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
          title="Dark mode color"
          aria-label={`Dark mode color for ${label}`}
        />
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

  const updateLightColor = (property: keyof ColorScheme, value: string) => {
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

  const updateDarkColor = (property: keyof ColorScheme, value: string) => {
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
      maxWidth="sm"
      aria-labelledby="admin-settings-title"
      aria-modal="true"
      role="dialog"
      PaperProps={{
        sx: { 
          height: { xs: '95vh', sm: '80vh', md: '75vh' },
          width: { xs: '95vw', sm: '85vw', md: '70vw' },
          maxWidth: { xs: '100%', sm: '600px' }
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.2)'
        }
      }}
    >
      <DialogTitle id="admin-settings-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Administration Settings</Typography>
          <IconButton onClick={handleClose} aria-label="Close settings dialog">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ overflow: 'auto' }}>
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
            <Typography>Loading settings...</Typography>
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* General Settings */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>General Settings</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Company Name"
                    value={settings.companyName}
                    onChange={(e) => setSettings({
                      ...settings,
                      companyName: e.target.value
                    })}
                    fullWidth
                    size="small"
                    aria-label="Company Name"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Wiki Title"
                    value={settings.wikiTitle}
                    onChange={(s) => setSettings({
                      ...settings,
                      wikiTitle: s.target.value
                    })}
                    fullWidth
                    size="small"
                    aria-label="Wiki Title"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                      label="Company Logo Path"
                      value={settings.companyLogoPath}
                      onChange={(e) => setSettings({
                        ...settings,
                        companyLogoPath: e.target.value
                      })}
                      fullWidth
                      size="small"
                      aria-label="Company Logo Path"
                    />
                    <Button aria-label="Browse media" variant="outlined" sx={{ minWidth: 120 }}>
                      Browse Media
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
            <Divider sx={{ mb: { xs: 2, sm: 2.5, md: 3 }, borderColor: 'var(--freeki-border-color)' }} />
            {/* Theme Colors */}
            <Paper sx={{ 
              p: { xs: 1, sm: 2, md: 3 },
              backgroundColor: 'var(--freeki-view-mode-background)',
              border: '1px solid var(--freeki-border-color)',
              boxShadow: 'none'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
                <Typography variant="h6">Theme Colors</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    backgroundColor: '#f5f5f5', 
                    border: '1px solid #ccc',
                    borderRadius: 1 
                  }} />
                  <Typography variant="caption">Light</Typography>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    backgroundColor: '#333', 
                    border: '1px solid #ccc',
                    borderRadius: 1 
                  }} />
                  <Typography variant="caption">Dark</Typography>
                </Box>
              </Box>
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <ColorRow
                  label="Header Background"
                  lightValue={settings.colorSchemes.light.appBarBackground}
                  darkValue={settings.colorSchemes.dark.appBarBackground}
                  onLightChange={(value) => updateLightColor('appBarBackground', value)}
                  onDarkChange={(value) => updateDarkColor('appBarBackground', value)}
                />
                <ColorRow
                  label="Header Font Color"
                  lightValue={settings.colorSchemes.light.appBarTextColor}
                  darkValue={settings.colorSchemes.dark.appBarTextColor}
                  onLightChange={(value) => updateLightColor('appBarTextColor', value)}
                  onDarkChange={(value) => updateDarkColor('appBarTextColor', value)}
                />
                <ColorRow
                  label="Folder Tree Background"
                  lightValue={settings.colorSchemes.light.sidebarBackground}
                  darkValue={settings.colorSchemes.dark.sidebarBackground}
                  onLightChange={(value) => updateLightColor('sidebarBackground', value)}
                  onDarkChange={(value) => updateDarkColor('sidebarBackground', value)}
                />
                <ColorRow
                  label="Folder Tree Selected"
                  lightValue={settings.colorSchemes.light.sidebarSelectedBackground}
                  darkValue={settings.colorSchemes.dark.sidebarSelectedBackground}
                  onLightChange={(value) => updateLightColor('sidebarSelectedBackground', value)}
                  onDarkChange={(value) => updateDarkColor('sidebarSelectedBackground', value)}
                />
                <ColorRow
                  label="Folder Tree Hover"
                  lightValue={settings.colorSchemes.light.sidebarHoverBackground}
                  darkValue={settings.colorSchemes.dark.sidebarHoverBackground}
                  onLightChange={(value) => updateLightColor('sidebarHoverBackground', value)}
                  onDarkChange={(value) => updateDarkColor('sidebarHoverBackground', value)}
                />
                <ColorRow
                  label="View Mode Background"
                  lightValue={settings.colorSchemes.light.viewModeBackground}
                  darkValue={settings.colorSchemes.dark.viewModeBackground}
                  onLightChange={(value) => updateLightColor('viewModeBackground', value)}
                  onDarkChange={(value) => updateDarkColor('viewModeBackground', value)}
                />
                <ColorRow
                  label="Edit Mode Background"
                  lightValue={settings.colorSchemes.light.editModeBackground}
                  darkValue={settings.colorSchemes.dark.editModeBackground}
                  onLightChange={(value) => updateLightColor('editModeBackground', value)}
                  onDarkChange={(value) => updateDarkColor('editModeBackground', value)}
                />
                <ColorRow
                  label="Metadata Panel Background"
                  lightValue={settings.colorSchemes.light.metadataPanelBackground}
                  darkValue={settings.colorSchemes.dark.metadataPanelBackground}
                  onLightChange={(value) => updateLightColor('metadataPanelBackground', value)}
                  onDarkChange={(value) => updateDarkColor('metadataPanelBackground', value)}
                />
                <ColorRow
                  label="Primary Text Color"
                  lightValue={settings.colorSchemes.light.textPrimary}
                  darkValue={settings.colorSchemes.dark.textPrimary}
                  onLightChange={(value) => updateLightColor('textPrimary', value)}
                  onDarkChange={(value) => updateDarkColor('textPrimary', value)}
                />
                <ColorRow
                  label="Secondary Text Color"
                  lightValue={settings.colorSchemes.light.textSecondary}
                  darkValue={settings.colorSchemes.dark.textSecondary}
                  onLightChange={(value) => updateLightColor('textSecondary', value)}
                  onDarkChange={(value) => updateDarkColor('textSecondary', value)}
                />
                <ColorRow
                  label="Border Color"
                  lightValue={settings.colorSchemes.light.borderColor}
                  darkValue={settings.colorSchemes.dark.borderColor}
                  onLightChange={(value) => updateLightColor('borderColor', value)}
                  onDarkChange={(value) => updateDarkColor('borderColor', value)}
                />
                <ColorRow
                  label="Footer Background"
                  lightValue={settings.colorSchemes.light.footerBackground}
                  darkValue={settings.colorSchemes.dark.footerBackground}
                  onLightChange={(value) => updateLightColor('footerBackground', value)}
                  onDarkChange={(value) => updateDarkColor('footerBackground', value)}
                />
                <ColorRow
                  label="Footer Font Color"
                  lightValue={settings.colorSchemes.light.footerTextColor}
                  darkValue={settings.colorSchemes.dark.footerTextColor}
                  onLightChange={(value) => updateLightColor('footerTextColor', value)}
                  onDarkChange={(value) => updateDarkColor('footerTextColor', value)}
                />
              </Box>
            </Paper>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button aria-label="Reset to defaults" onClick={handleReset} startIcon={<Refresh />} disabled={loading || saving}>
          Reset to Defaults
        </Button>
        <Button aria-label="Cancel" onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button aria-label="Save settings" onClick={handleSave} variant="contained" disabled={loading || saving} startIcon={<Save />}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AdminSettingsDialog