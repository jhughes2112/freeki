import React, { useState, useCallback, useEffect, useRef } from 'react'
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box, 
  Typography, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemButton,
  ListItemIcon,
  Alert,
  Tabs,
  Tab,
  TextField,
  IconButton,
  CircularProgress,
  useTheme
} from '@mui/material'
import { CloudUpload, Folder, InsertDriveFile, Image, VideoFile, AudioFile, PictureAsPdf, Article, Close, Upload, Description } from '@mui/icons-material'
import { createSemanticApi } from './semanticApiFactory'
import type { MediaFile } from './semanticApiInterface'

interface MediaPickerProps {
  open: boolean
  onClose: () => void
  onSelectMedia: (filePath: string) => void
  accept?: string
  label?: string
}

// Media picker component that uses centralized API service
export default function MediaPicker({ open, onClose, onSelectMedia, accept = 'image/*', label = 'Select Media' }: MediaPickerProps) {
  const theme = useTheme()
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const semanticApi = createSemanticApi()

  const loadMediaFiles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const files = await semanticApi.listAllMedia()
      setMediaFiles(files)
    } catch (err) {
      console.error('Failed to load media files:', err)
      setError('Failed to load media files')
      setMediaFiles([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadMediaFiles()
    }
  }, [open, loadMediaFiles])

  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsUploading(true)
    setUploadError(null)
    
    try {
      const uploadedFiles: MediaFile[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const result = await semanticApi.createMediaFile(file.name, file)
        
        if (result) {
          uploadedFiles.push(result)
        }
      }
      
      if (uploadedFiles.length > 0) {
        setMediaFiles(prev => [...prev, ...uploadedFiles])
      }
      
      if (uploadedFiles.length < files.length) {
        setUploadError(`${files.length - uploadedFiles.length} files failed to upload`)
      }
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadError('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [])

  const handleUploadSubmit = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      handleFileUpload(files)
    }
  }

  const isImageFile = (contentType: string) => {
    return contentType.startsWith('image/')
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const filteredMediaFiles = mediaFiles.filter(file => {
    return file.filepath.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          label={label}
          value={open ? mediaFiles.find(file => file.filepath === label)?.filepath : ''}
          onChange={(e) => onSelectMedia(e.target.value)}
          fullWidth
          size="small"
        />
        <Button
          variant="outlined"
          onClick={onClose}
          startIcon={<Image />}
          sx={{ minWidth: 120 }}
        >
          Browse
        </Button>
      </Box>

      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Select Media File</Typography>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label="Upload" />
                <Tab label="Library" />
              </Tabs>

              {tabValue === 0 && (
                // Upload Tab
                <Box sx={{ mb: 3, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>Upload New File</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleUploadSubmit}
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    />
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<Upload />}
                      disabled={isUploading}
                    >
                      {isUploading ? 'Uploading...' : 'Upload Files'}
                    </Button>
                  </Box>
                </Box>
              )}

              {tabValue === 1 && (
                // Library Tab
                <>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>Existing Files</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <TextField
                    label="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {filteredMediaFiles.length === 0 ? (
                      <ListItem>
                        <ListItemText primary="No media files found" />
                      </ListItem>
                    ) : (
                      filteredMediaFiles.map((file) => (
                        <ListItem
                          key={file.filepath}
                          onClick={() => onSelectMedia(file.filepath)}
                          sx={{
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            mb: 1,
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'action.hover'
                            }
                          }}
                        >
                          <ListItemButton>
                            <ListItemIcon>
                              {isImageFile(file.contentType) ? <Image /> : <Description />}
                            </ListItemIcon>
                            <ListItemText
                              primary={file.filepath}
                              secondary={`${file.contentType} • ${(file.size / 1024).toFixed(1)} KB${file.lastModified ? ` • ${new Date(file.lastModified).toLocaleDateString()}` : ''}`}
                            />
                          </ListItemButton>
                        </ListItem>
                      )))
                    }
                  </List>
                </>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}