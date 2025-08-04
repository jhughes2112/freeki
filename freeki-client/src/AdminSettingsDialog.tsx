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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  IconButton,
  Alert,
  Divider
} from '@mui/material'
import {
  ExpandMore,
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

interface ColorInputProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  const handleChange = (newValue: string) => {
    setDisplayValue(newValue)
    onChange(newValue)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TextField
        label={label}
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        size="small"
        fullWidth
        sx={{ flex: 1 }}
      />
      <input
        type="color"
        value={displayValue.startsWith('#') ? displayValue : '#000000'}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          width: 40,
          height: 40,
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer'
        }}
      />
    </Box>
  )
}

// Admin settings component that only shows for admin users
function AdminSettingsDialog({ open, onClose, onThemeChange, initialSettings }: AdminSettingsDialogProps) {
  const [settings, setSettings] = useState<AdminSettings>(() => {
    // Use initialSettings if available to construct the full admin settings
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

  // Initialize settings with initialSettings when available
  useEffect(() => {
    if (initialSettings && !hasLoadedSettings) {
      setSettings(prevSettings => ({
        ...prevSettings,
        colorSchemes: initialSettings
      }))
      setHasLoadedSettings(true)
    }
  }, [initialSettings, hasLoadedSettings])

  // Load settings when dialog opens - but only if not already loaded
  useEffect(() => {
    if (open && !hasLoadedSettings) {
      loadSettings()
    }
  }, [open, hasLoadedSettings])

  // Apply theme changes in real-time
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
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Administration Settings</Typography>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ overflow: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Settings saved successfully!
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography>Loading settings...</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
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
                    margin="normal"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Wiki Title"
                    value={settings.wikiTitle}
                    onChange={(e) => setSettings({
                      ...settings,
                      wikiTitle: e.target.value
                    })}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <TextField
                      label="Company Logo Path"
                      value={settings.companyLogoPath}
                      onChange={(e) => setSettings({
                        ...settings,
                        companyLogoPath: e.target.value
                      })}
                      fullWidth
                      size="small"
                    />
                    <Button variant="outlined" sx={{ minWidth: 120 }}>
                      Browse Media
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            {/* Theme Color Schemes */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Theme Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={4}>
                  {/* Light Mode Theme */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                      Light Mode Colors
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>
                        Top/Bottom Lines
                      </Typography>
                      <ColorInput
                        label="App Bar Background"
                        value={settings.colorSchemes.light.appBarBackground}
                        onChange={(value) => updateLightColor('appBarBackground', value)}
                      />
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Folder Tree (Sidebar)
                      </Typography>
                      <ColorInput
                        label="Background Color"
                        value={settings.colorSchemes.light.sidebarBackground}
                        onChange={(value) => updateLightColor('sidebarBackground', value)}
                      />
                      <ColorInput
                        label="Selected Background"
                        value={settings.colorSchemes.light.sidebarSelectedBackground}
                        onChange={(value) => updateLightColor('sidebarSelectedBackground', value)}
                      />
                      <ColorInput
                        label="Hover Background"
                        value={settings.colorSchemes.light.sidebarHoverBackground}
                        onChange={(value) => updateLightColor('sidebarHoverBackground', value)}
                      />
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        View/Edit Areas
                      </Typography>
                      <ColorInput
                        label="View Mode Background"
                        value={settings.colorSchemes.light.viewModeBackground}
                        onChange={(value) => updateLightColor('viewModeBackground', value)}
                      />
                      <ColorInput
                        label="Edit Mode Background"
                        value={settings.colorSchemes.light.editModeBackground}
                        onChange={(value) => updateLightColor('editModeBackground', value)}
                      />
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Metadata/History Section
                      </Typography>
                      <ColorInput
                        label="Panel Background"
                        value={settings.colorSchemes.light.metadataPanelBackground}
                        onChange={(value) => updateLightColor('metadataPanelBackground', value)}
                      />
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Font Colors
                      </Typography>
                      <ColorInput
                        label="Primary Text"
                        value={settings.colorSchemes.light.textPrimary}
                        onChange={(value) => updateLightColor('textPrimary', value)}
                      />
                      <ColorInput
                        label="Secondary Text"
                        value={settings.colorSchemes.light.textSecondary}
                        onChange={(value) => updateLightColor('textSecondary', value)}
                      />
                      <ColorInput
                        label="Border Color"
                        value={settings.colorSchemes.light.borderColor}
                        onChange={(value) => updateLightColor('borderColor', value)}
                      />
                    </Box>
                  </Grid>

                  {/* Dark Mode Theme */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main' }}>
                      Dark Mode Colors
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1 }}>
                        Top/Bottom Lines
                      </Typography>
                      <ColorInput
                        label="App Bar Background"
                        value={settings.colorSchemes.dark.appBarBackground}
                        onChange={(value) => updateDarkColor('appBarBackground', value)}
                      />
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Folder Tree (Sidebar)
                      </Typography>
                      <ColorInput
                        label="Background Color"
                        value={settings.colorSchemes.dark.sidebarBackground}
                        onChange={(value) => updateDarkColor('sidebarBackground', value)}
                      />
                      <ColorInput
                        label="Selected Background"
                        value={settings.colorSchemes.dark.sidebarSelectedBackground}
                        onChange={(value) => updateDarkColor('sidebarSelectedBackground', value)}
                      />
                      <ColorInput
                        label="Hover Background"
                        value={settings.colorSchemes.dark.sidebarHoverBackground}
                        onChange={(value) => updateDarkColor('sidebarHoverBackground', value)}
                      />
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        View/Edit Areas
                      </Typography>
                      <ColorInput
                        label="View Mode Background"
                        value={settings.colorSchemes.dark.viewModeBackground}
                        onChange={(value) => updateDarkColor('viewModeBackground', value)}
                      />
                      <ColorInput
                        label="Edit Mode Background"
                        value={settings.colorSchemes.dark.editModeBackground}
                        onChange={(value) => updateDarkColor('editModeBackground', value)}
                      />
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Metadata/History Section
                      </Typography>
                      <ColorInput
                        label="Panel Background"
                        value={settings.colorSchemes.dark.metadataPanelBackground}
                        onChange={(value) => updateDarkColor('metadataPanelBackground', value)}
                      />
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Font Colors
                      </Typography>
                      <ColorInput
                        label="Primary Text"
                        value={settings.colorSchemes.dark.textPrimary}
                        onChange={(value) => updateDarkColor('textPrimary', value)}
                      />
                      <ColorInput
                        label="Secondary Text"
                        value={settings.colorSchemes.dark.textSecondary}
                        onChange={(value) => updateDarkColor('textSecondary', value)}
                      />
                      <ColorInput
                        label="Border Color"
                        value={settings.colorSchemes.dark.borderColor}
                        onChange={(value) => updateDarkColor('borderColor', value)}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleReset} 
          startIcon={<Refresh />}
          disabled={loading || saving}
        >
          Reset to Defaults
        </Button>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading || saving}
          startIcon={<Save />}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AdminSettingsDialog