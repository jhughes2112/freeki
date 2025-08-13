import React, { useRef } from 'react'
import {
  Dialog,
  Button,
  Typography,
  Box
} from '@mui/material'
import {
  Warning
} from '@mui/icons-material'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onDiscard?: () => void // Called if user discards changes
  onSave?: () => void   // Called if user saves changes
  onProceed?: () => void // Called if user proceeds (no edit mode)
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  saveText?: string
  discardText?: string
  dangerous?: boolean
  isEditing?: boolean
  hasUnsaved?: boolean
}

export default function ConfirmDialog({
  open,
  onClose,
  onDiscard,
  onSave,
  onProceed,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  saveText = 'Save',
  discardText = 'Discard',
  dangerous = false,
  isEditing = false,
  hasUnsaved = false
}: ConfirmDialogProps) {
  // Split the message into two lines for better presentation
  const messageParts = message.split('? ')
  const firstLine = messageParts[0] + '?'
  const secondLine = messageParts[1] || ''

  // If not editing, just show confirm/cancel
  // If editing and hasUnsaved, show Cancel, Discard, Save
  // If editing but no unsaved, treat as not editing

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="confirm-dialog-title"
      aria-modal="true"
      role="dialog"
      PaperProps={{
        sx: {
          backgroundColor: dangerous ? '#ffeaea' : 'var(--freeki-view-background)',
          color: dangerous ? '#721c24' : 'var(--freeki-p-font-color)',
          boxShadow: dangerous 
            ? '0 12px 48px rgba(220, 53, 69, 0.25), 0 8px 32px var(--freeki-shadow-color)'
            : '0 8px 32px var(--freeki-shadow-color)',
          border: dangerous 
            ? '2px solid #dc3545'
            : '1px solid var(--freeki-border-color)',
          borderRadius: 'var(--freeki-border-radius)',
          minWidth: '400px',
          minHeight: '240px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }
      }}
      BackdropProps={{
        sx: {
          backgroundColor: dangerous ? 'rgba(220, 53, 69, 0.15)' : 'rgba(0, 0, 0, 0.5)'
        }
      }}
    >
      {/* Title in top-left corner */}
      <Box 
        sx={{ 
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          zIndex: 1
        }}
      >
        {dangerous && (
          <Warning 
            sx={{ 
              color: '#dc3545',
              fontSize: '1.5rem',
              filter: 'drop-shadow(0 2px 4px rgba(220, 53, 69, 0.3))'
            }} 
          />
        )}
        <Typography 
          variant="h6" 
          sx={{ 
            color: dangerous ? '#721c24' : 'var(--freeki-p-font-color)', 
            fontSize: '1.1rem', 
            fontWeight: 700
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* Centered content area */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 4,
        py: 2,
        mt: 3
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography 
            variant="body1" 
            sx={{ 
              color: dangerous ? '#721c24' : 'var(--freeki-p-font-color)',
              fontSize: '1.1rem',
              fontWeight: 500,
              lineHeight: 1.4,
              textAlign: 'center'
            }}
          >
            {firstLine}
          </Typography>
          {secondLine && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: dangerous ? '#a02834' : 'var(--freeki-p-font-color)',
                fontSize: '0.95rem',
                fontWeight: 400,
                lineHeight: 1.4,
                textAlign: 'center',
                fontStyle: 'italic',
                mt: 0.5
              }}
            >
              {secondLine}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Buttons at bottom */}
      <Box sx={{ 
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 2,
        p: 2,
        mt: 'auto'
      }}>
        {isEditing && hasUnsaved ? (
          <>
            <Button 
              onClick={() => { onClose(); }}
              variant="outlined"
              size="large"
              sx={{ 
                color: dangerous ? '#721c24' : 'var(--freeki-p-font-color)', 
                borderColor: dangerous ? '#dc3545' : 'var(--freeki-border-color)',
                minWidth: '100px',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: dangerous ? 'rgba(220, 53, 69, 0.1)' : 'var(--freeki-folders-selected-background)',
                  borderColor: dangerous ? '#dc3545' : 'var(--freeki-border-color)'
                }
              }}
              aria-label={cancelText}
            >
              {cancelText}
            </Button>
            <Button
              onClick={() => {
                if (onDiscard) { onDiscard(); }
                onClose();
              }}
              variant="contained"
              size="large"
              sx={{
                minWidth: '100px',
                fontWeight: 700,
                backgroundColor: '#dc3545',
                color: 'white',
                boxShadow: '0 4px 12px rgba(220, 53, 69, 0.4)',
                '&:hover': {
                  backgroundColor: '#c02633',
                  boxShadow: '0 6px 16px rgba(220, 53, 69, 0.5)'
                },
                '&:active': {
                  backgroundColor: '#a02834',
                  boxShadow: '0 2px 8px rgba(220, 53, 69, 0.6)'
                }
              }}
              aria-label={discardText}
            >
              {discardText}
            </Button>
            <Button
              onClick={() => {
                if (onSave) { onSave(); }
                onClose();
              }}
              variant="contained"
              size="large"
              sx={{
                minWidth: '100px',
                fontWeight: 700,
                backgroundColor: '#007bff',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0, 123, 255, 0.4)',
                '&:hover': {
                  backgroundColor: '#0056b3',
                  boxShadow: '0 6px 16px rgba(0, 123, 255, 0.5)'
                },
                '&:active': {
                  backgroundColor: '#003d80',
                  boxShadow: '0 2px 8px rgba(0, 123, 255, 0.6)'
                }
              }}
              aria-label={saveText}
            >
              {saveText}
            </Button>
          </>
        ) : (
          <>
            <Button 
              onClick={() => { onClose(); }}
              variant="outlined"
              size="large"
              sx={{ 
                color: dangerous ? '#721c24' : 'var(--freeki-p-font-color)', 
                borderColor: dangerous ? '#dc3545' : 'var(--freeki-border-color)',
                minWidth: '100px',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: dangerous ? 'rgba(220, 53, 69, 0.1)' : 'var(--freeki-folders-selected-background)',
                  borderColor: dangerous ? '#dc3545' : 'var(--freeki-border-color)'
                }
              }}
              aria-label={cancelText}
            >
              {cancelText}
            </Button>
            <Button 
              onClick={() => {
                if (onProceed) { onProceed(); }
                onClose();
              }}
              variant="contained"
              size="large"
              sx={{ 
                minWidth: '100px',
                fontWeight: 700,
                backgroundColor: '#dc3545',
                color: 'white',
                boxShadow: '0 4px 12px rgba(220, 53, 69, 0.4)',
                '&:hover': {
                  backgroundColor: '#c02633',
                  boxShadow: '0 6px 16px rgba(220, 53, 69, 0.5)'
                },
                '&:active': {
                  backgroundColor: '#a02834',
                  boxShadow: '0 2px 8px rgba(220, 53, 69, 0.6)'
                }
              }}
              aria-label={confirmText}
            >
              {confirmText}
            </Button>
          </>
        )}
      </Box>
    </Dialog>
  )
}

