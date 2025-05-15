<script lang="ts">
  import { onMount } from 'svelte';
  import { createIcon } from '../utils/icons';
  import type { GroceryItem } from '../services/types';
  import { groceryStore } from '../stores/groceryStore';
  import { notesStore } from '../stores/notesStore';
  
  // Props
  export let date: string;
  export let userId: string = 'default-user';
  export let onAddItem: (date: string) => void = () => {};
  export let onEditItem: (item: GroceryItem) => void = () => {};
  
  // State
  let dateItems: GroceryItem[] = [];
  let unscheduledItems: GroceryItem[] = [];
  let showUnassignedSelector: boolean = false;
  let selectedUnscheduledItems: Set<number> = new Set();
  let searchQuery: string = '';
  let isLoading: boolean = true;
  
  // Format date for display
  function formatDateForDisplay(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  // Load items for the selected date
  function loadDateItems(): void {
    dateItems = groceryStore.getItemsByDate(date);
    unscheduledItems = groceryStore.getUnscheduledItems();
    isLoading = false;
  }
  
  // Toggle item selection
  function toggleItemSelection(itemId: number | undefined): void {
    if (typeof itemId !== 'number') return;
    
    if (selectedUnscheduledItems.has(itemId)) {
      selectedUnscheduledItems.delete(itemId);
    } else {
      selectedUnscheduledItems.add(itemId);
    }
    selectedUnscheduledItems = selectedUnscheduledItems; // Trigger reactivity
  }
  
  // Schedule selected items for the date
  async function scheduleSelectedItems(): Promise<void> {
    // Display loading state while scheduling
    isLoading = true;
    
    // Process each selected item
    const selectedItemsArray = Array.from(selectedUnscheduledItems);
    for (const itemId of selectedItemsArray) {
      await groceryStore.scheduleItemForDate(itemId, date);
    }
    
    // Reset selection
    selectedUnscheduledItems.clear();
    selectedUnscheduledItems = selectedUnscheduledItems; // Trigger reactivity
    
    // Refresh the items immediately
    loadDateItems();
    
    // Close selector
    showUnassignedSelector = false;
    isLoading = false;
  }
  
  // Remove item from date (unschedule)
  async function unscheduleItem(itemId: number | undefined): Promise<void> {
    if (typeof itemId !== 'number') return;
    
    // Schedule for empty date (unschedule)
    await groceryStore.scheduleItemForDate(itemId, '');
    
    // Refresh items immediately
    loadDateItems();
  }
  
  // Remove a grocery item
  function removeItem(itemId: number | undefined): void {
    if (typeof itemId !== 'number') return;
    groceryStore.removeItem(itemId);
  }
  
  // Toggle item checked status
  function toggleItemChecked(itemId: number | undefined): void {
    if (itemId !== undefined) {
      // Use the groceryStore to toggle the item's checked status
      groceryStore.toggleItemChecked(itemId);
      
      // Refresh items immediately to show the change
      setTimeout(() => loadDateItems(), 100);
    }
  }
  
  // Create a sticky note from the date's grocery items
  function createStickyNote(): void {
    // Format date for the note title
    const formattedDate = new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short',
      day: 'numeric' 
    });
    
    // Format grocery items as text
    let noteText = `# Shopping List - ${formattedDate}\n\n`;
    
    if (dateItems.length === 0) {
      noteText += "No items scheduled for this date.\n";
    } else {
      // Group items by category
      const itemsByCategory: Record<string, GroceryItem[]> = {};
      
      dateItems.forEach(item => {
        const category = item.category || 'Uncategorized';
        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
        itemsByCategory[category].push(item);
      });
      
      // Add items to note text
      Object.entries(itemsByCategory).forEach(([category, items]) => {
        noteText += `## ${category}\n\n`;
        
        items.forEach(item => {
          const checkMark = item.checked ? "✓ " : "□ ";
          const amount = item.amount ? `${item.amount} ${item.unit || ''}` : '';
          
          noteText += `${checkMark}${item.name}${amount ? ' - ' + amount : ''}\n`;
        });
        
        noteText += '\n';
      });
    }
    
    // Add the note
    notesStore.addNote(noteText);
  }
  
  // Filter unscheduled items by search query
  $: filteredUnscheduledItems = unscheduledItems.filter(item => {
    if (!searchQuery.trim()) return true;
    
    const searchableText = [
      item.name,
      item.category,
      item.notes
    ].filter(Boolean).join(' ').toLowerCase();
    
    return searchQuery.toLowerCase().split(' ').every(term => 
      searchableText.includes(term)
    );
  });
  
  // Subscribe to grocery store changes
  onMount(() => {
    // Load items
    loadDateItems();
    
    // Use a debounced subscription to prevent excessive updates
    let updateTimeout: number | null = null;
    
    // Subscribe to grocery store with optimization
    const unsubscribe = groceryStore.subscribe(() => {
      // Cancel any pending update
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      // Debounce updates to prevent rapid successive renders
      updateTimeout = setTimeout(() => {
        loadDateItems();
        updateTimeout = null;
      }, 200) as unknown as number;
    });
    
    return () => {
      unsubscribe();
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
    };
  });
