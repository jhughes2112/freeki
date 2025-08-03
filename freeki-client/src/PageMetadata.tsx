import { 
  Box, 
  Typography, 
  Paper, 
  Chip,
  List,
  ListItem,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material'
import {
  ExpandMore,
  Person,
  Schedule,
  Tag,
  History,
  Restore
} from '@mui/icons-material'
import type { WikiPage } from './App'

interface PageMetadataProps {
  page: WikiPage
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function PageMetadata({ page }: PageMetadataProps) {
  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        Page Information
      </Typography>

      {/* Current Version Info */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Tag sx={{ mr: 1, fontSize: 16 }} />
          <Typography variant="subtitle2" fontWeight="bold">
            Current Version
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Version {page.version || 1}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Person sx={{ mr: 1, fontSize: 16 }} />
          <Typography variant="body2">
            {page.author || 'Unknown'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Schedule sx={{ mr: 1, fontSize: 16 }} />
          <Typography variant="body2">
            {page.updatedAt ? formatDate(page.updatedAt) : 'Unknown'}
          </Typography>
        </Box>
      </Paper>

      {/* Page Stats */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
          Statistics
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Created:
            </Typography>
            <Typography variant="body2">
              {page.createdAt ? formatDate(page.createdAt) : 'Unknown'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Path:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {page.path}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Tags Section */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
          Tags
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          <Chip label="documentation" size="small" variant="outlined" />
          <Chip label="wiki" size="small" variant="outlined" />
        </Box>
      </Paper>
    </Box>
  )
}