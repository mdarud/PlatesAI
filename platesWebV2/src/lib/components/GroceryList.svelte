<script lang="ts">
  import { onMount } from 'svelte';
  import { createIcon } from '../utils/icons';
  import type { GroceryItem, Recipe } from '../services/types';
  import { inventoryStore } from '../stores/inventoryStore';
  import { recipeStore } from '../stores/recipeStore';
  import { groceryStore } from '../stores/groceryStore';
  import { notesStore } from '../stores/notesStore';
  import RecipeSelectionModal from './RecipeSelectionModal.svelte';
  import GroceryCalendarView from './GroceryCalendarView.svelte';
  
  // Props
  export let userId: string = 'default-user';
  export let onAddItem: (date?: string) => void = () => {};
  export let onEditItem: (item: GroceryItem) => void = () => {};
  export let onGenerateFromRecipe: () => void = () => {};
  export let showViewToggle: boolean = true;
  
  // State
  let groceryItems: GroceryItem[] = [];
  let filteredItems: GroceryItem[] = [];
  let searchQuery: string = '';
  let selectedCategory: string = 'all';
  let selectedDate: string = 'all';
  let sortBy: 'name-asc' | 'name-desc' | 'category-asc' | 'category-desc' | 'date-asc' | 'date-desc' = 'category-asc';
  let isLoading: boolean = true;
  let recipes: Recipe[] = [];
  let showRecipeSelectionModal: boolean = false;
  let viewMode: 'list' | 'calendar' = 'list';
  
  // Dates derived from grocery items
  $: dates = getDates(groceryItems);
  
  // Categories derived from grocery items
  $: categories = getCategories(groceryItems);
  
  // Filter and sort grocery items when any of these values change
  $: {
    filteredItems = filterItems(groceryItems, searchQuery, selectedCategory, selectedDate);
    filteredItems = sortItems(filteredItems, sortBy);
  }
  
  // Get unique categories from grocery items
  function getCategories(itemList: GroceryItem[]): string[] {
    const uniqueCategories = new Set<string>();
    
    // Add 'all' category
    uniqueCategories.add('all');
    
    // Add grocery categories
    itemList.forEach(item => {
      if (item.category) {
        uniqueCategories.add(item.category);
      }
    });
    
    return Array.from(uniqueCategories);
  }
  
  // Get unique dates from grocery items
  function getDates(itemList: GroceryItem[]): string[] {
    const uniqueDates = new Set<string>();
    
    // Add 'all' option
    uniqueDates.add('all');
    
    // Add 'unscheduled' option
    uniqueDates.add('unscheduled');
    
    // Add dates from grocery items
    itemList.forEach(item => {
      if (item.scheduled_date) {
        uniqueDates.add(item.scheduled_date);
      }
    });
    
    return Array.from(uniqueDates).sort((a, b) => {
      if (a === 'all') return -1;
      if (b === 'all') return 1;
      if (a === 'unscheduled') return -1;
      if (b === 'unscheduled') return 1;
      return a.localeCompare(b);
    });
  }
  
  // Filter grocery items by search query, category, and date
  function filterItems(itemList: GroceryItem[], query: string, category: string, date: string): GroceryItem[] {
    let filtered = [...itemList];
    
    // Filter by search query
    if (query.trim()) {
      const searchTerms = query.toLowerCase().split(' ');
      filtered = filtered.filter(item => {
        const searchableText = [
          item.name,
          item.category,
          item.notes,
          item.scheduled_date
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchTerms.every(term => searchableText.includes(term));
      });
    }
    
    // Filter by category
    if (category && category !== 'all') {
      filtered = filtered.filter(item => item.category === category);
    }
    
    // Filter by date
    if (date && date !== 'all') {
      if (date === 'unscheduled') {
        filtered = filtered.filter(item => !item.scheduled_date);
      } else {
        filtered = filtered.filter(item => item.scheduled_date === date);
      }
    }
    
    return filtered;
  }
  
  // Sort grocery items
  function sortItems(itemList: GroceryItem[], sortOption: string): GroceryItem[] {
    const sorted = [...itemList];
    
    switch (sortOption) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'category-asc':
        return sorted.sort((a, b) => {
          if (!a.category) return 1;
          if (!b.category) return -1;
          return a.category.localeCompare(b.category);
        });
      case 'category-desc':
        return sorted.sort((a, b) => {
          if (!a.category) return 1;
          if (!b.category) return -1;
          return b.category.localeCompare(a.category);
        });
      case 'date-asc':
        return sorted.sort((a, b) => {
          if (!a.scheduled_date) return 1;
          if (!b.scheduled_date) return -1;
          return a.scheduled_date.localeCompare(b.scheduled_date);
        });
      case 'date-desc':
        return sorted.sort((a, b) => {
          if (!a.scheduled_date) return 1;
          if (!b.scheduled_date) return -1;
          return b.scheduled_date.localeCompare(a.scheduled_date);
        });
      default:
        return sorted;
    }
  }
  
  // Toggle item checked status
  function toggleItemChecked(itemId: number | undefined) {
    if (itemId !== undefined) {
      // Use the groceryStore to toggle the item's checked status
      groceryStore.toggleItemChecked(itemId);
    }
  }
  
  // Remove a grocery item
  function removeItem(itemId: number | undefined) {
    if (itemId !== undefined) {
      // Use the groceryStore to remove the item
      groceryStore.removeItem(itemId);
    }
  }
  
  // Show recipe selection modal
  function showRecipeSelection() {
    showRecipeSelectionModal = true;
  }
  
  // Handle recipe selection from modal
  function handleRecipeSelection(event: CustomEvent<{ recipeIds: number[] }>) {
    const { recipeIds } = event.detail;
    
    if (recipeIds.length > 0) {
      // Use the groceryStore to generate items from selected recipes
      groceryStore.generateFromRecipes(recipeIds, userId);
    }
    
    // Close the modal
    showRecipeSelectionModal = false;
  }
  
  // Close recipe selection modal
  function closeRecipeSelectionModal() {
    showRecipeSelectionModal = false;
  }
  
  // Create sticky note from grocery list
  function createStickyNote() {
    // Format grocery items as text
    let noteText = "# Grocery List\n\n";
    
    // Group items by category
    const itemsByCategory: Record<string, GroceryItem[]> = {};
    
    filteredItems.forEach(item => {
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
        const date = item.scheduled_date ? ` (${item.scheduled_date})` : '';
        
        noteText += `${checkMark}${item.name}${amount ? ' - ' + amount : ''}${date}\n`;
      });
      
      noteText += '\n';
    });
    
    // Add the note
    notesStore.addNote(noteText);
  }
  
  // Load grocery items on mount
  onMount(() => {
    isLoading = true;
    
    // Load grocery items from store
    groceryStore.loadGroceryItems(userId)
      .catch(error => {
        console.error('Error loading grocery dates:', error);
      });
    
    // Use a debounced subscription to prevent excessive updates 
    let updateTimeout: number | null = null;
    
    // Subscribe to grocery store with optimization
    const unsubscribeGrocery = groceryStore.subscribe(items => {
      // Cancel any pending update
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      // Debounce updates to prevent rapid successive renders
      updateTimeout = setTimeout(() => {
        groceryItems = items;
        isLoading = false;
        updateTimeout = null;
      }, 200) as unknown as number;
    });
    
    // Load recipes for generating grocery lists
    recipeStore.loadRecipes(userId);
    const unsubscribeRecipes = recipeStore.subscribe(value => {
      recipes = value;
    });
    
    return () => {
      unsubscribeGrocery();
      unsubscribeRecipes();
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
    };
  });
