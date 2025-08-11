import React from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'

interface SearchPipButtonProps {
  searchConfig: {
    titles: boolean
    tags: boolean
    author: boolean
    content: boolean
  }
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
}

const SearchPipButton: React.FC<SearchPipButtonProps> = ({ searchConfig, onClick }) => {
  const pipLabels = ['Titles', 'Tags', 'Author', 'Content']
  const pipKeys = ['titles', 'tags', 'author', 'content'] as const
  
  const getTooltipText = () => {
    const activeTypes = pipKeys.filter(key => searchConfig[key])
    if (activeTypes.length === 0) return 'Search nothing'
    return `Searching: ${activeTypes.map(key => pipLabels[pipKeys.indexOf(key)]).join(', ')}`
  }

  return (
    <Tooltip title={getTooltipText()} placement="bottom" arrow>
      <IconButton 
        size="small"
        onClick={onClick}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.25,
          p: 0.5,
          minWidth: 24,
          minHeight: 24,
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)'
          }
        }}
        aria-label="Search configuration"
      >
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: 0.25,
          width: 14,
          height: 14,
          padding: 0, // Remove the padding that ruins everything
          backgroundColor: 'var(--freeki-border-color)',
          border: '1px solid var(--freeki-border-color)',
          borderRadius: '3px'
        }}>
          {pipKeys.map((key, index) => (
            <Box
              key={key}
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                backgroundColor: searchConfig[key] ? 'var(--freeki-primary)' : 'var(--freeki-border-color)',
                filter: searchConfig[key] ? 'none' : 'brightness(0.9)', // Make inactive pips darker shade
                transition: 'all 0.15s ease'
              }}
              title={pipLabels[index]}
            />
          ))}
        </Box>
      </IconButton>
    </Tooltip>
  )
}

export default SearchPipButton