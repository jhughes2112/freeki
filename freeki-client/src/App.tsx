import React from 'react'
import { Box, Grid, Typography, Paper } from '@mui/material'
import FolderTree from './FolderTree'
import Editor from './Editor'

export default function App() {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Wiki Frontend
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Paper sx={{ p: 2, height: '80vh', overflow: 'auto' }}>
            <FolderTree />
          </Paper>
        </Grid>
        <Grid item xs={8}>
          <Paper sx={{ p: 2, height: '80vh', overflow: 'auto' }}>
            <Editor />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
