import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Box,
  TextField,
  Slider,
  Typography,
  Paper,
  Popover,
  IconButton,
  Button,
  Snackbar
} from '@mui/material'
import { ContentCopy, SwapHoriz } from '@mui/icons-material'

interface AdvancedColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  disabled?: boolean
}

// Color conversion utilities
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substr(0, 2), 16)
  const g = parseInt(cleanHex.substr(2, 2), 16)
  const b = parseInt(cleanHex.substr(4, 2), 16)
  return { r, g, b }
}

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
  r /= 255
  g /= 255
  b /= 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  
  let h = 0
  if (diff !== 0) {
    if (max === r) h = ((g - b) / diff) % 6
    else if (max === g) h = (b - r) / diff + 2
    else h = (r - g) / diff + 4
  }
  h = Math.round(h * 60)
  if (h < 0) h += 360
  
  const s = max === 0 ? 0 : diff / max
  const v = max
  
  return { h, s: s * 100, v: v * 100 }
}

const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  h /= 60
  s /= 100
  v /= 100
  
  const c = v * s
  const x = c * (1 - Math.abs((h % 2) - 1))
  const m = v - c
  
  let r = 0, g = 0, b = 0
  
  if (h >= 0 && h < 1) { r = c; g = x; b = 0 }
  else if (h >= 1 && h < 2) { r = x; g = c; b = 0 }
  else if (h >= 2 && h < 3) { r = 0; g = c; b = x }
  else if (h >= 3 && h < 4) { r = 0; g = x; b = c }
  else if (h >= 4 && h < 5) { r = x; g = 0; b = c }
  else if (h >= 5 && h < 6) { r = c; g = 0; b = x }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

// Calculate complementary color (opposite on color wheel)
const getComplementaryColor = (hex: string): string => {
  const rgb = hexToRgb(hex)
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
  
  // Rotate hue by 180 degrees for true complementary color
  const complementaryHue = (hsv.h + 180) % 360
  const complementaryRgb = hsvToRgb(complementaryHue, hsv.s, hsv.v)
  
  return rgbToHex(complementaryRgb.r, complementaryRgb.g, complementaryRgb.b)
}

// Enhanced copy text to clipboard with better error handling and browser compatibility
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // Modern Clipboard API approach
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    
    // Fallback approach for older browsers or non-secure contexts
    return new Promise((resolve) => {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      textArea.style.opacity = '0'
      textArea.style.pointerEvents = 'none'
      textArea.setAttribute('readonly', '')
      textArea.setAttribute('contenteditable', 'true')
      
      document.body.appendChild(textArea)
      
      // Focus and select
      textArea.focus()
      textArea.select()
      textArea.setSelectionRange(0, 99999) // For mobile devices
      
      try {
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        resolve(successful)
      } catch (err) {
        console.error('Fallback copy failed:', err)
        document.body.removeChild(textArea)
        resolve(false)
      }
    })
  } catch (err) {
    console.error('Copy to clipboard failed:', err)
    return false
  }
}