</script>

<div class="date-detail-panel">
  <div class="panel-header">
    <h2 class="date-title">{formatDateForDisplay(date)}</h2>
    <div class="header-actions">
      <button class="action-button add-item" on:click={() => onAddItem(date)}>
        <span class="action-icon">
          {@html createIcon('add', 16)}
        </span>
        <span>New Item</span>
      </button>
      <button class="action-button add-existing" on:click={() => showUnassignedSelector = true}>
        <span class="action-icon">
          {@html createIcon('grocery', 16)}
        </span>
        <span>Add Existing</span>
      </button>
      <button class="action-button create-note" on:click={createStickyNote} title="Save to sticky note">
        <span class="action-icon">
          {@html createIcon('notes', 16)}
        </span>
        <span>Save to Note</span>
      </button>
    </div>
  </div>
  
  <div class="panel-content">
    {#if isLoading}
      <div class="loading-container">
        <div class="loading-spinner animate-stir">
          {@html createIcon('grocery', 40)}
        </div>
        <p>Loading items...</p>
      </div>
    {:else if dateItems.length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          {@html createIcon('grocery', 48)}
        </div>
        <h3>No items scheduled for this date</h3>
        <p>Add items to your shopping list for this date!</p>
        <div class="empty-actions">
          <button class="action-button add-item" on:click={() => onAddItem(date)}>
            <span class="action-icon">
              {@html createIcon('add', 16)}
            </span>
            <span>New Item</span>
          </button>
          <button class="action-button add-existing" on:click={() => showUnassignedSelector = true}>
            <span class="action-icon">
              {@html createIcon('grocery', 16)}
            </span>
            <span>Add Existing</span>
          </button>
          <button class="action-button create-note" on:click={createStickyNote} title="Save to sticky note">
            <span class="action-icon">
              {@html createIcon('notes', 16)}
            </span>
            <span>Save Empty List</span>
          </button>
        </div>
      </div>
    {:else}
      <div class="date-items">
        <h3>Items for {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h3>
        <ul class="date-items-list">
          {#each dateItems as item (item.id)}
            <li class="date-item animate-fadeIn">
              <div class="item-checkbox">
                <input 
                  type="checkbox" 
                  id={`item-${item.id}`} 
                  checked={item.checked}
                  on:change={() => toggleItemChecked(item.id)}
                />
                <label for={`item-${item.id}`} class="checkbox-label"></label>
              </div>
              
              <div class="item-details">
                <div class="item-name-container">
                  <span class="item-name">{item.name}</span>
                  {#if item.category}
                    <span class="item-category">{item.category}</span>
                  {/if}
                </div>
                
                {#if item.amount || item.unit}
                  <div class="item-amount">
                    {item.amount || ''} {item.unit || ''}
                  </div>
                {/if}
                
                {#if item.notes}
                  <div class="item-notes">
                    <span class="notes-icon">
                      {@html createIcon('notes', 14)}
                    </span>
                    <span>{item.notes}</span>
                  </div>
                {/if}
              </div>
              
              <div class="item-actions">
                <button class="icon-action" on:click={() => onEditItem(item)} title="Edit">
                  {@html createIcon('edit', 16)}
                </button>
                <button class="icon-action" on:click={() => unscheduleItem(item.id)} title="Unschedule">
                  {@html createIcon('clock', 16)}
                </button>
                <button class="icon-action" on:click={() => removeItem(item.id)} title="Remove">
                  {@html createIcon('delete', 16)}
                </button>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
  
  <!-- Unassigned Items Selector Modal -->
  {#if showUnassignedSelector}
    <div class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>Add Existing Items to {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h3>
          <button class="close-button" on:click={() => showUnassignedSelector = false}>
            {@html createIcon('close', 20)}
          </button>
        </div>
        
        <div class="modal-content">
          <div class="search-container">
            <span class="search-icon">
              {@html createIcon('search', 18)}
            </span>
            <input 
              type="text" 
              placeholder="Search unscheduled items..." 
              bind:value={searchQuery}
              class="search-input"
            />
            {#if searchQuery}
              <button class="clear-search" on:click={() => searchQuery = ''}>
                {@html createIcon('close', 16)}
              </button>
            {/if}
          </div>
          
          {#if filteredUnscheduledItems.length === 0}
            <div class="empty-state small">
              {#if searchQuery}
                <p>No unscheduled items match your search.</p>
                <button class="reset-button" on:click={() => searchQuery = ''}>
                  Clear Search
                </button>
              {:else}
                <p>No unscheduled items available.</p>
                <button class="action-button add-item" on:click={() => { showUnassignedSelector = false; onAddItem(date); }}>
                  <span class="action-icon">
                    {@html createIcon('add', 16)}
                  </span>
                  <span>Create New Item</span>
                </button>
              {/if}
            </div>
          {:else}
            <div class="unscheduled-items">
              <ul class="unscheduled-items-list">
                {#each filteredUnscheduledItems as item (item.id)}
                  <li 
                    class="unscheduled-item {selectedUnscheduledItems.has(item.id || -1) ? 'selected' : ''}"
                    on:click={() => toggleItemSelection(item.id)}
                  >
                    <div class="item-checkbox">
                      <input 
                        type="checkbox" 
                        id={`select-item-${item.id}`} 
                        checked={selectedUnscheduledItems.has(item.id || -1)}
                        on:change={() => toggleItemSelection(item.id)}
                      />
                      <label for={`select-item-${item.id}`} class="checkbox-label"></label>
                    </div>
                    
                    <div class="item-details">
                      <div class="item-name-container">
                        <span class="item-name">{item.name}</span>
                        {#if item.category}
                          <span class="item-category">{item.category}</span>
                        {/if}
                      </div>
                      
                      {#if item.amount || item.unit}
                        <div class="item-amount">
                          {item.amount || ''} {item.unit || ''}
                        </div>
                      {/if}
                    </div>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
        
        <div class="modal-footer">
          <button class="cancel-button" on:click={() => showUnassignedSelector = false}>
            Cancel
          </button>
          <button 
            class="add-button" 
            on:click={scheduleSelectedItems}
            disabled={selectedUnscheduledItems.size === 0}
          >
            Add {selectedUnscheduledItems.size} {selectedUnscheduledItems.size === 1 ? 'Item' : 'Items'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .date-detail-panel {
    display: flex;
    flex-direction: column;
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    height: 100%;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    background-color: var(--accent);
    color: var(--white);
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
  
  .date-title {
    font-size: var(--text-lg);
    font-weight: 600;
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    gap: var(--space-sm);
  }
  
  .action-button {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-md);
    font-weight: 500;
    transition: all var(--transition-fast);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: var(--text-sm);
  }
  
  .action-button.add-item {
    background-color: var(--white);
    color: var(--accent);
  }
  
  .action-button.add-existing {
    background-color: rgb(246 101 126);
    color: var(--white);
    border: 1px solid rgba(255, 255, 255, 0.4);
  }
  
  .action-button.create-note {
    background-color: rgb(246 101 126);
    color: var(--white);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
  
  .action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  }
  
  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-md);
  }
  
  .date-items h3 {
    margin-top: 0;
    margin-bottom: var(--space-md);
    color: var(--dark);
    font-weight: 600;
    border-bottom: 1px solid var(--light-gray);
    padding-bottom: var(--space-xs);
  }
  
  .date-items-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .date-item {
    display: flex;
    align-items: center;
    padding: var(--space-sm);
    border-bottom: 1px solid var(--light-gray);
    transition: all var(--transition-fast);
  }
  
  .date-item:hover {
    background-color: var(--light-gray);
  }
  
  .item-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  
  .item-name-container {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }
  
  .item-name {
    font-weight: 600;
    font-size: var(--text-base);
    color: var(--dark);
  }
  
  .item-category {
    font-size: var(--text-xs);
    padding: 2px 8px;
    background-color: var(--light-gray);
    border-radius: var(--radius-full);
    color: var(--dark-gray);
  }
  
  .item-amount {
    font-size: var(--text-sm);
    color: var(--dark-gray);
  }
  
  .item-notes {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-sm);
    color: var(--dark-gray);
    font-style: italic;
  }
  
  .notes-icon {
    color: var(--dark-gray);
  }
  
  .item-actions {
    display: flex;
    gap: var(--space-xs);
  }
  
  .icon-action {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--dark-gray);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .icon-action:hover {
    background-color: var(--light-gray);
    color: var(--primary);
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    color: var(--dark-gray);
  }
  
  .loading-spinner {
    margin-bottom: var(--space-md);
    color: var(--accent);
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-xl);
    text-align: center;
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    margin: var(--space-lg) auto;
    max-width: 500px;
  }
  
  .empty-state.small {
    padding: var(--space-md);
    margin: var(--space-md) auto;
    box-shadow: none;
    background-color: var(--off-white);
  }
  
  .empty-icon {
    color: var(--accent-light);
    margin-bottom: var(--space-md);
    opacity: 0.8;
  }
  
  .empty-state h3 {
    margin-bottom: var(--space-sm);
    color: var(--dark);
  }
  
  .empty-state p {
    color: var(--dark-gray);
    margin-bottom: var(--space-md);
  }
  
  .reset-button {
    background-color: var(--light-gray);
    color: var(--dark-gray);
    border: none;
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .reset-button:hover {
    background-color: var(--medium-gray);
    color: var(--white);
  }
  
  .empty-actions {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-sm);
  }
  
  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-container {
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    background-color: var(--primary);
    color: var(--white);
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: var(--text-lg);
  }
  
  .close-button {
    background: transparent;
    border: none;
    color: var(--white);
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color var(--transition-fast);
  }
  
  .close-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  
  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-md);
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-md);
    padding: var(--space-md);
    border-top: 1px solid var(--light-gray);
  }
  
  .cancel-button {
    background-color: var(--light-gray);
    color: var(--dark-gray);
    border: none;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .cancel-button:hover {
    background-color: var(--medium-gray);
    color: var(--white);
  }
  
  .add-button {
    background-color: var(--accent);
    color: var(--white);
    border: none;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .add-button:hover {
    background-color: var(--accent-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .add-button:disabled {
    background-color: var(--light-gray);
    color: var(--medium-gray);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  /* Search styles */
  .search-container {
    position: relative;
    margin-bottom: var(--space-md);
  }
  
  .search-icon {
    position: absolute;
    left: var(--space-sm);
    top: 50%;
    transform: translateY(-50%);
    color: var(--medium-gray);
  }
  
  .search-input {
    padding-left: calc(var(--space-sm) * 2 + 18px);
    padding-right: var(--space-xl);
    border-radius: var(--radius-full);
    border: 2px solid var(--light-gray);
    background-color: var(--off-white);
    transition: all var(--transition-fast);
    width: 100%;
  }
  
  .search-input:focus {
    border-color: var(--accent-light);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.1);
    background-color: var(--white);
  }
  
  .clear-search {
    position: absolute;
    right: var(--space-sm);
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: none;
    color: var(--medium-gray);
    padding: var(--space-xs);
    cursor: pointer;
    box-shadow: none;
  }
  
  .clear-search:hover {
    color: var(--dark-gray);
    background-color: transparent;
    transform: translateY(-50%) scale(1.1);
    box-shadow: none;
  }
  
  /* Unscheduled items list */
  .unscheduled-items {
    max-height: 400px;
    overflow-y: auto;
  }
  
  .unscheduled-items-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .unscheduled-item {
    display: flex;
    align-items: center;
    padding: var(--space-sm);
    border-bottom: 1px solid var(--light-gray);
    transition: all var(--transition-fast);
    cursor: pointer;
  }
  
  .unscheduled-item:hover {
    background-color: var(--light-gray);
  }
  
  .unscheduled-item.selected {
    background-color: var(--primary-light);
  }
  
  .item-checkbox {
    margin-right: var(--space-md);
  }
  
  .item-checkbox input[type="checkbox"] {
    display: none;
  }
  
  .checkbox-label {
    display: inline-block;
    width: 24px;
    height: 24px;
    border: 2px solid var(--accent);
    border-radius: var(--radius-sm);
    position: relative;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .checkbox-label::after {
    content: '';
    position: absolute;
    display: none;
    left: 8px;
    top: 4px;
    width: 6px;
    height: 12px;
    border: solid var(--white);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }
  
  .item-checkbox input[type="checkbox"]:checked + .checkbox-label {
    background-color: var(--accent);
  }
  
  .item-checkbox input[type="checkbox"]:checked + .checkbox-label::after {
    display: block;
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .panel-header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .header-actions {
      width: 100%;
      justify-content: space-between;
    }
    
    .empty-actions {
      flex-direction: column;
    }
    
    .modal-container {
      width: 95%;
      max-height: 90vh;
    }
  }
</style>
