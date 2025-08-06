






import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Box,
  TextField,
  Slider,
  Typography,
  Paper,
  Popover,
  Button,
  Snackbar
} from '@mui/material'
import { ContentCopy } from '@mui/icons-material'
import {
  hexToRgba,
  rgbaToHex,
  rgbToHsv,
  hsvToRgb,
  getLuminance,
  contrastRatio,
  getBestFontColor,
  copyToClipboard
} from './colorUtils'

// Admin panel color constants for light and dark - updated to match AdminSettingsDialog
const ADMIN_LIGHT_STYLE = {
  BG_COLOR: '#f7fafd',
  BORDER_COLOR: '#b0c4de',
  TEXT_PRIMARY: '#222c36',
  TEXT_SECONDARY: '#7da4c7',
  SHADOW_COLOR: '#00000055',
  SIDEBAR_HOVER: '#eaf3fb',
  STYLE_BOX_BG: '#eaf3fb'
}
const ADMIN_DARK_STYLE = {
  BG_COLOR: '#1a1d21',
  BORDER_COLOR: '#4a5057',
  TEXT_PRIMARY: '#d8d8d8',
  TEXT_SECONDARY: '#9aa1a9',
  SHADOW_COLOR: '#ffffff33',
  SIDEBAR_HOVER: '#252a32',
  STYLE_BOX_BG: '#252a32'
}

interface AdvancedColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  disabled?: boolean
  themeMode?: 'light' | 'dark'
}

// Color state management - centralized and explicit
interface ColorState {
  h: number  // 0-360
  s: number  // 0-100
  v: number  // 0-100
  a: number  // 0-100
}

// PERFORMANCE FIX: Singleton canvas cache to prevent recreation per instance
let globalColorCanvas: HTMLCanvasElement | null = null
let canvasGenerationPromise: Promise<HTMLCanvasElement> | null = null

// Generate color picker canvas - cached globally for all instances
const getColorPickerCanvas = (): Promise<HTMLCanvasElement> => {
  // Return existing canvas if available
  if (globalColorCanvas) {
    return Promise.resolve(globalColorCanvas)
  }
  
  // Return existing promise if generation is in progress
  if (canvasGenerationPromise) {
    return canvasGenerationPromise
  }
  
  // Create new canvas generation promise
  canvasGenerationPromise = new Promise((resolve) => {
    // Use requestIdleCallback for better performance if available
    const generateCanvas = () => {
      const canvas = generateColorPickerCanvas(200, 120)
      globalColorCanvas = canvas
      canvasGenerationPromise = null
      resolve(canvas)
    }
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(generateCanvas, { timeout: 100 })
    } else {
      setTimeout(generateCanvas, 0)
    }
  })
  
  return canvasGenerationPromise
}

// Generate color picker canvas
const generateColorPickerCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  
  if (!ctx) return canvas
  
  // Clear canvas first
  ctx.clearRect(0, 0, width, height)
  
  // Try pixel-by-pixel method first
  try {
    const imageData = ctx.createImageData(width, height)
    const data = imageData.data
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const h = (x / width) * 360
        const s = ((height - y) / height) * 100
        const v = 100
        
        const rgb = hsvToRgb(h, s, v)
        const index = (y * width + x) * 4
        
        data[index] = rgb.r     // Red
        data[index + 1] = rgb.g // Green
        data[index + 2] = rgb.b // Blue
        data[index + 3] = 255   // Alpha
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    // Test if the data was written correctly
    const testPixel = ctx.getImageData(width - 1, 0, 1, 1).data
    if (testPixel[0] > 200 && testPixel[1] < 50 && testPixel[2] < 50) {
      // Pixel method worked - red pixel at top right
      return canvas
    }
  } catch {
    // Silent fallback to gradient method
  }
  
  // Fallback: Use gradient method
  const hueGradient = ctx.createLinearGradient(0, 0, width, 0)
  hueGradient.addColorStop(0, '#ff0000')    // Red
  hueGradient.addColorStop(0.16, '#ffff00') // Yellow  
  hueGradient.addColorStop(0.33, '#00ff00') // Green
  hueGradient.addColorStop(0.5, '#00ffff')  // Cyan
  hueGradient.addColorStop(0.66, '#0000ff') // Blue
  hueGradient.addColorStop(0.83, '#ff00ff') // Magenta
  hueGradient.addColorStop(1, '#ff0000')    // Red
  
  ctx.fillStyle = hueGradient
  ctx.fillRect(0, 0, width, height)
  
  // Create vertical saturation overlay (white to transparent)
  const satGradient = ctx.createLinearGradient(0, 0, 0, height)
  satGradient.addColorStop(0, 'rgba(255,255,255,0)')   // Transparent at top
  satGradient.addColorStop(1, 'rgba(255,255,255,1)')   // White at bottom
  
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = satGradient
  ctx.fillRect(0, 0, width, height)
  
  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over'
  
  return canvas
}

