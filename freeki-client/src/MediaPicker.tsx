import React, { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  IconButton,
  Typography,
  CircularProgress
} from '@mui/material'
import {
  Image,
  Upload,
  Close,
  Folder,
  Description
} from '@mui/icons-material'

interface MediaFile {
  filepath: string
  size: number
  contentType: string
}

interface MediaPickerProps {
  value: string
  onChange: (filePath: string) => void
  accept?: string
  label?: string
}

// Reusable media picker component that will be enhanced later
function MediaPicker({ value, onChange, accept = 'image/*', label = 'Select Media' }: MediaPickerProps) {
  const [open, setOpen] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const handleOpen = async () => {
    setOpen(true)
    setLoading(true)
    
    try {
      // TEMPORARY: Mock media files for testing
      // TODO: Replace with actual API call to /api/media
      await new Promise(resolve => setTimeout(resolve, 500))
      setMediaFiles([
        { filepath: '/logo.png', size: 2048, contentType: 'image/png' },
        { filepath: '/banner.jpg', size: 8192, contentType: 'image/jpeg' },
        { filepath: '/icon.svg', size: 1024, contentType: 'image/svg+xml' }
      ])
    } catch (error) {
      console.warn('Failed to load media files:', error)
      setMediaFiles([])
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setUploadFile(null)
  }

  const handleSelect = (filePath: string) => {
    onChange(filePath)
    handleClose()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadFile(file)
    }
  }

  const handleUploadSubmit = async () => {
    if (!uploadFile) return

    setLoading(true)
    try {
      // TEMPORARY: Mock upload for testing
      // TODO: Replace with actual API call to /api/media
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newFilePath = `/uploads/${uploadFile.name}`
      onChange(newFilePath)
      handleClose()
    } catch (error) {
      console.warn('Failed to upload file:', error)
    } finally {
      setLoading(false)
    }
  }

  const isImageFile = (contentType: string) => {
    return contentType.startsWith('image/')
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          size="small"
        />
        <Button
          variant="outlined"
          onClick={handleOpen}
          startIcon={<Image />}
          sx={{ minWidth: 120 }}
        >
          Browse
        </Button>
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Select Media File</Typography>
            <IconButton onClick={handleClose}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Upload Section */}
              <Box sx={{ mb: 3, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>Upload New File</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input
                    type="file"
                    accept={accept}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="media-upload-input"
                  />
                  <label htmlFor="media-upload-input">
                    <Button variant="outlined" component="span" startIcon={<Upload />}>
                      Choose File
                    </Button>
                  </label>
                  {uploadFile && (
                    <>
                      <Typography variant="body2">{uploadFile.name}</Typography>
                      <Button
                        variant="contained"
                        onClick={handleUploadSubmit}
                        disabled={loading}
                      >
                        Upload
                      </Button>
                    </>
                  )}
                </Box>
              </Box>

              {/* Media Files List */}
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Existing Files</Typography>
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {mediaFiles.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No media files found" />
                  </ListItem>
                ) : (
                  mediaFiles.map((file) => (
                    <ListItem
                      key={file.filepath}
                      button
                      onClick={() => handleSelect(file.filepath)}
                      sx={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                        mb: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemIcon>
                        {isImageFile(file.contentType) ? <Image /> : <Description />}
                      </ListItemIcon>
                      <ListItemText
                        primary={file.filepath}
                        secondary={`${file.contentType} • ${(file.size / 1024).toFixed(1)} KB`}
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default MediaPicker