/**
 * Centralized color utility functions for the FreeKi application
 * Provides color conversion, manipulation, and accessibility functions
 */

// Core color conversion functions
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    return null
  }
  
  const cleanHex = hex.replace('#', '')
  let r: number, g: number, b: number
  
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16)
    g = parseInt(cleanHex[1] + cleanHex[1], 16)
    b = parseInt(cleanHex[2] + cleanHex[2], 16)
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16)
    g = parseInt(cleanHex.substring(2, 4), 16)
    b = parseInt(cleanHex.substring(4, 6), 16)
  } else {
    return null
  }
  
  return { r, g, b }
}

export const hexToRgba = (hex: string): { r: number; g: number; b: number; a: number } => {
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
    r = parseInt(cleanHex.substring(0, 2), 16)
    g = parseInt(cleanHex.substring(2, 4), 16)
    b = parseInt(cleanHex.substring(4, 6), 16)
  } else if (cleanHex.length === 8) {
    r = parseInt(cleanHex.substring(0, 2), 16)
    g = parseInt(cleanHex.substring(2, 4), 16)
    b = parseInt(cleanHex.substring(4, 6), 16)
    a = parseInt(cleanHex.substring(6, 8), 16) / 255
  } else {
    return { r: 0, g: 0, b: 0, a: 1 }
  }
  
  return { r, g, b, a }
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const rgbaToHex = (r: number, g: number, b: number, a: number = 1): string => {
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

export const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
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

export const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
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

// Color accessibility and manipulation functions
export const getLuminance = (r: number, g: number, b: number): number => {
  const linear = (c: number) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const rLin = linear(r), gLin = linear(g), bLin = linear(b)
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin
}

export const contrastRatio = (rgb1: { r: number, g: number, b: number }, rgb2: { r: number, g: number, b: number }): number => {
  const L1 = getLuminance(rgb1.r, rgb1.g, rgb1.b)
  const L2 = getLuminance(rgb2.r, rgb2.g, rgb2.b)
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)
}

// Calculate hover color based on background color luminance
export const calculateHoverColor = (selectedBackgroundColor: string): string => {
  const rgb = hexToRgb(selectedBackgroundColor)
  if (!rgb) {
    // Fallback if color parsing fails
    return 'rgba(0, 0, 0, 0.04)'
  }
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b)
  
  // If the color is dark (low luminance), lighten it
  // If the color is light (high luminance), darken it
  const adjustment = luminance > 0.5 ? -20 : 20
  
  const newR = Math.max(0, Math.min(255, rgb.r + adjustment))
  const newG = Math.max(0, Math.min(255, rgb.g + adjustment))
  const newB = Math.max(0, Math.min(255, rgb.b + adjustment))
  
  return rgbToHex(newR, newG, newB)
}

// Calculate best aesthetic font color for a given background
export const getBestFontColor = (bgHex: string): string => {
  const bgRgba = hexToRgba(bgHex)
  const hsv = rgbToHsv(bgRgba.r, bgRgba.g, bgRgba.b)

  // Try aesthetic color: complementary
  const newHue = (hsv.h + 180) % 360
  const fontS = Math.min(100, hsv.s + 30)
  const fontV = Math.max(40, Math.min(100, hsv.v - 20))
  const fontRgb = hsvToRgb(newHue, fontS, fontV)

  // Contrast test
  const contrast = contrastRatio(bgRgba, fontRgb)

  if (contrast >= 4.5) {
    return rgbaToHex(fontRgb.r, fontRgb.g, fontRgb.b)
  }

  // Fall back to black or white
  const white = { r: 255, g: 255, b: 255 }
  const black = { r: 0, g: 0, b: 0 }
  const contrastWhite = contrastRatio(bgRgba, white)
  const contrastBlack = contrastRatio(bgRgba, black)

  return (contrastWhite > contrastBlack) ? '#FFFFFF' : '#000000'
}

// Utility for copying colors to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
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
      } catch {
        document.body.removeChild(textArea)
        resolve(false)
      }
    })
  } catch {
    return false
  }
}