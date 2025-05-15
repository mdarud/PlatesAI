import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { notesService } from '../services/dataService';
import type { Note as DataServiceNote } from '../services/types';
import { browser } from '$app/environment';

// Define the Note type for the store
export type Note = {
  id: number;
  title: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  minimized: boolean;
  zIndex: number;
};

// Default user ID
const DEFAULT_USER_ID = 'default-user';

// Convert from dataService Note to store Note
function fromDataServiceNote(note: DataServiceNote): Note {
  // Extract title from content if it exists in old format
  let title = 'Note';
  let text = note.content;
  const titleMatch = note.content.match(/<b>(.*?)<\/b>/);
  if (titleMatch) {
    title = titleMatch[1];
    text = note.content.replace(/<b>.*?<\/b>(<br>)?/, '');
  }

  return {
    id: parseInt(note.id),
    title,
    text,
    x: note.position.x,
    y: note.position.y,
    width: 300,
    height: 300,
    color: note.color || getDefaultNoteColor(),
    minimized: false,
    zIndex: 100
  };
}

// Convert from store Note to dataService Note
function toDataServiceNote(note: Note, userId: string): DataServiceNote {
  return {
    id: note.id.toString(),
    content: note.text, // No longer embedding title in content
    title: note.title, // Store title separately
    color: note.color,
    position: { x: note.x, y: note.y },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: userId
  };
}

// Function to load notes from dataService
async function loadNotes(userId: string = DEFAULT_USER_ID): Promise<Note[]> {
  if (!browser) return [];
  
  try {
    const dataServiceNotes = await notesService.getNotes(userId);
    return dataServiceNotes.map(fromDataServiceNote);
  } catch (error) {
    console.error('Error loading notes from dataService:', error);
    
    // Fall back to localStorage
    try {
      const storedNotes = localStorage.getItem('platesai_notes');
      return storedNotes ? JSON.parse(storedNotes) : [];
    } catch (localError) {
      console.error('Error loading notes from localStorage:', localError);
      return [];
    }
  }
}

// Function to save a note to dataService
async function saveNote(note: Note, userId: string = DEFAULT_USER_ID): Promise<void> {
  if (!browser) return;
  
  try {
    const dataServiceNote = toDataServiceNote(note, userId);
    await notesService.saveNote(dataServiceNote);
  } catch (error) {
    console.error('Error saving note to dataService:', error);
    
    // Fall back to localStorage
    try {
      const storedNotes = localStorage.getItem('platesai_notes') || '[]';
      const notes = JSON.parse(storedNotes) as Note[];
      const existingIndex = notes.findIndex(n => n.id === note.id);
      
      if (existingIndex >= 0) {
        notes[existingIndex] = note;
      } else {
        notes.push(note);
      }
      
      localStorage.setItem('platesai_notes', JSON.stringify(notes));
    } catch (localError) {
      console.error('Error saving note to localStorage:', localError);
    }
  }
}

// Function to delete a note from dataService
async function deleteNote(noteId: number, userId: string = DEFAULT_USER_ID): Promise<void> {
  if (!browser) return;
  
  try {
    await notesService.deleteNote(noteId.toString());
  } catch (error) {
    console.error('Error deleting note from dataService:', error);
    
    // Fall back to localStorage
    try {
      const storedNotes = localStorage.getItem('platesai_notes') || '[]';
      const notes = JSON.parse(storedNotes) as Note[];
      const updatedNotes = notes.filter(n => n.id !== noteId);
      localStorage.setItem('platesai_notes', JSON.stringify(updatedNotes));
    } catch (localError) {
      console.error('Error deleting note from localStorage:', localError);
    }
  }
}

// Create a custom store with additional methods
function createNotesStore() {
  // Initialize with empty array, we'll load notes when needed
  const { subscribe, set, update }: Writable<Note[]> = writable([]);
  
  // Don't load notes automatically on initialization
  // They will be loaded when explicitly requested
  
  return {
    subscribe,
    
    // Add a new note
    addNote: (text: string = '', x: number = 100, y: number = 100, userId: string = DEFAULT_USER_ID) => {
      update(notes => {
        // Find the highest ID to ensure uniqueness
        const maxId = notes.length > 0 ? Math.max(...notes.map(note => note.id)) : 0;
        const newId = maxId + 1;
        
        // Find the highest z-index to place the new note on top
        const maxZIndex = notes.length > 0 ? Math.max(...notes.map(note => note.zIndex)) : 0;
        const newZIndex = maxZIndex + 1;
        
        // Create the new note with default title
        const newNote: Note = {
          id: newId,
          title: `Note ${newId}`,
          text,
          x,
          y,
          width: 300,
          height: 300,
          color: getDefaultNoteColor(), // Always use default color for new notes
          minimized: false,
          zIndex: newZIndex
        };
        
        // Save to dataService
        saveNote(newNote, userId);
        
        return [...notes, newNote];
      });
    },
    
    // Update an existing note
    updateNote: (updatedNote: Note, userId: string = DEFAULT_USER_ID) => {
      update(notes => {
        const updatedNotes = notes.map(note => 
          note.id === updatedNote.id ? updatedNote : note
        );
        
        // Save to dataService
        saveNote(updatedNote, userId);
        
        return updatedNotes;
      });
    },
    
    // Delete a note
    deleteNote: (id: number, userId: string = DEFAULT_USER_ID) => {
      update(notes => {
        const updatedNotes = notes.filter(note => note.id !== id);
        
        // Delete from dataService
        deleteNote(id, userId);
        
        return updatedNotes;
      });
    },
    
    // Bring a note to the front
    bringToFront: (id: number, userId: string = DEFAULT_USER_ID) => {
      update(notes => {
        // Find the highest z-index
        const maxZIndex = Math.max(...notes.map(note => note.zIndex));
        
        // Update the z-index of the note
        const updatedNotes = notes.map(note => {
          if (note.id === id) {
            const updatedNote = { ...note, zIndex: maxZIndex + 1 };
            
            // Save to dataService
            saveNote(updatedNote, userId);
            
            return updatedNote;
          }
          return note;
        });
        
        return updatedNotes;
      });
    },
    
    // Clear all notes
    clearNotes: (userId: string = DEFAULT_USER_ID) => {
      // Clear notes from storage
      if (browser) {
        localStorage.removeItem('platesai_notes');
      }
      
      // Clear notes from store
      set([]);
    },
    
    // Load notes for a user
    loadUserNotes: async (userId: string = DEFAULT_USER_ID) => {
      const notes = await loadNotes(userId);
      set(notes);
      return notes;
    }
  };
}

// Helper function to get a default note color
function getDefaultNoteColor(): string {
  // Using the first color from the StickyNote component's color options
  return 'var(--note-coral, #FF6B6B)';
}

// Helper function to get a note color by index
function getNoteColorByIndex(index: number): string {
  const colors = [
    'var(--note-coral, #FF6B6B)',      // Vibrant coral
    'var(--note-marigold, #FFB84C)',   // Warm marigold
    'var(--note-mint, #4ECDC4)',       // Fresh mint
    'var(--note-lavender, #A78BFA)',   // Soft lavender
    'var(--note-sky, #60A5FA)',        // Sky blue
    'var(--note-rose, #F472B6)',       // Rose pink
    'var(--note-emerald, #34D399)'     // Emerald green
  ];
  
  // Always start with coral for the first note
  if (index === 1) {
    return colors[0];
  }
  
  // For subsequent notes, use a fixed sequence
  const colorIndex = ((index - 2) % (colors.length - 1)) + 1;
  return colors[colorIndex];
}

// Export the store
export const notesStore = createNotesStore();
