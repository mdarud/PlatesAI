import { writable, get } from 'svelte/store';
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
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
  category?: string;
};

// Default user ID
const DEFAULT_USER_ID = 'default-user';

// Convert from dataService Note to store Note
function fromDataServiceNote(note: DataServiceNote): Note {
  // Extract title from content if it exists in old format
  let title = note.title || 'Note';
  let text = note.content || '';
  
  // If no title is provided but content has a title format, extract it
  if (!note.title && note.content) {
    const titleMatch = note.content.match(/<b>(.*?)<\/b>/);
    if (titleMatch) {
      title = titleMatch[1];
      text = note.content.replace(/<b>.*?<\/b>(<br>)?/, '');
    }
  }

  // Ensure we have a valid numeric ID
  const id = typeof note.id === 'string' ? parseInt(note.id) : note.id;
  
  // Extract tags if they exist in the content
  const tags: string[] = [];
  const tagRegex = /#(\w+)/g;
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    tags.push(match[1]);
  }
  
  // Try to determine a category based on content
  let category = 'General';
  if (text.toLowerCase().includes('recipe')) {
    category = 'Recipe';
  } else if (text.toLowerCase().includes('grocery') || text.toLowerCase().includes('shopping')) {
    category = 'Grocery';
  } else if (text.toLowerCase().includes('inventory')) {
    category = 'Inventory';
  }
  
  return {
    id: isNaN(id) ? Date.now() : id,
    title,
    text,
    x: note.position?.x || 100,
    y: note.position?.y || 100,
    width: 300,
    height: 300,
    color: note.color || getDefaultNoteColor(),
    minimized: false,
    zIndex: 100,
    user_id: note.user_id,
    created_at: note.created_at,
    updated_at: note.updated_at,
    tags,
    category
  };
}

// Convert from store Note to dataService Note
function toDataServiceNote(note: Note, userId: string): DataServiceNote {
  return {
    id: note.id.toString(),
    content: note.text || '',
    title: note.title || `Note ${note.id}`, // Ensure title is never empty
    color: note.color || getDefaultNoteColor(),
    position: { x: note.x || 100, y: note.y || 100 },
    created_at: note.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: userId
  };
}

// Function to load notes from dataService with better error handling
async function loadNotes(userId: string = DEFAULT_USER_ID): Promise<Note[]> {
  if (!browser) return [];
  
  try {
    console.log('Loading notes from dataService for user:', userId);
    const dataServiceNotes = await notesService.getNotes(userId);
    console.log('Successfully loaded notes from dataService:', dataServiceNotes.length);
    return dataServiceNotes.map(fromDataServiceNote);
  } catch (error) {
    console.error('Error loading notes from dataService:', error);
    
    // Fall back to localStorage
    try {
      console.log('Falling back to localStorage for notes');
      const storedNotes = localStorage.getItem('platesai_notes');
      if (!storedNotes) {
        console.log('No notes found in localStorage');
        return [];
      }
      
      const parsedNotes = JSON.parse(storedNotes) as Note[];
      console.log('Successfully loaded notes from localStorage:', parsedNotes.length);
      
      // Filter notes by user_id if available
      const userNotes = parsedNotes.filter(note => !note.user_id || note.user_id === userId);
      return userNotes;
    } catch (localError) {
      console.error('Error loading notes from localStorage:', localError);
      return [];
    }
  }
}

// Function to save a note to dataService with better error handling
async function saveNoteToStorage(note: Note, userId: string = DEFAULT_USER_ID): Promise<void> {
  if (!browser) return;
  
  // Ensure note has user_id
  note.user_id = userId;
  
  // Update timestamps
  note.updated_at = new Date().toISOString();
  if (!note.created_at) {
    note.created_at = note.updated_at;
  }
  
  try {
    console.log('Saving note to dataService:', note.id);
    const dataServiceNote = toDataServiceNote(note, userId);
    await notesService.saveNote(dataServiceNote);
    console.log('Successfully saved note to dataService:', note.id);
    
    // Also save to localStorage as backup
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
      console.log('Successfully saved note to localStorage backup:', note.id);
    } catch (localError) {
      console.error('Error saving note to localStorage backup:', localError);
    }
  } catch (error) {
    console.error('Error saving note to dataService:', error);
    
    // Fall back to localStorage
    try {
      console.log('Falling back to localStorage for saving note:', note.id);
      const storedNotes = localStorage.getItem('platesai_notes') || '[]';
      const notes = JSON.parse(storedNotes) as Note[];
      const existingIndex = notes.findIndex(n => n.id === note.id);
      
      if (existingIndex >= 0) {
        notes[existingIndex] = note;
      } else {
        notes.push(note);
      }
      
      localStorage.setItem('platesai_notes', JSON.stringify(notes));
      console.log('Successfully saved note to localStorage fallback:', note.id);
    } catch (localError) {
      console.error('Error saving note to localStorage fallback:', localError);
    }
  }
}

