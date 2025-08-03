import React from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { List, ListItem, ListItemText, Paper } from '@mui/material'

const initialItems = ['Home', 'Docs', 'API', 'FAQ']

function SortableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <ListItem ref={setNodeRef} style={style} {...attributes} {...listeners} sx={{ cursor: 'grab' }}>
      <ListItemText primary={id} />
    </ListItem>
  )
}

export default function FolderTree() {
  const [items, setItems] = React.useState(initialItems)

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={(event) => {
      const { active, over } = event
      if (active.id !== over?.id) {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over?.id as string)
        const newItems = [...items]
        newItems.splice(oldIndex, 1)
        newItems.splice(newIndex, 0, active.id as string)
        setItems(newItems)
      }
    }}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <List>
          {items.map(id => <SortableItem key={id} id={id} />)}
        </List>
      </SortableContext>
    </DndContext>
  )
}
