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

// Admin panel color constants for light and dark
const ADMIN_LIGHT_STYLE = {
  BG_COLOR: '#f7fafd',
  BORDER_COLOR: '#b0c4de',
  TEXT_PRIMARY: '#222c36',
  TEXT_SECONDARY: '#7da4c7',
  SHADOW_COLOR: '#00000055',
  SIDEBAR_HOVER: '#eaf3fb'
}
const ADMIN_DARK_STYLE = {
  BG_COLOR: '#23272b',
  BORDER_COLOR: '#444444',
  TEXT_PRIMARY: '#e0e0e0',
  TEXT_SECONDARY: '#888888',
  SHADOW_COLOR: '#ffffff33',
  SIDEBAR_HOVER: '#262b31'
}

interface AdvancedColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  disabled?: boolean
  themeMode?: 'light' | 'dark'
}

// Color conversion utilities
const hexToRgba = (hex: string): { r: number; g: number; b: number; a: number } => {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    return { r: 0, g: 0, b: 0, a: 1 }
  }
  
  const cleanHex = hex.replace('#', '')
  let r: number, g: number, b: number, a: number = 1
  
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16)
    g = parseInt(cleanHex[1] + cleanHex[1], 16)
    b = parseInt(cleanHex[2] + cleanHex[2], 16)
  } else if (cleanHex.length === 4) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16)
    g = parseInt(cleanHex[1] + cleanHex[1], 16)
    b = parseInt(cleanHex[2] + cleanHex[2], 16)
    a = parseInt(cleanHex[3] + cleanHex[3], 16) / 255
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substr(0, 2), 16)
    g = parseInt(cleanHex.substr(2, 2), 16)
    b = parseInt(cleanHex.substr(4, 2), 16)
  } else if (cleanHex.length === 8) {
    r = parseInt(cleanHex.substr(0, 2), 16)
    g = parseInt(cleanHex.substr(2, 2), 16)
    b = parseInt(cleanHex.substr(4, 2), 16)
    a = parseInt(cleanHex.substr(6, 2), 16) / 255
  } else {
    return { r: 0, g: 0, b: 0, a: 1 }
  }
  
  return { r, g, b, a }
}