// Get color from canvas
const getColorFromCanvas = (canvas: HTMLCanvasElement, x: number, y: number): string => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return '#000000'
  
  x = Math.max(0, Math.min(canvas.width - 1, Math.round(x)))
  y = Math.max(0, Math.min(canvas.height - 1, Math.round(y)))
  
  const imageData = ctx.getImageData(x, y, 1, 1)
  const [r, g, b] = imageData.data
  
  return rgbaToHex(r, g, b)
}

export default function AdvancedColorPicker({ value, onChange, label, disabled = false, themeMode = 'light' }: AdvancedColorPickerProps) {
  const style = themeMode === 'dark' ? ADMIN_DARK_STYLE : ADMIN_LIGHT_STYLE

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [colorCanvas, setColorCanvas] = useState<HTMLCanvasElement | null>(null)
  
  // Track input focus state to prevent interference while typing
  const [isHexInputFocused, setIsHexInputFocused] = useState(false)

  // Capture original value when popup opens
  const [originalValue, setOriginalValue] = useState<string>('')
  const [workingValue, setWorkingValue] = useState<string>(value)
  
  // Centralized color state management
  const [colorState, setColorState] = useState<ColorState>(() => {
    const rgba = hexToRgba(value)
    const hsv = rgbToHsv(rgba.r, rgba.g, rgba.b)
    return { ...hsv, a: rgba.a * 100 }
  })

  const updateStateFromHex = useCallback((hex: string): ColorState => {
    const rgba = hexToRgba(hex)
    const hsv = rgbToHsv(rgba.r, rgba.g, rgba.b)
    const newState = { ...hsv, a: rgba.a * 100 }
    setColorState(newState)
    return newState
  }, [])

  const open = Boolean(anchorEl)
  const contrastingColor = getBestFontColor(workingValue)

  // ESCAPE KEY: Handle escape to cancel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        event.stopPropagation()
        handleCancel()
      }
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown, true)
      return () => document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [open])

  // CANVAS GENERATION: On mount only - use singleton cache
  useEffect(() => {
    getColorPickerCanvas().then(canvas => {
      setColorCanvas(canvas)
    })
  }, [])

  // EXTERNAL VALUE CHANGES: Only when dialog is closed and not typing
  useEffect(() => {
    if (!open && !isHexInputFocused) {
      setWorkingValue(value)
      updateStateFromHex(value)
    }
  }, [value, open, isHexInputFocused, updateStateFromHex])

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!disabled) {
      // Capture original value when opening
      setOriginalValue(value)
      setWorkingValue(value)
      updateStateFromHex(value)
      setAnchorEl(event.currentTarget)
      
      // Focus and select input after popover opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        }
        
        // Redraw canvas
        if (canvasRef.current && colorCanvas) {
          const ctx = canvasRef.current.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, 200, 120)
            ctx.drawImage(colorCanvas, 0, 0, 200, 120)
          }
        }
      }, 50)
    }
  }
  
  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleCancel = () => {
    // Cancel: revert to original value
    setWorkingValue(originalValue)
    updateStateFromHex(originalValue)
    onChange(originalValue)
    setAnchorEl(null)
  }

  const handleOK = () => {
    // OK: accept the working value
    onChange(workingValue)
    setAnchorEl(null)
  }

  // HEX INPUT: Only updates display value while typing - NO slider updates
  const handleHexChange = useCallback((newHex: string) => {
    setWorkingValue(newHex) // Just update display - no slider interference while typing
  }, [])

  // SLIDER CHANGE: Updates workingValue and colorState, calls onChange for live preview
  const handleSliderChange = useCallback((component: 'h' | 's' | 'v' | 'a', newValue: number) => {
    const newState = { ...colorState, [component]: newValue }
    setColorState(newState)
    
    const rgb = hsvToRgb(newState.h, newState.s, newState.v)
    const hex = rgbaToHex(rgb.r, rgb.g, rgb.b, newState.a / 100)
    
    setWorkingValue(hex)
    onChange(hex) // Live preview - this should update global state immediately
  }, [colorState, onChange])

  // CANVAS CLICK: Updates workingValue and colorState, calls onChange for live preview
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!colorCanvas) return
    
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const canvasX = (x / rect.width) * colorCanvas.width
    const canvasY = (y / rect.height) * colorCanvas.height
    
    const color = getColorFromCanvas(colorCanvas, canvasX, canvasY)
    const rgba = hexToRgba(color)
    const hsv = rgbToHsv(rgba.r, rgba.g, rgba.b)
    const newState = { ...hsv, a: colorState.a }
    
    const hex = rgbaToHex(rgba.r, rgba.g, rgba.b, newState.a / 100)
    
    setColorState(newState)
    setWorkingValue(hex)
    onChange(hex) // Live preview - this should update global state immediately
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.buttons === 1) {
      handleCanvasClick(event)
    }
  }

  // HEX INPUT SUPPORT: Just handle focus state, no onChange calls
  const handleHexKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (inputRef.current) {
        inputRef.current.blur()
      }
    }
  }

  const handleHexBlur = () => {
    setIsHexInputFocused(false)
    
    // Update sliders and call onChange ONLY after losing focus
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{4})$/;
    if (hexRegex.test(workingValue)) {
      // Normalize hex if needed
      let fullHex = workingValue
      if (workingValue.length === 4) {
        fullHex = `#${workingValue[1]}${workingValue[1]}${workingValue[2]}${workingValue[2]}${workingValue[3]}${workingValue[3]}`
      } else if (workingValue.length === 5) {
        fullHex = `#${workingValue[1]}${workingValue[1]}${workingValue[2]}${workingValue[2]}${workingValue[3]}${workingValue[3]}${workingValue[4]}${workingValue[4]}`
      }
      
      setWorkingValue(fullHex)
      updateStateFromHex(fullHex) // Update sliders only after losing focus
      onChange(fullHex) // Call onChange only after losing focus
    }
  }

  const handleHexFocus = () => {
    if (inputRef.current) {
      inputRef.current.select()
    }
    setIsHexInputFocused(true)
  }

  const handleHexClick = () => {
    if (inputRef.current) {
      inputRef.current.select()
    }
  }

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
            width: 22,
            height: 22,
            backgroundColor: value,
            border: `1px solid ${style.BORDER_COLOR}`,
            borderRadius: 'var(--freeki-border-radius)',
            cursor: disabled ? 'default' : 'pointer',
            position: 'relative',
            '&:hover': {
              opacity: disabled ? 1 : 0.8,
              boxShadow: `0 0 0 2px ${style.BORDER_COLOR}`
            }
          }}
          title={`${label ? label + ': ' : ''}${typeof value === 'string' ? value.toUpperCase() : ''}`}
          aria-label={`${label ? label + ': ' : ''}Edit color ${typeof value === 'string' ? value.toUpperCase() : ''}`}
        />
        
        {label && (
          <Typography variant="body2" sx={{ color: style.TEXT_PRIMARY, fontSize: '0.875rem' }}>
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
            backgroundColor: style.BG_COLOR,
            border: `1px solid ${style.BORDER_COLOR}`,
            borderRadius: 'var(--freeki-border-radius)',
            boxShadow: `0 8px 32px ${style.SHADOW_COLOR}`
          }
        }}
      >
        <Paper sx={{ 
          p: 1.5, 
          width: 280,
          backgroundColor: style.BG_COLOR,
          boxShadow: `0 8px 32px ${style.SHADOW_COLOR}`
        }}>
          {/* Cancel and OK buttons - moved to top */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mb: 1.5 }}>
            <Button
              variant="text"
              size="small"
              onClick={handleCancel}
              sx={{
                fontSize: '0.75rem',
                px: 2,
                py: 0.5,
                color: style.TEXT_SECONDARY,
                '&:hover': {
                  backgroundColor: style.SIDEBAR_HOVER,
                  color: style.TEXT_PRIMARY
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleOK}
              sx={{
                fontSize: '0.75rem',
                px: 2,
                py: 0.5,
                backgroundColor: style.TEXT_SECONDARY,
                color: style.BG_COLOR,
                '&:hover': {
                  backgroundColor: style.TEXT_PRIMARY,
                  color: style.BG_COLOR
                }
              }}
            >
              OK
            </Button>
          </Box>

          {/* Image-based color picker */}
          {colorCanvas && (
            <Box sx={{ mb: 1.5 }}>
              <canvas
                ref={canvasRef}
                width={200}
                height={120}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMouseMove}
                style={{
                  width: '100%',
                  height: '120px',
                  border: `1px solid ${style.BORDER_COLOR}`,
                  borderRadius: 'var(--freeki-border-radius)',
                  cursor: 'crosshair'
                }}
                title="Click to select a color"
                aria-label="Color picker canvas - click to select a color"
              />
            </Box>
          )}

          {/* HSV Sliders */}
          <Box sx={{ mb: 1.5 }}>
            {/* Hue slider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Typography variant="caption" sx={{ 
                color: style.TEXT_SECONDARY,
                fontSize: '0.7rem',
                minWidth: '28px',
                textAlign: 'right'
              }}>
                H:
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Slider
                  value={colorState.h}
                  onChange={(_, value) => handleSliderChange('h', value as number)}
                  min={0}
                  max={360}
                  size="small"
                  sx={{
                    '& .MuiSlider-track': {
                      backgroundColor: 'transparent',
                      border: 'none',
                      height: 6
                    },
                    '& .MuiSlider-rail': {
                      background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                      height: 6,
                      opacity: 1
                    },
                    '& .MuiSlider-thumb': {
                      borderRadius: 1,
                      width: 18,
                      height: 18,
                      backgroundColor: style.STYLE_BOX_BG,
                      boxShadow: '0 2px 8px #00000033',
                      border: `2px solid ${style.BORDER_COLOR}`
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ 
                color: style.TEXT_SECONDARY,
                fontSize: '0.7rem',
                minWidth: '30px',
                textAlign: 'left'
              }}>
                {Math.round(colorState.h)}°
              </Typography>
            </Box>
            
            {/* Saturation slider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Typography variant="caption" sx={{ 
                color: style.TEXT_SECONDARY,
                fontSize: '0.7rem',
                minWidth: '28px',
                textAlign: 'right'
              }}>
                S:
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Slider
                  value={colorState.s}
                  onChange={(_, value) => handleSliderChange('s', value as number)}
                  min={0}
                  max={100}
                  size="small"
                  sx={{
                    '& .MuiSlider-track': {
                      backgroundColor: `hsl(${colorState.h}, 100%, 50%)`,
                      height: 6
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: style.STYLE_BOX_BG,
                      opacity: 1,
                      height: 6
                    },
                    '& .MuiSlider-thumb': {
                      borderRadius: 1,
                      width: 18,
                      height: 18,
                      backgroundColor: style.STYLE_BOX_BG,
                      boxShadow: '0 2px 8px #00000033',
                      border: `2px solid ${style.BORDER_COLOR}`
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ 
                color: style.TEXT_SECONDARY,
                fontSize: '0.7rem',
                minWidth: '30px',
                textAlign: 'left'
              }}>
                {Math.round(colorState.s)}%
              </Typography>
            </Box>
            
            {/* Value slider */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ 
                color: style.TEXT_SECONDARY,
                fontSize: '0.7rem',
                minWidth: '28px',
                textAlign: 'right'
              }}>
                V:
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Slider
                  value={colorState.v}
                  onChange={(_, value) => handleSliderChange('v', value as number)}
                  min={0}
                  max={100}
                  size="small"
                  sx={{
                    '& .MuiSlider-track': {
                      backgroundColor: style.TEXT_PRIMARY,
                      height: 6
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: style.STYLE_BOX_BG,
                      opacity: 1,
                      height: 6
                    },
                    '& .MuiSlider-thumb': {
                      borderRadius: 1,
                      width: 18,
                      height: 18,
                      backgroundColor: style.STYLE_BOX_BG,
                      boxShadow: '0 2px 8px #00000033',
                      border: `2px solid ${style.BORDER_COLOR}`
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ 
                color: style.TEXT_SECONDARY,
                fontSize: '0.7rem',
                minWidth: '30px',
                textAlign: 'left'
              }}>
                {Math.round(colorState.v)}%
              </Typography>
            </Box>

            {/* Alpha slider - new component for alpha channel */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ 
                color: style.TEXT_SECONDARY,
                fontSize: '0.7rem',
                minWidth: '28px',
                textAlign: 'right'
              }}>
                A:
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Slider
                  value={colorState.a}
                  onChange={(_, value) => handleSliderChange('a', value as number)}
                  min={0}
                  max={100}
                  size="small"
                  sx={{
                    '& .MuiSlider-track': {
                      backgroundColor: '#555',
                      height: 6
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: style.STYLE_BOX_BG,
                      opacity: 1,
                      height: 6
                    },
                    '& .MuiSlider-thumb': {
                      borderRadius: 1,
                      width: 18,
                      height: 18,
                      backgroundColor: style.STYLE_BOX_BG,
                      boxShadow: '0 2px 8px #00000033',
                      border: `2px solid ${style.BORDER_COLOR}`
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ 
                color: style.TEXT_SECONDARY,
                fontSize: '0.7rem',
                minWidth: '30px',
                textAlign: 'left'
              }}>
                {Math.round(colorState.a)}%
              </Typography>
            </Box>
          </Box>
          
          {/* Copy buttons */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopy sx={{ fontSize: '1rem' }} />}
              onClick={() => handleCopyColor(workingValue, 'Current Color')}
              sx={{
                flex: 1,
                fontSize: '0.75rem',
                py: 0.5,
                backgroundColor: workingValue,
                color: getBestFontColor(workingValue),
                borderColor: getBestFontColor(workingValue),
                boxShadow: `0 0 0 1px ${style.BORDER_COLOR}`,
                '&:hover': {
                  backgroundColor: workingValue,
                  opacity: 0.8,
                  boxShadow: `0 0 0 1px ${style.BORDER_COLOR}`,
                }
              }}
            >
              Copy
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopy sx={{ fontSize: '1rem' }} />}
              onClick={() => handleCopyColor(contrastingColor, 'Contrasting')}
              sx={{
                flex: 1,
                fontSize: '0.75rem',
                py: 0.5,
                backgroundColor: contrastingColor,
                color: getBestFontColor(contrastingColor),
                borderColor: getBestFontColor(contrastingColor),
                boxShadow: `0 0 0 1px ${style.BORDER_COLOR}`,
                '&:hover': {
                  backgroundColor: contrastingColor,
                  opacity: 0.8,
                  boxShadow: `0 0 0 1px ${style.BORDER_COLOR}`,
                }
              }}
            >
              Contrasting
            </Button>
          </Box>

          {/* Hex input - moved to bottom */}
          <Box sx={{ mb: 0 }}>
            <TextField
              inputRef={el => { inputRef.current = el; }}
              size="small"
              value={workingValue}
              onChange={(e) => handleHexChange(e.target.value)}
              onFocus={handleHexFocus}
              onBlur={handleHexBlur}
              onKeyDown={handleHexKeyDown}
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
                maxLength: 9
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: style.BG_COLOR,
                  color: style.TEXT_PRIMARY,
                  '& fieldset': {
                    borderColor: style.BORDER_COLOR,
                  },
                  '&:hover fieldset': {
                    borderColor: style.TEXT_PRIMARY,
                  }
                }
              }}
              disabled={false}
              aria-label="Color hex value"
            />
          </Box>
        </Paper>
      </Popover>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: style.BG_COLOR,
            color: style.TEXT_PRIMARY,
            border: `1px solid ${style.BORDER_COLOR}`
          }
        }}
      />
    </>
  )
}