// Function to delete a note from dataService with better error handling
async function deleteNote(noteId: number, userId: string = DEFAULT_USER_ID): Promise<void> {
  if (!browser) return;
  
  try {
    console.log('Deleting note from dataService:', noteId);
    await notesService.deleteNote(noteId.toString());
    console.log('Successfully deleted note from dataService:', noteId);
    
    // Also delete from localStorage
    try {
      const storedNotes = localStorage.getItem('platesai_notes') || '[]';
      const notes = JSON.parse(storedNotes) as Note[];
      const updatedNotes = notes.filter(n => n.id !== noteId);
      localStorage.setItem('platesai_notes', JSON.stringify(updatedNotes));
      console.log('Successfully deleted note from localStorage backup:', noteId);
    } catch (localError) {
      console.error('Error deleting note from localStorage backup:', localError);
    }
  } catch (error) {
    console.error('Error deleting note from dataService:', error);
    
    // Fall back to localStorage
    try {
      console.log('Falling back to localStorage for deleting note:', noteId);
      const storedNotes = localStorage.getItem('platesai_notes') || '[]';
      const notes = JSON.parse(storedNotes) as Note[];
      const updatedNotes = notes.filter(n => n.id !== noteId);
      localStorage.setItem('platesai_notes', JSON.stringify(updatedNotes));
      console.log('Successfully deleted note from localStorage fallback:', noteId);
    } catch (localError) {
      console.error('Error deleting note from localStorage fallback:', localError);
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
    
    // Add a new note with improved error handling
    addNote: (text: string = '', x: number = 100, y: number = 100, userId: string = DEFAULT_USER_ID) => {
      // Create a new note object that will be returned
      let createdNote: Note | null = null;
      
      update(notes => {
        try {
          // Generate a unique ID using timestamp and random number
          const timestamp = Date.now();
          const randomPart = Math.floor(Math.random() * 100000);
          const newId = timestamp + randomPart;
          
          // Find the highest z-index to place the new note on top
          const maxZIndex = notes.length > 0 ? Math.max(...notes.map(note => note.zIndex)) : 100;
          const newZIndex = maxZIndex + 10; // Increment by 10 to avoid potential conflicts
          
          // Extract tags if they exist in the text
          const tags: string[] = [];
          const tagRegex = /#(\w+)/g;
          let match;
          while ((match = tagRegex.exec(text)) !== null) {
            tags.push(match[1]);
          }
          
          // Try to determine a category based on content
          let category = 'General';
          if (text.toLowerCase().includes('recipe')) {
            category = 'Recipe';
          } else if (text.toLowerCase().includes('grocery') || text.toLowerCase().includes('shopping')) {
            category = 'Grocery';
          } else if (text.toLowerCase().includes('inventory')) {
            category = 'Inventory';
          }
          
          // Create the new note with default title
          const newNote: Note = {
            id: newId,
            title: `Note ${newId}`,
            text,
            x,
            y,
            width: 300,
            height: 300,
            color: getNoteColorByCategory(category), // Use category-based color
            minimized: false,
            zIndex: newZIndex,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            tags,
            category
          };
          
          // Save to dataService
          saveNoteToStorage(newNote, userId);
          
          // Store the created note to return it later
          createdNote = newNote;
          
          return [...notes, newNote];
        } catch (error) {
          console.error('Error adding new note:', error);
          return notes; // Return unchanged notes on error
        }
      });
      
      return createdNote;
    },
    
    // Update an existing note with improved error handling
    updateNote: (updatedNote: Note, userId: string = DEFAULT_USER_ID) => {
      update(notes => {
        try {
          // Ensure note has updated timestamp
          updatedNote.updated_at = new Date().toISOString();
          
          // Update the note in the array
          const updatedNotes = notes.map(note => 
            note.id === updatedNote.id ? { ...updatedNote, user_id: userId } : note
          );
          
          // Save to dataService
          saveNoteToStorage(updatedNote, userId);
          
          return updatedNotes;
        } catch (error) {
          console.error('Error updating note:', error);
          return notes; // Return unchanged notes on error
        }
      });
    },
    
    // Delete a note with improved error handling
    deleteNote: (id: number, userId: string = DEFAULT_USER_ID) => {
      update(notes => {
        try {
          // Filter out the note to be deleted
          const updatedNotes = notes.filter(note => note.id !== id);
          
          // Delete from dataService
          deleteNote(id, userId);
          
          return updatedNotes;
        } catch (error) {
          console.error('Error deleting note:', error);
          return notes; // Return unchanged notes on error
        }
      });
    },
    
    // Bring a note to the front with improved error handling
    bringToFront: (id: number, userId: string = DEFAULT_USER_ID) => {
      update(notes => {
        try {
          // Find the highest z-index
          const maxZIndex = notes.length > 0 ? Math.max(...notes.map(note => note.zIndex)) : 100;
          const newZIndex = maxZIndex + 10; // Increment by 10 to avoid potential conflicts
          
          // Update the z-index of the note
          const updatedNotes = notes.map(note => {
            if (note.id === id) {
              const updatedNote = { ...note, zIndex: newZIndex, user_id: userId };
              
              // Save to dataService
              saveNoteToStorage(updatedNote, userId);
              
              return updatedNote;
            }
            return note;
          });
          
          return updatedNotes;
        } catch (error) {
          console.error('Error bringing note to front:', error);
          return notes; // Return unchanged notes on error
        }
      });
    },
    
    // Clear all notes
    clearNotes: (userId: string = DEFAULT_USER_ID) => {
      try {
        // Clear notes from storage
        if (browser) {
          localStorage.removeItem('platesai_notes');
        }
        
        // Clear notes from store
        set([]);
      } catch (error) {
        console.error('Error clearing notes:', error);
      }
    },
    
    // Load notes for a user with improved error handling and retry mechanism
    loadUserNotes: async (userId: string = DEFAULT_USER_ID, retries = 3): Promise<Note[]> => {
      try {
        const notes = await loadNotes(userId);
        set(notes);
        return notes;
      } catch (error) {
        console.error(`Error loading notes (attempt ${4 - retries}/3):`, error);
        
        if (retries > 0) {
          console.log(`Retrying in 500ms... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 500));
          return createNotesStore().loadUserNotes(userId, retries - 1);
        }
        
        // If all retries fail, return empty array
        set([]);
        return [];
      }
    },
    
    // Save a note directly with improved error handling
    saveNote: async (note: Note, userId: string = DEFAULT_USER_ID): Promise<void> => {
      try {
        return await saveNoteToStorage(note, userId);
      } catch (error) {
        console.error('Error saving note directly:', error);
      }
    },
    
    // Search notes by text content
    searchNotes: (query: string): Note[] => {
      if (!query.trim()) {
        return get({ subscribe });
      }
      
      const lowerQuery = query.toLowerCase();
      return get({ subscribe }).filter(note => 
        note.title.toLowerCase().includes(lowerQuery) || 
        note.text.toLowerCase().includes(lowerQuery) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
      );
    },
    
    // Filter notes by category
    filterByCategory: (category: string): Note[] => {
      if (category === 'all') {
        return get({ subscribe });
      }
      
      return get({ subscribe }).filter(note => note.category === category);
    },
    
    // Filter notes by tag
    filterByTag: (tag: string): Note[] => {
      return get({ subscribe }).filter(note => 
        note.tags && note.tags.includes(tag)
      );
    },
    
    // Get all unique categories
    getCategories: (): string[] => {
      const categories = new Set<string>();
      get({ subscribe }).forEach(note => {
        if (note.category) {
          categories.add(note.category);
        }
      });
      return Array.from(categories);
    },
    
    // Get all unique tags
    getTags: (): string[] => {
      const tags = new Set<string>();
      get({ subscribe }).forEach(note => {
        if (note.tags) {
          note.tags.forEach(tag => tags.add(tag));
        }
      });
      return Array.from(tags);
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

// Helper function to get a note color by category
function getNoteColorByCategory(category: string): string {
  const categoryColors: Record<string, string> = {
    'Recipe': 'var(--note-mint, #4ECDC4)',
    'Grocery': 'var(--note-marigold, #FFB84C)',
    'Inventory': 'var(--note-sky, #60A5FA)',
    'General': 'var(--note-coral, #FF6B6B)'
  };
  
  return categoryColors[category] || getDefaultNoteColor();
}

// Export the store
export const notesStore = createNotesStore();