export default function AdvancedColorPicker({ value, onChange, label, disabled = false }: AdvancedColorPickerProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Track HSV state independently - this is the authoritative state
  const currentRgb = hexToRgb(value)
  const currentHsv = rgbToHsv(currentRgb.r, currentRgb.g, currentRgb.b)
  const [hsvState, setHsvState] = useState(currentHsv)

  // Update HSV state when value prop changes (but not during slider interactions)
  useEffect(() => {
    const newHsv = rgbToHsv(currentRgb.r, currentRgb.g, currentRgb.b)
    setHsvState(newHsv)
  }, [value])

  const complementaryColor = getComplementaryColor(value)

  const open = Boolean(anchorEl)

  // Select hex string and focus when popover opens (guaranteed after render)
  useEffect(() => {
    if (open) {
      // Use requestAnimationFrame to ensure input is rendered
      const selectInput = () => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        } else {
          // Try again next frame if not available
          requestAnimationFrame(selectInput);
        }
      };
      requestAnimationFrame(selectInput);
    }
  }, [open]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget)
    }
  }
  
  const handleClose = () => {
    setAnchorEl(null)
  }
  
  const handleHexChange = useCallback((newHex: string) => {
    // Validate hex format
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
    if (hexRegex.test(newHex)) {
      // If valid, normalize 3-digit hex to 6-digit
      const fullHex = newHex.length === 4 
        ? `#${newHex[1]}${newHex[1]}${newHex[2]}${newHex[2]}${newHex[3]}${newHex[3]}` 
        : newHex
      
      onChange(fullHex)
      
      // Update HSV state based on new hex
      const rgb = hexToRgb(fullHex)
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
      setHsvState(hsv)
    }
  }, [onChange])
  
  const handleHexFocus = () => {
    // Select all text when hex input is focused
    if (inputRef.current) {
      inputRef.current.select()
    }
  }

  const handleHexClick = () => {
    // Also select all text when hex input is clicked
    if (inputRef.current) {
      inputRef.current.select()
    }
  }

  const handleFlipColors = () => {
    // Swap current color with complementary color
    onChange(complementaryColor)
    setSnackbarMessage(`Color flipped to complement: ${complementaryColor}`)
    setSnackbarOpen(true)
  }
  
  const handleSliderChange = useCallback((component: 'h' | 's' | 'v', newValue: number) => {
    // Update HSV state - this is authoritative
    const newHsv = { ...hsvState, [component]: newValue }
    setHsvState(newHsv)
    
    // Convert to RGB and hex, then notify parent
    const rgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v)
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
    onChange(hex)
  }, [hsvState, onChange])
  
  const handleCopyColor = async (colorToCopy: string, colorName: string) => {
    const success = await copyToClipboard(colorToCopy)
    if (success) {
      setSnackbarMessage(`${colorName} copied: ${colorToCopy}`)
      setSnackbarOpen(true)
    } else {
      setSnackbarMessage('Copy failed - please copy manually from the hex field')
      setSnackbarOpen(true)
    }
  }
  
  return (
    <>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.5,
        position: 'relative'
      }}>
        {/* Color preview button - clean color box without hex text */}
        <Box
          onClick={handleClick}
          sx={{
            width: 32,
            height: 32,
            backgroundColor: value,
            border: '1px solid var(--freeki-border-color)',
            borderRadius: 0.5,
            cursor: disabled ? 'default' : 'pointer',
            position: 'relative',
            '&:hover': {
              opacity: disabled ? 1 : 0.8,
              boxShadow: '0 0 0 2px rgba(0,0,0,0.1)'
            }
          }}
          title={`${label ? label + ': ' : ''}${value.toUpperCase()}`}
          aria-label={`${label ? label + ': ' : ''}Edit color ${value.toUpperCase()}`}
        />
        
        {label && (
          <Typography variant="body2" sx={{ color: 'var(--freeki-text-primary)', fontSize: '0.875rem' }}>
            {label}
          </Typography>
        )}
      </Box>
      
      {/* Compact color picker popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--freeki-view-mode-background)',
            border: '1px solid var(--freeki-border-color)',
            borderRadius: 1,
            boxShadow: '0 8px 32px rgba(0,0,0,0.32)'
          }
        }}
      >
        <Paper sx={{ 
          p: 1.5, 
          width: 280,
          backgroundColor: 'var(--freeki-view-mode-background)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.32)'
        }}>
          {/* Hex input with flip button */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
            <TextField
              inputRef={el => { inputRef.current = el; }}
              size="small"
              value={value}
              onChange={(e) => handleHexChange(e.target.value)}
              onFocus={handleHexFocus}
              onClick={handleHexClick}
              placeholder="#000000"
              fullWidth
              inputProps={{
                style: { 
                  fontFamily: 'monospace', 
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  fontSize: '0.9rem'
                },
                maxLength: 7
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'var(--freeki-view-mode-background)',
                  color: 'var(--freeki-text-primary)',
                  '& fieldset': {
                    borderColor: 'var(--freeki-border-color)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'var(--freeki-text-primary)',
                  }
                }
              }}
              disabled={disabled}
              aria-label="Color hex value"
            />
            <IconButton
              size="small"
              onClick={handleFlipColors}
              disabled={disabled}
              title="Flip to complementary color"
              aria-label="Flip to complementary color"
              sx={{
                color: 'var(--freeki-text-primary)',
                border: '1px solid var(--freeki-border-color)',
                borderRadius: 1,
                width: 32,
                height: 32,
                '&:hover': {
                  backgroundColor: 'var(--freeki-sidebar-hover-background)',
                  borderColor: 'var(--freeki-text-primary)'
                }
              }}
            >
              <SwapHoriz fontSize="small" />
            </IconButton>
          </Box>
          
          {/* Copy buttons */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopy sx={{ fontSize: '1rem' }} />}
              onClick={() => handleCopyColor(value, 'Current Color')}
              sx={{
                flex: 1,
                fontSize: '0.75rem',
                py: 0.5,
                backgroundColor: value,
                color: currentHsv.v > 50 ? '#000' : '#fff',
                borderColor: currentHsv.v > 50 ? '#000' : '#fff',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.6)',
                '&:hover': {
                  backgroundColor: value,
                  opacity: 0.8,
                  boxShadow: '0 0 0 1px rgba(255,255,255,1)',
                }
              }}
            >
              Copy
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopy sx={{ fontSize: '1rem' }} />}
              onClick={() => handleCopyColor(complementaryColor, 'Complement')}
              sx={{
                flex: 1,
                fontSize: '0.75rem',
                py: 0.5,
                backgroundColor: complementaryColor,
                color: (() => {
                  const compRgb = hexToRgb(complementaryColor)
                  const compHsv = rgbToHsv(compRgb.r, compRgb.g, compRgb.b)
                  return compHsv.v > 50 ? '#000' : '#fff'
                })(),
                borderColor: (() => {
                  const compRgb = hexToRgb(complementaryColor)
                  const compHsv = rgbToHsv(compRgb.r, compRgb.g, compRgb.b)
                  return compHsv.v > 50 ? '#000' : '#fff'
                })(),
                boxShadow: '0 0 0 1px rgba(255,255,255,0.6)',
                '&:hover': {
                  backgroundColor: complementaryColor,
                  opacity: 0.8,
                  boxShadow: '0 0 0 1px rgba(255,255,255,1)',
                }
              }}
            >
              Complement
            </Button>
          </Box>
          
          {/* Compact HSV Sliders with inline labels */}
          <Box>
            {/* Hue slider with inline label */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Typography variant="caption" sx={{ 
                color: 'var(--freeki-text-secondary)',
                fontSize: '0.7rem',
                minWidth: '28px',
                textAlign: 'right'
              }}>
                H:
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Slider
                  value={hsvState.h}
                  onChange={(_, value) => handleSliderChange('h', value as number)}
                  min={0}
                  max={360}
                  size="small"
                  sx={{
                    '& .MuiSlider-track': {
                      background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                      border: 'none',
                      height: 6
                    },
                    '& .MuiSlider-rail': {
                      background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                      height: 6
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: 'var(--freeki-text-primary)',
                      width: 16,
                      height: 16
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ 
                color: 'var(--freeki-text-secondary)',
                fontSize: '0.7rem',
                minWidth: '30px',
                textAlign: 'left'
              }}>
                {Math.round(hsvState.h)}°
              </Typography>
            </Box>
            
            {/* Saturation slider with inline label */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Typography variant="caption" sx={{ 
                color: 'var(--freeki-text-secondary)',
                fontSize: '0.7rem',
                minWidth: '28px',
                textAlign: 'right'
              }}>
                S:
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Slider
                  value={hsvState.s}
                  onChange={(_, value) => handleSliderChange('s', value as number)}
                  min={0}
                  max={100}
                  size="small"
                  sx={{
                    '& .MuiSlider-track': {
                      backgroundColor: `hsl(${hsvState.h}, 100%, 50%)`,
                      height: 6
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: '#ccc',
                      height: 6
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: 'var(--freeki-text-primary)',
                      width: 16,
                      height: 16
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ 
                color: 'var(--freeki-text-secondary)',
                fontSize: '0.7rem',
                minWidth: '30px',
                textAlign: 'left'
              }}>
                {Math.round(hsvState.s)}%
              </Typography>
            </Box>
            
            {/* Value slider with inline label */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ 
                color: 'var(--freeki-text-secondary)',
                fontSize: '0.7rem',
                minWidth: '28px',
                textAlign: 'right'
              }}>
                V:
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Slider
                  value={hsvState.v}
                  onChange={(_, value) => handleSliderChange('v', value as number)}
                  min={0}
                  max={100}
                  size="small"
                  sx={{
                    '& .MuiSlider-track': {
                      backgroundColor: 'var(--freeki-text-primary)',
                      height: 6
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: '#333',
                      height: 6
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: 'var(--freeki-text-primary)',
                      width: 16,
                      height: 16
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ 
                color: 'var(--freeki-text-secondary)',
                fontSize: '0.7rem',
                minWidth: '30px',
                textAlign: 'left'
              }}>
                {Math.round(hsvState.v)}%
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Popover>
      
      {/* Copy confirmation snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: 'var(--freeki-view-mode-background)',
            color: 'var(--freeki-text-primary)',
            border: '1px solid var(--freeki-border-color)'
          }
        }}
      />
    </>
  )
}