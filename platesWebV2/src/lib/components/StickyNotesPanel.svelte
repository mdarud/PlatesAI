<script lang="ts">
  import { onMount } from 'svelte';
  import { notesStore, type Note } from '../stores/notesStore';
  import StickyNote from './StickyNote.svelte';
  import { createIcon } from '../utils/icons';
  
  // Props
  export let sidebarWidth: number = 0;
  export let rightSidebarWidth: number = 0;
  export let user_id: string = 'default-user';
  
  // State
  let notes: Note[] = [];
  let minimizedNotes: Note[] = [];
  let expandedNotes: Note[] = [];
  let showAddNoteForm = false;
  let newNoteText = '';
  let newNoteTitle = '';
  let searchQuery = '';
  let selectedCategory = 'all';
  let selectedTag = '';
  let isLoading = true;
  let categories: string[] = [];
  let tags: string[] = [];
  let filteredNotes: Note[] = [];
  let sortBy: 'newest' | 'oldest' | 'alphabetical' = 'newest';
  
  // Subscribe to the notes store
  const unsubscribe = notesStore.subscribe(value => {
    notes = value;
    
    // Separate notes into minimized and expanded
    minimizedNotes = notes.filter(note => note.minimized);
    expandedNotes = notes.filter(note => !note.minimized);
    
    // Get categories and tags
    categories = ['all', ...notesStore.getCategories()];
    tags = notesStore.getTags();
    
    // Apply filters
    applyFilters();
  });
  
  // Apply filters and sorting to notes
  function applyFilters() {
    // Start with all notes
    let filtered = [...notes];
    
    // Apply search filter if query exists
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(lowerQuery) || 
        note.text.toLowerCase().includes(lowerQuery) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
      );
    }
    
    // Apply category filter if not 'all'
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }
    
    // Apply tag filter if selected
    if (selectedTag) {
      filtered = filtered.filter(note => 
        note.tags && note.tags.includes(selectedTag)
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'oldest':
        filtered.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateA - dateB;
        });
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    
    // Update filtered notes
    filteredNotes = filtered;
    
    // Separate filtered notes into minimized and expanded
    minimizedNotes = filteredNotes.filter(note => note.minimized);
    expandedNotes = filteredNotes.filter(note => !note.minimized);
  }
  
  // Load notes and clean up subscription on component destruction
  onMount(() => {
    isLoading = true;
    
    // Load notes from storage when component mounts
    console.log('Loading notes for user:', user_id);
    
    // Load notes with the improved store method
    notesStore.loadUserNotes(user_id)
      .then(loadedNotes => {
        console.log('Loaded notes:', loadedNotes);
        
        // Apply initial filters
        applyFilters();
      })
      .catch(error => {
        console.error('Error loading notes:', error);
      })
      .finally(() => {
        isLoading = false;
      });
    
    // Return the cleanup function
    return () => {
      unsubscribe();
    };
  });
  
  // Clear search and filters
  function clearFilters() {
    searchQuery = '';
    selectedCategory = 'all';
    selectedTag = '';
    applyFilters();
  }
  
  // Get category badge color
  function getCategoryColor(category: string): string {
    const categoryColors: Record<string, string> = {
      'Recipe': 'var(--note-mint, #4ECDC4)',
      'Grocery': 'var(--note-marigold, #FFB84C)',
      'Inventory': 'var(--note-sky, #60A5FA)',
      'General': 'var(--note-coral, #FF6B6B)'
    };
    
    return categoryColors[category] || 'var(--medium-gray)';
  }
  
  // Handle note updates
  function handleNoteUpdate(event: CustomEvent<Note>) {
    const updatedNote = event.detail;
    notesStore.updateNote(updatedNote);
  }
  
  // Bring note to front
  function bringToFront(event: CustomEvent<Note>) {
    const note = event.detail;
    notesStore.bringToFront(note.id);
  }
  
  // Add a new note
  function addNote() {
    if (newNoteText.trim() || newNoteTitle.trim()) {
      // Calculate position for new note using a grid-based placement
      const position = calculateNotePosition();
      
      // Create the note
      notesStore.addNote(newNoteText, position.x, position.y, user_id);
      
      // If title is provided, find the newly created note and update its title
      if (newNoteTitle.trim()) {
        // The note will be the last one in the notes array
        setTimeout(() => {
          if (notes.length > 0) {
            const latestNote = notes[notes.length - 1];
            if (latestNote) {
              latestNote.title = newNoteTitle.trim();
              notesStore.updateNote(latestNote, user_id);
            }
          }
        }, 100);
      }
      
      // Clear form
      newNoteText = '';
      newNoteTitle = '';
      showAddNoteForm = false;
    } else {
      // Add an empty note if no text is provided
      const position = calculateNotePosition();
      notesStore.addNote('', position.x, position.y, user_id);
      showAddNoteForm = false;
    }
  }
  
  // Calculate a good position for a new note
  function calculateNotePosition() {
    // Default position (center of main content)
    let x = sidebarWidth + 100;
    let y = 100;
    
    // Get window dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate available width for notes (window width minus both sidebars)
    const availableWidth = windowWidth - sidebarWidth - rightSidebarWidth;
    
    // Grid size for placement
    const gridSize = 50;
    
    // Try to find an empty spot in the grid
    if (notes.length > 0) {
      // Create a simple grid-based placement
      const usedPositions = new Set();
      
      // Mark existing note positions
      notes.forEach(note => {
        const gridX = Math.floor(note.x / gridSize);
        const gridY = Math.floor(note.y / gridSize);
        usedPositions.add(`${gridX},${gridY}`);
      });
      
      // Find an empty position
      let found = false;
      const maxGridX = Math.floor((availableWidth - 200) / gridSize);
      const maxGridY = Math.floor((windowHeight - 300) / gridSize);
      
      // Start from the center and spiral outward
      const centerGridX = Math.floor((sidebarWidth + availableWidth / 2) / gridSize);
      const centerGridY = Math.floor((windowHeight / 2) / gridSize);
      
      let radius = 1;
      let gridX = centerGridX;
      let gridY = centerGridY;
      
      while (!found && radius < 10) {
        for (let dx = -radius; dx <= radius; dx++) {
          for (let dy = -radius; dy <= radius; dy++) {
            // Only check positions on the perimeter of the current radius
            if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
              const testGridX = centerGridX + dx;
              const testGridY = centerGridY + dy;
              
              // Check if position is valid and not used
              if (
                testGridX >= 0 && testGridX <= maxGridX &&
                testGridY >= 0 && testGridY <= maxGridY &&
                !usedPositions.has(`${testGridX},${testGridY}`)
              ) {
                gridX = testGridX;
                gridY = testGridY;
                found = true;
                break;
              }
            }
          }
          if (found) break;
        }
        radius++;
      }
      
      // Convert grid position back to pixels
      x = Math.max(sidebarWidth + 20, gridX * gridSize);
      y = Math.max(20, gridY * gridSize);
    } else {
      // For the first note, place it in the center of the main content area
      x = sidebarWidth + Math.floor(availableWidth / 2) - 150;
      y = Math.floor((windowHeight - 300) / 2);
    }
    
    return { x, y };
  }
  
  // Delete a note
  function deleteNote(id: number) {
    notesStore.deleteNote(id);
  }
  
  // Handle close event from StickyNote component
  function handleNoteClose(event: CustomEvent<Note>) {
    const note = event.detail;
    deleteNote(note.id);
  }
  
  // Restore a minimized note
  function restoreMinimizedNote(note: Note) {
    note.minimized = false;
    notesStore.updateNote(note);
    notesStore.bringToFront(note.id);
  }