</script>

<div class="grocery-list-container">
  <div class="grocery-list-header">
    {#if showViewToggle}
    <div class="view-toggle">
      <button 
        class="view-toggle-button {viewMode === 'list' ? 'active' : ''}" 
        on:click={() => viewMode = 'list'}
      >
        <span class="toggle-icon">
          {@html createIcon('list', 16)}
        </span>
        <span>List View</span>
      </button>
      <button 
        class="view-toggle-button {viewMode === 'calendar' ? 'active' : ''}" 
        on:click={() => viewMode = 'calendar'}
      >
          <span class="toggle-icon">
          {@html createIcon('clock', 16)}
        </span>
        <span>Calendar View</span>
      </button>
    </div>
    {/if}
    
    {#if viewMode === 'list'}
    <div class="search-filter-container">
      <div class="search-container">
        <span class="search-icon">
          {@html createIcon('search', 18)}
        </span>
        <input 
          type="text" 
          placeholder="Search grocery items..." 
          bind:value={searchQuery}
          class="search-input"
        />
        {#if searchQuery}
          <button class="clear-search" on:click={() => searchQuery = ''}>
            {@html createIcon('close', 16)}
          </button>
        {/if}
      </div>
      
      <div class="filter-sort-container">
        <div class="filter-container">
          <label for="category-filter" class="filter-label">
            <span class="filter-icon">
              {@html createIcon('filter', 16)}
            </span>
            <span>Category</span>
          </label>
          <select id="category-filter" bind:value={selectedCategory} class="filter-select">
            {#each categories as category}
              <option value={category}>
                {category === 'all' ? 'All Categories' : 
                 category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            {/each}
          </select>
        </div>
        
        <div class="filter-container">
          <label for="date-filter" class="filter-label">
            <span class="filter-icon">
              {@html createIcon('clock', 16)}
            </span>
            <span>Date</span>
          </label>
          <select id="date-filter" bind:value={selectedDate} class="filter-select">
            {#each dates as date}
              <option value={date}>
                {date === 'all' ? 'All Dates' : 
                 date === 'unscheduled' ? 'Unscheduled' : date}
              </option>
            {/each}
          </select>
        </div>
        
        <div class="sort-container">
          <label for="sort-select" class="sort-label">
            <span class="sort-icon">
              {@html createIcon('sort', 16)}
            </span>
            <span>Sort</span>
          </label>
          <select id="sort-select" bind:value={sortBy} class="sort-select">
            <option value="name-asc">Name (A to Z)</option>
            <option value="name-desc">Name (Z to A)</option>
            <option value="category-asc">Category (A to Z)</option>
            <option value="category-desc">Category (Z to A)</option>
            <option value="date-asc">Date (Earliest First)</option>
            <option value="date-desc">Date (Latest First)</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="grocery-actions">
      <button class="action-button add-item" on:click={() => onAddItem()}>
        <span class="action-icon">
          {@html createIcon('add', 16)}
        </span>
        <span>Add Item</span>
      </button>
      
      <button class="action-button generate-list" on:click={showRecipeSelection}>
        <span class="action-icon">
          {@html createIcon('recipe', 16)}
        </span>
        <span>Generate from Recipes</span>
      </button>
      
      <button class="action-button create-note" on:click={createStickyNote}>
        <span class="action-icon">
          {@html createIcon('notes', 16)}
        </span>
        <span>Create Sticky Note</span>
      </button>
    </div>
    {/if}
  </div>
  
  {#if viewMode === 'list'}
    <div class="grocery-list-content">
      {#if isLoading}
        <div class="loading-container">
          <div class="loading-spinner animate-stir">
            {@html createIcon('grocery', 40)}
          </div>
          <p>Loading your grocery list...</p>
        </div>
      {:else if filteredItems.length === 0}
        <div class="empty-state">
          {#if searchQuery || selectedCategory !== 'all'}
            <div class="empty-icon animate-bubble">
              {@html createIcon('search', 48)}
            </div>
            <h3>No matching items found</h3>
            <p>Try adjusting your search or filters</p>
            <button class="reset-button" on:click={() => { searchQuery = ''; selectedCategory = 'all'; }}>
              Reset Filters
            </button>
          {:else}
            <div class="empty-icon">
              {@html createIcon('grocery', 48)}
            </div>
            <h3>Your grocery list is empty</h3>
            <p>Add items to your grocery list or generate one from your recipes!</p>
            <div class="empty-actions">
              <button class="action-button add-item" on:click={() => onAddItem()}>
                <span class="action-icon">
                  {@html createIcon('add', 16)}
                </span>
                <span>Add Item</span>
              </button>
              
              <button class="action-button generate-list" on:click={showRecipeSelection}>
                <span class="action-icon">
                  {@html createIcon('recipe', 16)}
                </span>
                <span>Generate from Recipes</span>
              </button>
            </div>
          {/if}
        </div>
      {:else}
        <div class="grocery-items">
          {#if filteredItems.some(item => !item.checked)}
            <div class="items-section">
              <h3>To Buy</h3>
              <ul class="grocery-items-list">
                {#each filteredItems.filter(item => !item.checked) as item, index (item.id ? `${item.id}-${index}` : `unchecked-${index}`)}
                  <li class="grocery-item animate-fadeIn">
                    <div class="item-checkbox">
                      <input 
                        type="checkbox" 
                        id={`item-${item.id}-${index}`} 
                        checked={item.checked}
                        on:change={() => toggleItemChecked(item.id)}
                      />
                      <label for={`item-${item.id}-${index}`} class="checkbox-label"></label>
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
                      
                      {#if item.scheduled_date}
                        <div class="item-date">
                          <span class="date-icon">
                            {@html createIcon('clock', 14)}
                          </span>
                          <span>{item.scheduled_date}</span>
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
                        {@html createIcon('recipe', 16)}
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
          
          {#if filteredItems.some(item => item.checked)}
            <div class="items-section checked-section">
              <h3>Purchased</h3>
              <ul class="grocery-items-list">
                {#each filteredItems.filter(item => item.checked) as item, index (item.id ? `${item.id}-${index}` : `checked-${index}`)}
                  <li class="grocery-item checked animate-fadeIn">
                    <div class="item-checkbox">
                      <input 
                        type="checkbox" 
                        id={`item-${item.id}-${index}`} 
                        checked={item.checked}
                        on:change={() => toggleItemChecked(item.id)}
                      />
                      <label for={`item-${item.id}-${index}`} class="checkbox-label"></label>
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
                    
                    <div class="item-actions">
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
      {/if}
    </div>
  {:else if viewMode === 'calendar'}
    <div class="calendar-view-container">
      <GroceryCalendarView
        {userId}
        {onAddItem}
        {onEditItem}
      />
    </div>
  {/if}
</div>

<!-- Recipe Selection Modal -->
<RecipeSelectionModal 
  userId={userId}
  show={showRecipeSelectionModal}
  on:close={closeRecipeSelectionModal}
  on:generate={handleRecipeSelection}
/>

<style>
  .grocery-list-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }
  
  .calendar-view-container {
    flex: 1;
    overflow: hidden;
  }
  
  .grocery-list-header {
    padding: var(--space-md);
    background-color: var(--white);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    border-bottom: 1px solid var(--light-gray);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  
  .view-toggle {
    display: flex;
    gap: var(--space-xs);
    margin-bottom: var(--space-sm);
    background-color: var(--light-gray);
    border-radius: var(--radius-full);
    padding: var(--space-xs);
  }
  
  .view-toggle-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--radius-full);
    border: none;
    background-color: transparent;
    color: var(--dark-gray);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
    flex: 1;
  }
  
  .view-toggle-button.active {
    background-color: var(--white);
    color: var(--primary);
    box-shadow: var(--shadow-sm);
  }
  
  .toggle-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .search-filter-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    width: 100%;
  }
  
  .search-container {
    flex: 1;
    min-width: 250px;
    position: relative;
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
  
  .filter-sort-container {
    display: flex;
    gap: var(--space-md);
    align-items: center;
  }
  
  .filter-container, .sort-container {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
  
  .filter-label, .sort-label {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--dark-gray);
    font-weight: 500;
    font-size: var(--text-sm);
  }
  
  .filter-select, .sort-select {
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-md);
    border: 2px solid var(--light-gray);
    background-color: var(--white);
    color: var(--dark);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .filter-select:focus, .sort-select:focus {
    border-color: var(--accent-light);
    box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.1);
  }
  
  .grocery-actions {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-xs);
  }
  
  .action-button {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    font-weight: 500;
    transition: all var(--transition-fast);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .action-button.add-item {
    background-color: var(--accent);
    color: var(--white);
  }
  
  .action-button.generate-list {
    background-color: var(--primary);
    color: var(--white);
  }
  
  .action-button.create-note {
    background-color: var(--success);
    color: var(--white);
  }
  
  .action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
  }
  
  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .grocery-list-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-md);
    background-color: var(--off-white);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }
  
  .grocery-items {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }
  
  .items-section {
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
  }
  
  .items-section h3 {
    padding: var(--space-md);
    margin: 0;
    background-color: var(--accent-light);
    color: var(--white);
    font-weight: 600;
  }
  
  .checked-section h3 {
    background-color: var(--success);
  }
  
  .grocery-items-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .grocery-item {
    display: flex;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--light-gray);
    transition: all var(--transition-fast);
  }
  
  .grocery-item:hover {
    background-color: var(--light-gray);
  }
  
  .grocery-item.checked {
    opacity: 0.7;
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
  
  .checked .checkbox-label {
    border-color: var(--success);
  }
  
  .checked .item-checkbox input[type="checkbox"]:checked + .checkbox-label {
    background-color: var(--success);
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
  }
  
  .item-name {
    font-weight: 600;
    font-size: var(--text-base);
    color: var(--dark);
  }
  
  .checked .item-name {
    text-decoration: line-through;
    color: var(--medium-gray);
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
  
  .item-date {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-sm);
    color: var(--dark-gray);
  }
  
  .date-icon {
    color: var(--primary);
  }
  
  .item-notes {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-sm);
    color: var(--dark-gray);
    font-style: italic;
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
  
  /* Food-inspired styling */
  .grocery-list-header {
    background-image: linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,255,255,0.95)), 
                      url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f39c12' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    border-bottom: 2px dashed var(--accent-light);
  }
  
  .grocery-list-content {
    background-image: linear-gradient(to bottom, rgba(249,249,249,0.97), rgba(249,249,249,0.97)), 
                      url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f39c12' fill-opacity='0.05'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  
  .empty-state {
    background-image: linear-gradient(to bottom, rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
                      url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f39c12' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
    border: 2px dashed var(--light-gray);
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .search-filter-container {
      flex-direction: column;
      gap: var(--space-sm);
    }
    
    .filter-sort-container {
      flex-wrap: wrap;
    }
    
    .grocery-actions {
      flex-direction: column;
    }
    
    .empty-actions {
      flex-direction: column;
    }
    
    .view-toggle {
      flex-direction: row;
    }
    
    .view-toggle-button {
      font-size: var(--text-xs);
      padding: var(--space-xs) var(--space-sm);
    }
  }
</style>
