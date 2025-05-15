<script lang="ts">
  import { onMount } from 'svelte';
  import { createIcon } from '../utils/icons';
  import type { InventoryItem } from '../services/types';
  import { inventoryStore } from '../stores/inventoryStore';
  
  // Props
  export let userId: string = 'default-user';
  export let onAddItem: () => void = () => {};
  export let onEditItem: (item: InventoryItem) => void = () => {};
  
  // State
  let inventory: InventoryItem[] = [];
  let filteredInventory: InventoryItem[] = [];
  let searchQuery: string = '';
  let selectedCategory: string = 'all';
  let sortBy: 'name-asc' | 'name-desc' | 'expiry-asc' | 'expiry-desc' = 'name-asc';
  let isLoading: boolean = true;
  let categorizedItems: { [category: string]: InventoryItem[] } = {};
  let expiringItems: InventoryItem[] = [];
  let expiredItems: InventoryItem[] = [];
  
  // Categories derived from inventory
  $: categories = getCategories(inventory);
  
  // Filter and sort inventory when any of these values change
  $: {
    filteredInventory = filterInventory(inventory, searchQuery, selectedCategory);
    filteredInventory = sortInventory(filteredInventory, sortBy);
  }
  
  // Get unique categories from inventory
  function getCategories(inventoryList: InventoryItem[]): string[] {
    const uniqueCategories = new Set<string>();
    
    // Add 'all' category
    uniqueCategories.add('all');
    
    // Add 'expiring soon' category if there are expiring items
    if (expiringItems.length > 0) {
      uniqueCategories.add('expiring');
    }
    
    // Add 'expired' category if there are expired items
    if (expiredItems.length > 0) {
      uniqueCategories.add('expired');
    }
    
    // Add inventory categories
    inventoryList.forEach(item => {
      if (item.category) {
        uniqueCategories.add(item.category);
      }
    });
    
    return Array.from(uniqueCategories);
  }
  
  // Filter inventory by search query and category
  function filterInventory(inventoryList: InventoryItem[], query: string, category: string): InventoryItem[] {
    let filtered = [...inventoryList];
    
    // Filter by search query
    if (query.trim()) {
      const searchTerms = query.toLowerCase().split(' ');
      filtered = filtered.filter(item => {
        const searchableText = [
          item.ingredient_name,
          item.category,
          item.location,
          item.notes
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchTerms.every(term => searchableText.includes(term));
      });
    }
    
    // Filter by category
    if (category && category !== 'all') {
      if (category === 'expiring') {
        filtered = expiringItems;
      } else if (category === 'expired') {
        filtered = expiredItems;
      } else {
        filtered = filtered.filter(item => item.category === category);
      }
    }
    
    return filtered;
  }
  
  // Sort inventory
  function sortInventory(inventoryList: InventoryItem[], sortOption: string): InventoryItem[] {
    const sorted = [...inventoryList];
    
    switch (sortOption) {
      case 'name-asc':
        return sorted.sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name));
      case 'name-desc':
        return sorted.sort((a, b) => b.ingredient_name.localeCompare(a.ingredient_name));
      case 'expiry-asc':
        return sorted.sort((a, b) => {
          if (!a.expires_at) return 1;
          if (!b.expires_at) return -1;
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
        });
      case 'expiry-desc':
        return sorted.sort((a, b) => {
          if (!a.expires_at) return 1;
          if (!b.expires_at) return -1;
          return new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime();
        });
      default:
        return sorted;
    }
  }
  
  // Format date (e.g., "Jan 15, 2023")
  function formatDate(dateString: string | undefined): string {
    if (!dateString) return 'No expiry';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  // Check if an item is expiring soon (within 7 days)
  function isExpiringSoon(dateString: string | undefined): boolean {
    if (!dateString) return false;
    
    const now = new Date();
    const expiryDate = new Date(dateString);
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return expiryDate > now && expiryDate <= sevenDaysLater;
  }
  
  // Check if an item is expired
  function isExpired(dateString: string | undefined): boolean {
    if (!dateString) return false;
    
    const now = new Date();
    const expiryDate = new Date(dateString);
    
    return expiryDate <= now;
  }
  
  // Remove an inventory item
  function removeItem(itemId: number | undefined) {
    if (itemId !== undefined) {
      inventoryStore.removeItem(itemId);
    }
  }
  
  // Load inventory on mount
  onMount(() => {
    isLoading = true;
    inventoryStore.loadInventory(userId);
    
    // Subscribe to inventory store
    const unsubscribe = inventoryStore.subscribe(value => {
      inventory = value;
      
      // Get categorized items
      categorizedItems = inventoryStore.getItemsByCategory();
      
      // Get expiring and expired items
      expiringItems = inventoryStore.getExpiringItems();
      expiredItems = inventoryStore.getExpiredItems();
      
      isLoading = false;
    });
    
    return unsubscribe;
  });
</script>

<div class="inventory-list-container">
  <div class="inventory-list-header">
    <div class="search-filter-container">
      <div class="search-container">
        <span class="search-icon">
          {@html createIcon('search', 18)}
        </span>
        <input 
          type="text" 
          placeholder="Search ingredients, categories..." 
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
            <span>Filter</span>
          </label>
          <select id="category-filter" bind:value={selectedCategory} class="filter-select">
            {#each categories as category}
              <option value={category}>
                {category === 'all' ? 'All Categories' : 
                 category === 'expiring' ? 'Expiring Soon' :
                 category === 'expired' ? 'Expired' :
                 category.charAt(0).toUpperCase() + category.slice(1)}
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
            <option value="expiry-asc">Expiry (Soonest First)</option>
            <option value="expiry-desc">Expiry (Latest First)</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="inventory-actions">
      <button class="action-button add-item" on:click={onAddItem}>
        <span class="action-icon">
          {@html createIcon('add', 16)}
        </span>
        <span>Add Ingredient</span>
      </button>
    </div>
  </div>
  
  <div class="inventory-list-content">
    {#if isLoading}
      <div class="loading-container">
        <div class="loading-spinner animate-stir">
          {@html createIcon('inventory', 40)}
        </div>
        <p>Loading your pantry items...</p>
      </div>
    {:else if filteredInventory.length === 0}
      <div class="empty-state">
        {#if searchQuery || selectedCategory !== 'all'}
          <div class="empty-icon animate-bubble">
            {@html createIcon('search', 48)}
          </div>
          <h3>No matching ingredients found</h3>
          <p>Try adjusting your search or filters</p>
          <button class="reset-button" on:click={() => { searchQuery = ''; selectedCategory = 'all'; }}>
            Reset Filters
          </button>
        {:else}
          <div class="empty-icon">
            {@html createIcon('inventory', 48)}
          </div>
          <h3>Your pantry is empty</h3>
          <p>Add your first ingredient to get started!</p>
          <div class="empty-actions">
            <button class="action-button add-item" on:click={onAddItem}>
              <span class="action-icon">
                {@html createIcon('add', 16)}
              </span>
              <span>Add Ingredient</span>
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <div class="inventory-grid">
        {#each filteredInventory as item (item.id)}
          <div class="inventory-item-card animate-fadeIn">
            <div class="item-header">
              <div class="item-category">
                {item.category || 'Uncategorized'}
              </div>
              <div class="item-actions">
                <button 
                  class="icon-button edit-button" 
                  on:click={() => onEditItem(item)}
                  title="Edit item"
                >
                  {@html createIcon('edit', 16)}
                </button>
                <button class="icon-action" on:click={() => removeItem(item.id)} title="Remove">
                  {@html createIcon('delete', 16)}
                </button>
              </div>
            </div>
            
            <div class="item-content">
              <h3 class="item-name">{item.ingredient_name}</h3>
              
              <div class="item-details">
                {#if item.amount || item.unit}
                  <div class="item-amount">
                    {item.amount || ''} {item.unit || ''}
                  </div>
                {/if}
                
                {#if item.location}
                  <div class="item-location">
                    <span class="location-icon">
                      {@html createIcon('inventory', 14)}
                    </span>
                    <span>{item.location}</span>
                  </div>
                {/if}
                
                {#if item.expires_at}
                  <div class="item-expiry" class:expiring={isExpiringSoon(item.expires_at)} class:expired={isExpired(item.expires_at)}>
                    <span class="expiry-icon">
                      {@html createIcon('clock', 14)}
                    </span>
                    <span>
                      {isExpired(item.expires_at) ? 'Expired: ' : 'Expires: '}
                      {formatDate(item.expires_at)}
                    </span>
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
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .inventory-list-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }
  
  .inventory-list-header {
    padding: var(--space-md);
    background-color: var(--white);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    border-bottom: 1px solid var(--light-gray);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
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
    border-color: var(--primary-light);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
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
    border-color: var(--primary-light);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
  }
  
  .inventory-actions {
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
    background-color: var(--secondary);
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
  
  .inventory-list-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-md);
    background-color: var(--off-white);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }
  
  .inventory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: var(--space-md);
  }
  
  .inventory-item-card {
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    transition: all var(--transition-fast);
    display: flex;
    flex-direction: column;
  }
  
  .inventory-item-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
  
  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-xs) var(--space-sm);
    background-color: var(--light-gray);
  }
  
  .item-category {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--dark-gray);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .item-actions {
    display: flex;
    gap: var(--space-xs);
  }
  
  .icon-button {
    width: 24px;
    height: 24px;
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
  
  .icon-button:hover {
    background-color: var(--white);
    color: var(--primary);
  }
  
  .item-content {
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    flex: 1;
  }
  
  .item-name {
    margin: 0;
    font-size: var(--text-lg);
    color: var(--dark);
  }
  
  .item-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
  
  .item-amount {
    font-weight: 600;
    font-size: var(--text-base);
    color: var(--dark);
  }
  
  .item-location, .item-expiry, .item-notes {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-sm);
    color: var(--dark-gray);
  }
  
  .item-expiry.expiring {
    color: var(--warning);
  }
  
  .item-expiry.expired {
    color: var(--error);
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
    color: var(--secondary);
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
    color: var(--secondary-light);
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
  .inventory-list-header {
    background-image: linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,255,255,0.95)), 
                      url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232ecc71' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    border-bottom: 2px dashed var(--secondary-light);
  }
  
  .inventory-list-content {
    background-image: linear-gradient(to bottom, rgba(249,249,249,0.97), rgba(249,249,249,0.97)), 
                      url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232ecc71' fill-opacity='0.05'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
  
  .empty-state {
    background-image: linear-gradient(to bottom, rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
                      url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%232ecc71' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
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
    
    .inventory-actions {
      flex-direction: column;
    }
    
    .inventory-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