</script>

<div class="sticky-notes-panel">
  <div class="panel-header">
    <div class="header-title">
      <h2>Sticky Notes</h2>
      <span class="note-count">{notes.length} notes</span>
    </div>
    <button class="add-note-button" on:click={() => showAddNoteForm = !showAddNoteForm}>
      {#if showAddNoteForm}
        <span class="icon-wrapper">
          {@html createIcon('close', 16, 'icon-close')}
        </span>
      {:else}
        <span class="icon-wrapper">
          {@html createIcon('add', 16, 'icon-add')}
        </span>
      {/if}
    </button>
  </div>
  
  <!-- Search and filter bar -->
  <div class="search-filter-bar">
    <div class="search-container">
      <span class="search-icon">
        {@html createIcon('search', 16)}
      </span>
      <input 
        type="text" 
        placeholder="Search notes..." 
        bind:value={searchQuery}
        on:input={applyFilters}
        class="search-input"
      />
      {#if searchQuery}
        <button class="clear-search" on:click={() => { searchQuery = ''; applyFilters(); }}>
          {@html createIcon('close', 14)}
        </button>
      {/if}
    </div>
    
    <div class="filter-sort-container">
      <select 
        bind:value={selectedCategory} 
        on:change={applyFilters}
        class="filter-select"
        aria-label="Filter by category"
      >
        {#each categories as category}
          <option value={category}>
            {category === 'all' ? 'All Categories' : category}
          </option>
        {/each}
      </select>
      
      {#if tags.length > 0}
        <select 
          bind:value={selectedTag} 
          on:change={applyFilters}
          class="filter-select"
          aria-label="Filter by tag"
        >
          <option value="">All Tags</option>
          {#each tags as tag}
            <option value={tag}>#{tag}</option>
          {/each}
        </select>
      {/if}
      
      <select 
        bind:value={sortBy} 
        on:change={applyFilters}
        class="filter-select"
        aria-label="Sort notes"
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
        <option value="alphabetical">A-Z</option>
      </select>
      
      {#if searchQuery || selectedCategory !== 'all' || selectedTag}
        <button class="clear-filters-button" on:click={clearFilters}>
          Clear Filters
        </button>
      {/if}
    </div>
  </div>
  
  {#if showAddNoteForm}
    <div class="add-note-form">
      <input 
        type="text" 
        bind:value={newNoteTitle} 
        placeholder="Note title..."
        class="note-title-input"
      />
      <textarea 
        bind:value={newNoteText} 
        placeholder="Enter note content... (Use #tag to add tags)"
        rows="4"
        class="note-content-input"
      ></textarea>
      <div class="form-actions">
        <button class="cancel-button" on:click={() => showAddNoteForm = false}>Cancel</button>
        <button class="submit-button" on:click={addNote}>Add Note</button>
      </div>
    </div>
  {/if}
  
  {#if isLoading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading notes...</p>
    </div>
  {:else if notes.length === 0}
    <div class="empty-state">
      <p>No sticky notes yet.</p>
      <p>Click the + button to create your first note!</p>
    </div>
  {:else}
    <div class="notes-list">
      <div class="notes-section">
        <h3>Active Notes</h3>
        {#if expandedNotes.length === 0}
          <p class="empty-section">No active notes</p>
        {:else}
          <div class="notes-grid">
            {#each expandedNotes as note (note.id)}
              <div 
                class="note-preview" 
                style="background-color: {note.color}"
                on:click={() => notesStore.bringToFront(note.id)}
                on:keydown={(e) => e.key === 'Enter' && notesStore.bringToFront(note.id)}
                tabindex="0"
                role="button"
                aria-label="View note"
              >
                <div class="preview-header">
                  <div class="preview-title">
                    {note.title || `Note ${note.id}`}
                  </div>
                  <div class="preview-actions">
                    <button 
                      class="preview-action" 
                      on:click|stopPropagation={() => deleteNote(note.id)}
                      aria-label="Delete note"
                    >
                      {@html createIcon('delete', 14, 'icon-delete')}
                    </button>
                  </div>
                </div>
                <div class="preview-content">
                  {@html note.text.substring(0, 80) + (note.text.length > 80 ? '...' : '')}
                </div>
                <div class="preview-footer">
                  {#if note.category && note.category !== 'General'}
                    <span 
                      class="category-badge" 
                      style="background-color: {getCategoryColor(note.category)}"
                    >
                      {note.category}
                    </span>
                  {/if}
                  
                  {#if note.tags && note.tags.length > 0}
                    <div class="tags-container">
                      {#each note.tags.slice(0, 2) as tag}
                        <span class="tag-badge">#{tag}</span>
                      {/each}
                      {#if note.tags.length > 2}
                        <span class="more-tags">+{note.tags.length - 2}</span>
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <div class="notes-section minimized-section">
        <h3>Minimized Notes</h3>
        {#if minimizedNotes.length === 0}
          <p class="empty-section">No minimized notes</p>
        {:else}
          <div class="notes-grid">
            {#each minimizedNotes as note (note.id)}
              <div 
                class="note-preview minimized" 
                style="background-color: {note.color}"
                on:click={() => restoreMinimizedNote(note)}
                on:keydown={(e) => e.key === 'Enter' && restoreMinimizedNote(note)}
                tabindex="0"
                role="button"
                aria-label="Restore note"
              >
                <div class="preview-header">
                  <div class="preview-title">
                    {note.title || `Note ${note.id}`}
                  </div>
                  <div class="preview-actions">
                    <button 
                      class="preview-action restore-btn" 
                      on:click|stopPropagation={() => restoreMinimizedNote(note)}
                      aria-label="Restore note"
                    >
                      {@html createIcon('restore', 14, 'icon-restore')}
                    </button>
                    <button 
                      class="preview-action" 
                      on:click|stopPropagation={() => deleteNote(note.id)}
                      aria-label="Delete note"
                    >
                      {@html createIcon('delete', 14, 'icon-delete')}
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Render only non-minimized sticky notes -->
{#each expandedNotes as note (note.id)}
  <StickyNote 
    {note} 
    {sidebarWidth}
    {rightSidebarWidth}
    {user_id}
    on:update={handleNoteUpdate}
    on:bringToFront={bringToFront}
    on:close={handleNoteClose}
  />
{/each}

<style>
  .sticky-notes-panel {
    height: 100%;
    overflow-y: auto;
    padding: var(--space-md);
    background-color: var(--white);
    border-right: 1px solid var(--light-gray);
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .header-title {
    display: flex;
    flex-direction: column;
  }
  
  .note-count {
    font-size: var(--text-xs);
    color: var(--medium-gray);
    margin-top: var(--space-xs);
  }
  
  .panel-header h2 {
    margin: 0;
    font-size: var(--text-xl);
    color: var(--dark);
  }
  
  /* Search and filter styles */
  .search-filter-bar {
    margin-bottom: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .search-container {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .search-icon {
    position: absolute;
    left: var(--space-sm);
    color: var(--medium-gray);
  }
  
  .search-input {
    width: 100%;
    padding: var(--space-sm) var(--space-sm) var(--space-sm) calc(var(--space-sm) * 2 + 16px);
    border: 1px solid var(--light-gray);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
  }
  
  .clear-search {
    position: absolute;
    right: var(--space-sm);
    background: transparent;
    border: none;
    color: var(--medium-gray);
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .filter-sort-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  
  .filter-select {
    flex: 1;
    min-width: 100px;
    padding: var(--space-xs) var(--space-sm);
    border: 1px solid var(--light-gray);
    border-radius: var(--radius-md);
    font-size: var(--text-xs);
    background-color: var(--white);
  }
  
  .clear-filters-button {
    padding: var(--space-xs) var(--space-sm);
    background-color: var(--light-gray);
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .clear-filters-button:hover {
    background-color: var(--medium-gray);
    color: var(--white);
  }
  
  /* Loading state */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    color: var(--medium-gray);
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--light-gray);
    border-top: 3px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--space-md);
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  /* Note title input */
  .note-title-input {
    width: 100%;
    padding: var(--space-sm);
    border: 1px solid var(--medium-gray);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-sm);
    font-family: var(--font-primary);
    font-weight: 600;
  }
  
  .note-content-input {
    width: 100%;
    padding: var(--space-sm);
    border: 1px solid var(--medium-gray);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-sm);
    font-family: var(--font-primary);
    resize: vertical;
  }
  
  .add-note-button {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-round);
    background-color: var(--primary);
    color: var(--white);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .add-note-button:hover {
    background-color: var(--primary-dark);
    transform: scale(1.1);
  }
  
  .add-note-form {
    background-color: var(--light-gray);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
    animation: slideDown var(--transition-normal);
  }
  
  .add-note-form textarea {
    width: 100%;
    border: 1px solid var(--medium-gray);
    border-radius: var(--radius-md);
    padding: var(--space-sm);
    margin-bottom: var(--space-sm);
    font-family: var(--font-primary);
    resize: vertical;
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }
  
  .cancel-button {
    padding: var(--space-xs) var(--space-sm);
    border: none;
    border-radius: var(--radius-md);
    background-color: var(--light-gray);
    color: var(--dark);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .submit-button {
    padding: var(--space-xs) var(--space-sm);
    border: none;
    border-radius: var(--radius-md);
    background-color: var(--primary);
    color: var(--white);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .cancel-button:hover, .submit-button:hover {
    transform: translateY(-2px);
  }
  
  .submit-button:hover {
    background-color: var(--primary-dark);
  }
  
  .empty-state {
    text-align: center;
    padding: var(--space-xl) var(--space-md);
    color: var(--medium-gray);
    font-style: italic;
  }
  
  .notes-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  
  .notes-section h3 {
    font-size: var(--text-lg);
    margin-bottom: var(--space-sm);
    color: var(--dark);
  }
  
  .empty-section {
    color: var(--medium-gray);
    font-style: italic;
    text-align: center;
    padding: var(--space-md) 0;
  }
  
  .notes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-sm);
  }
  
  .note-preview {
    background-color: var(--note-yellow);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: all var(--transition-fast);
    cursor: pointer;
    height: 150px;
    display: flex;
    flex-direction: column;
  }
  
  .note-preview.minimized {
    height: 40px;
  }
  
  .note-preview:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
  
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-xs) var(--space-sm);
    background-color: rgba(0, 0, 0, 0.05);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  .preview-title {
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80%;
  }
  
  .preview-actions {
    display: flex;
    gap: var(--space-xs);
  }
  
  .preview-action {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
    transition: all var(--transition-fast);
    color: var(--dark-gray);
  }
  
  .icon-delete {
    color: var(--danger, #f44336);
  }
  
  .icon-add, .icon-close {
    color: var(--white);
  }
  
  .icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  
  .preview-action:hover {
    opacity: 1;
    transform: scale(1.2);
  }
  
  .preview-action.restore-btn {
    color: var(--success);
  }
  
  .preview-content {
    padding: var(--space-xs) var(--space-sm);
    font-size: 0.8rem;
    overflow: hidden;
    flex: 1;
  }
  
  /* Preview footer with category and tags */
  .preview-footer {
    padding: var(--space-xs) var(--space-sm);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    background-color: rgba(0, 0, 0, 0.03);
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    min-height: 24px;
  }
  
  .category-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    color: white;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .tags-container {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  
  .tag-badge {
    display: inline-block;
    padding: 1px 4px;
    border-radius: var(--radius-sm);
    background-color: rgba(0, 0, 0, 0.1);
    color: var(--dark-gray);
    font-size: 0.65rem;
  }
  
  .more-tags {
    font-size: 0.65rem;
    color: var(--medium-gray);
    opacity: 0.8;
  }
  
  /* Minimized notes section styling */
  .minimized-section {
    background-color: var(--light-gray);
    border-radius: var(--radius-md);
    padding: var(--space-sm);
    border-left: 4px solid var(--accent);
  }
  
  .minimized-section h3 {
    color: var(--dark);
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
  
  .minimized-section h3::before {
    content: "📌";
    font-size: 1.2rem;
  }
  
  .note-preview.minimized {
    position: relative;
    overflow: visible;
  }
  
  .note-preview.minimized::after {
    content: "↗";
    position: absolute;
    right: 5px;
    bottom: 5px;
    font-size: 12px;
    color: var(--dark-gray);
    opacity: 0.7;
  }
  
  .note-preview.minimized:hover::after {
    opacity: 1;
    transform: scale(1.2);
  }
  
  /* Animation */
  @keyframes slideDown {
    from { 
      opacity: 0;
      transform: translateY(-10px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .notes-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
    
    .note-preview {
      height: 120px;
    }
  }
</style>
