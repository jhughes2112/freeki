import React, { useState, useEffect } from 'react'
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
  Alert
} from '@mui/material'
import {
  ExpandMore,
  Close,
  Save,
  Refresh
} from '@mui/icons-material'
import { AdminSettings, DEFAULT_ADMIN_SETTINGS, fetchAdminSettings, saveAdminSettings } from './adminSettings'

interface AdminSettingsDialogProps {
  open: boolean
  onClose: () => void
}

// Admin settings component that only shows for admin users
function AdminSettingsDialog({ open, onClose }: AdminSettingsDialogProps) {
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_ADMIN_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const loadedSettings = await fetchAdminSettings()
      if (loadedSettings) {
        setSettings(loadedSettings)
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

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
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

            {/* Color Schemes - In Accordion for space saving */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Color Schemes</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>Light Mode Colors</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="App Bar Background"
                        type="color"
                        value={settings.colorSchemes.light.appBarBackground}
                        onChange={(e) => setSettings({
                          ...settings,
                          colorSchemes: {
                            ...settings.colorSchemes,
                            light: {
                              ...settings.colorSchemes.light,
                              appBarBackground: e.target.value
                            }
                          }
                        })}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Sidebar Background"
                        type="color"
                        value={settings.colorSchemes.light.sidebarBackground}
                        onChange={(e) => setSettings({
                          ...settings,
                          colorSchemes: {
                            ...settings.colorSchemes,
                            light: {
                              ...settings.colorSchemes.light,
                              sidebarBackground: e.target.value
                            }
                          }
                        })}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>Dark Mode Colors</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="App Bar Background"
                        type="color"
                        value={settings.colorSchemes.dark.appBarBackground}
                        onChange={(e) => setSettings({
                          ...settings,
                          colorSchemes: {
                            ...settings.colorSchemes,
                            dark: {
                              ...settings.colorSchemes.dark,
                              appBarBackground: e.target.value
                            }
                          }
                        })}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Sidebar Background"
                        type="color"
                        value={settings.colorSchemes.dark.sidebarBackground}
                        onChange={(e) => setSettings({
                          ...settings,
                          colorSchemes: {
                            ...settings.colorSchemes,
                            dark: {
                              ...settings.colorSchemes.dark,
                              sidebarBackground: e.target.value
                            }
                          }
                        })}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Box>
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