// Utility: confirmOrProceed
// Usage: confirmOrProceed({
//   isEditing, hasUnsaved, showDialog, setShowDialog, onSave, onDiscard, operation, message, ... })
export function useConfirmOrProceed({
  isEditing,
  hasUnsaved,
  onSave,
  onDiscard,
  message,
  title,
  dangerous,
  confirmText,
  cancelText,
  saveText,
  discardText
}: {
  isEditing: boolean,
  hasUnsaved: boolean,
  onSave?: () => Promise<void> | void,
  onDiscard?: () => Promise<void> | void,
  message: string,
  title: string,
  dangerous?: boolean,
  confirmText?: string,
  cancelText?: string,
  saveText?: string,
  discardText?: string
}) {
  const [showDialog, setShowDialog] = React.useState(false)
  const operationRef = useRef<null | (() => void)>(null)

  // Call this to trigger the confirm-or-proceed logic
  const confirmOrProceed = (operation: () => void) => {
    if (!isEditing || !hasUnsaved) {
      operation()
    } else {
      operationRef.current = operation
      setShowDialog(true)
    }
  }

  // Dialog component to render
  const dialog = (
    <ConfirmDialog
      open={showDialog}
      onClose={() => setShowDialog(false)}
      onProceed={() => {
        setShowDialog(false)
        if (operationRef.current) operationRef.current()
      }}
      onDiscard={async () => {
        setShowDialog(false)
        if (onDiscard) await onDiscard()
        if (operationRef.current) operationRef.current()
      }}
      onSave={async () => {
        setShowDialog(false)
        if (onSave) await onSave()
        if (operationRef.current) operationRef.current()
      }}
      title={title}
      message={message}
      dangerous={dangerous}
      isEditing={isEditing}
      hasUnsaved={hasUnsaved}
      confirmText={confirmText}
      cancelText={cancelText}
      saveText={saveText}
      discardText={discardText}
    />
  )

  return { confirmOrProceed, dialog }
}