const rgbaToHex = (r: number, g: number, b: number, a: number = 1): string => {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  
  if (a < 1) {
    const alphaHex = toHex(Math.round(a * 255))
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${alphaHex}`
  }
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const rgba = hexToRgba(hex)
  return { r: rgba.r, g: rgba.g, b: rgba.b }
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return rgbaToHex(r, g, b, 1)
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

// Helper functions for aesthetic font color
function hexToRgb2(hex: string): { r: number, g: number, b: number } {
  hex = hex.replace(/^#/, '')
  const bigint = parseInt(hex, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  }
}

function rgbToHex2(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

function rgbToHsv2(r: number, g: number, b: number): { h: number, s: number, v: number } {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0))
    else if (max === g) h = ((b - r) / delta + 2)
    else h = ((r - g) / delta + 4)
    h *= 60
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max }
}

function hsvToRgb2(h: number, s: number, v: number): { r: number, g: number, b: number } {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if (0 <= h && h < 60) [r, g, b] = [c, x, 0]
  else if (60 <= h && h < 120) [r, g, b] = [x, c, 0]
  else if (120 <= h && h < 180) [r, g, b] = [0, c, x]
  else if (180 <= h && h < 240) [r, g, b] = [0, x, c]
  else if (240 <= h && h < 300) [r, g, b] = [x, 0, c]
  else if (300 <= h && h < 360) [r, g, b] = [c, 0, x]
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

function getLuminance(r: number, g: number, b: number): number {
  const linear = (c: number) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const rLin = linear(r), gLin = linear(g), bLin = linear(b)
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}

function contrastRatio(rgb1: { r: number, g: number, b: number }, rgb2: { r: number, g: number, b: number }): number {
  const L1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const L2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
}

// Calculate best aesthetic font color
const getBestFontColor = (bgHex: string): string => {
  const bgRgb = hexToRgb2(bgHex)
  const hsv = rgbToHsv2(bgRgb.r, bgRgb.g, bgRgb.b)

  // Try aesthetic color: complementary
  const newHue = (hsv.h + 180) % 360
  const fontS = Math.min(1, hsv.s + 0.3)
  const fontV = Math.max(0.4, Math.min(1, hsv.v - 0.2))
  const fontRgb = hsvToRgb2(newHue, fontS, fontV)

  // Contrast test
  const contrast = contrastRatio(bgRgb, fontRgb)

  if (contrast >= 4.5) {
    return rgbToHex2(fontRgb.r, fontRgb.g, fontRgb.b)
  }

  // Fall back to black or white
  const white = { r: 255, g: 255, b: 255 }
  const black = { r: 0, g: 0, b: 0 }
  const contrastWhite = contrastRatio(bgRgb, white)
  const contrastBlack = contrastRatio(bgRgb, black)

  return (contrastWhite > contrastBlack) ? '#FFFFFF' : '#000000'
}

// Copy to clipboard
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    
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
      
      textArea.focus()
      textArea.select()
      textArea.setSelectionRange(0, 99999)
      
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
      console.log('Canvas generated successfully using pixel method')
      return canvas
    }
  } catch (error) {
    console.warn('Pixel method failed:', error)
  }
  
  // Fallback: Use gradient method
  console.log('Using gradient fallback method')
  
  // Create horizontal hue gradient
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
  
  return rgbToHex(r, g, b)
}

export default function AdvancedColorPicker({ value, onChange, label, disabled = false, themeMode = 'light' }: AdvancedColorPickerProps) {
  const style = themeMode === 'dark' ? ADMIN_DARK_STYLE : ADMIN_LIGHT_STYLE

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [colorCanvas, setColorCanvas] = useState<HTMLCanvasElement | null>(null)

  const [originalValue, setOriginalValue] = useState<string>(value)
  const [workingValue, setWorkingValue] = useState<string>(value)

  // Track HSVA state independently - keep sliders where user puts them
  const [hsvaState, setHsvaState] = useState(() => {
    const rgba = hexToRgba(value)
    const hsv = rgbToHsv(rgba.r, rgba.g, rgba.b)
    return { ...hsv, a: rgba.a * 100 } // Convert alpha to 0-100 range
  })

  // Generate color picker canvas when component mounts
  useEffect(() => {
    const canvas = generateColorPickerCanvas(200, 120)
    setColorCanvas(canvas)
  }, [])

  // Update working value when value prop changes (from external source)
  useEffect(() => {
    setWorkingValue(value)
    const rgba = hexToRgba(value)
    const newHsv = rgbToHsv(rgba.r, rgba.g, rgba.b)
    setHsvaState({ ...newHsv, a: rgba.a * 100 })
  }, [value])

  const contrastingColor = getBestFontColor(workingValue)
  const open = Boolean(anchorEl)

  // Handle escape key to cancel changes
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        handleCancel()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [open])

  // Select hex string and focus when popover opens
  useEffect(() => {
    if (open) {
      setOriginalValue(value)
      setWorkingValue(value)
      
      const selectInput = () => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        } else {
          requestAnimationFrame(selectInput)
        }
      }
      requestAnimationFrame(selectInput)

      // Force canvas redraw after popover opens
      setTimeout(() => {
        if (canvasRef.current && colorCanvas) {
          const ctx = canvasRef.current.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, 200, 120)
            ctx.drawImage(colorCanvas, 0, 0, 200, 120)
          }
        }
      }, 50) // Small delay to ensure DOM is ready
    }
  }, [open, value, colorCanvas])

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!disabled) {
      setAnchorEl(event.currentTarget)
    }
  }
  
  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleCancel = () => {
    setWorkingValue(originalValue)
    setAnchorEl(null)
  }

  const handleOK = () => {
    onChange(workingValue)
    setAnchorEl(null)
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!colorCanvas) return
    
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const canvasX = (x / rect.width) * colorCanvas.width
    const canvasY = (y / rect.height) * colorCanvas.height
    
    const color = getColorFromCanvas(colorCanvas, canvasX, canvasY)
    setWorkingValue(color)
    
    // Update HSV state when using canvas picker
    const rgb = hexToRgb(color)
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
    setHsvaState({ ...hsv, a: hsvaState.a })
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.buttons === 1) {
      handleCanvasClick(event)
    }
  }
  
  const handleHexChange = useCallback((newHex: string) => {
    // Validate hex format (now supports 8-character hex for RGBA)
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{4})$/
    if (hexRegex.test(newHex)) {
      // Normalize short hex formats
      let fullHex = newHex
      if (newHex.length === 4) {
        // #RGB -> #RRGGBB
        fullHex = `#${newHex[1]}${newHex[1]}${newHex[2]}${newHex[2]}${newHex[3]}${newHex[3]}`
      } else if (newHex.length === 5) {
        // #RGBA -> #RRGGBBAA
        fullHex = `#${newHex[1]}${newHex[1]}${newHex[2]}${newHex[2]}${newHex[3]}${newHex[3]}${newHex[4]}${newHex[4]}`
      }
      
      setWorkingValue(fullHex)
      
      // Update HSVA state when typing hex values
      const rgba = hexToRgba(fullHex)
      const hsv = rgbToHsv(rgba.r, rgba.g, rgba.b)
      setHsvaState({ ...hsv, a: rgba.a * 100 })
    }
  }, [])
  
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
  
  const handleSliderChange = useCallback((component: 'h' | 's' | 'v' | 'a', newValue: number) => {
    // Update HSVA state directly from slider - sliders are authoritative
    const newHsva = { ...hsvaState, [component]: newValue }
    setHsvaState(newHsva)
    
    // Convert to RGB and hex, then update working value
    const rgb = hsvToRgb(newHsva.h, newHsva.s, newHsva.v)
    const hex = rgbaToHex(rgb.r, rgb.g, rgb.b, newHsva.a / 100)
    setWorkingValue(hex)
  }, [hsvaState])
  
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

          {/* 2. Image-based color picker */}
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

          {/* 3. HSV Sliders */}
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
                  value={hsvaState.h}
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
                      backgroundColor: style.TEXT_PRIMARY,
                      width: 16,
                      height: 16
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
                {Math.round(hsvaState.h)}°
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
                  value={hsvaState.s}
                  onChange={(_, value) => handleSliderChange('s', value as number)}
                  min={0}
                  max={100}
                  size="small"
                  sx={{
                    '& .MuiSlider-track': {
                      backgroundColor: `hsl(${hsvaState.h}, 100%, 50%)`,
                      height: 6
                    },
                    '& .MuiSlider-rail': {
                      backgroundColor: '#ccc',
                      height: 6
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: style.TEXT_PRIMARY,
                      width: 16,
                      height: 16
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
                {Math.round(hsvaState.s)}%
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
                  value={hsvaState.v}
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
                      backgroundColor: '#333',
                      height: 6
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: style.TEXT_PRIMARY,
                      width: 16,
                      height: 16
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
                {Math.round(hsvaState.v)}%
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
                  value={hsvaState.a}
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
                      backgroundColor: '#333',
                      height: 6
                    },
                    '& .MuiSlider-thumb': {
                      backgroundColor: style.TEXT_PRIMARY,
                      width: 16,
                      height: 16
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
                {Math.round(hsvaState.a)}%
              </Typography>
            </Box>
          </Box>
          
          {/* 4. Copy buttons */}
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

          {/* 5. Hex input - moved to bottom */}
          <Box sx={{ mb: 0 }}>
            <TextField
              inputRef={el => { inputRef.current = el; }}
              size="small"
              value={workingValue}
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
              disabled={disabled}
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