<script lang="ts">
  import { onMount } from 'svelte';
  import '$lib/styles/global.css';
  import '$lib/styles/component-overrides.css';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import StickyNotesPanel from '$lib/components/StickyNotesPanel.svelte';
  import ChatArea from '$lib/components/ChatArea.svelte';
  import RecipeCard from '$lib/components/RecipeCard.svelte';
  import RecipeDetail from '$lib/components/RecipeDetail.svelte';
  import RecipeParser from '$lib/components/RecipeParser.svelte';
  import RecipeEditor from '$lib/components/RecipeEditor.svelte';
  import RecipeList from '$lib/components/RecipeList.svelte';
  import InventoryList from '$lib/components/InventoryList.svelte';
  import InventoryEditor from '$lib/components/InventoryEditor.svelte';
  import GroceryList from '$lib/components/GroceryList.svelte';
  import GroceryItemEditor from '$lib/components/GroceryItemEditor.svelte';
  import { createIcon } from '$lib/utils/icons';
  import { currentSection, type Section } from '$lib/stores/navigationStore';
  import { recipeStore } from '$lib/stores/recipeStore';
  import { inventoryStore } from '$lib/stores/inventoryStore';
  import { groceryStore } from '$lib/stores/groceryStore';
  import type { Recipe, InventoryItem, GroceryItem } from '$lib/services/types';
  import Settings from '$lib/components/Settings.svelte';
  import { initDataService } from '$lib/services/dataService';
  
  // State for layout and navigation
  let activeSection: Section;
  
  // Subscribe to the active section store
  const unsubscribeNav = currentSection.subscribe((value: Section) => {
    activeSection = value;
  });
  
  // Recipe management state
  let selectedRecipe: Recipe | null = null;
  let showRecipeDetail: boolean = false;
  let showRecipeEditor: boolean = false;
  let showRecipeParser: boolean = false;
  let editingRecipe: Recipe | null = null;
  
  // Inventory management state
  let showInventoryEditor: boolean = false;
  let editingInventoryItem: InventoryItem | null = null;
  
  // Grocery management state
  let showGroceryItemEditor: boolean = false;
  let editingGroceryItem: GroceryItem | null = null;
  let initialGroceryDate: string = '';
  
  // State for sticky notes panel
  let stickyNotesPanelOpen = false;
  let user_id = 'default-user';
  
  // Toggle sticky notes panel
  function toggleStickyNotesPanel() {
    stickyNotesPanelOpen = !stickyNotesPanelOpen;
  }
  
  // Mobile state
  let isMobile = false;
  let mobileSidebarOpen = false;
  
  // Check if device is mobile
  function checkMobile() {
    isMobile = window.innerWidth <= 768;
    
    // Auto-close sticky notes panel on mobile
    if (isMobile) {
      stickyNotesPanelOpen = false;
    }
  }
  
  // Toggle mobile sidebar
  function toggleMobileSidebar() {
    mobileSidebarOpen = !mobileSidebarOpen;
  }
  
  onMount(() => {
    // Initialize IndexedDB
    initDataService()
      .then(() => {
        console.log('IndexedDB initialized successfully');
      })
      .catch((error) => {
        console.error('Error initializing IndexedDB:', error);
        console.warn('Falling back to localStorage for data persistence');
      });
    
    // Check if device is mobile on mount
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Clean up on component destruction
    return () => {
      window.removeEventListener('resize', checkMobile);
      unsubscribeNav();
    };
  });
</script>

<div class="app-container">
  <!-- Left Sidebar (Navigation) -->
  <div class="sidebar {mobileSidebarOpen ? 'mobile-open' : ''}">
    <Sidebar />
  </div>
  
  <!-- Main Content Area -->
  <main class="main-content">
    <!-- Mobile Header -->
    {#if isMobile}
      <div class="mobile-header">
        <button class="icon-button" on:click={toggleMobileSidebar} aria-label="Toggle navigation">
          {@html createIcon('menu', 20)}
        </button>
        <div class="mobile-logo">
          <span class="logo-text">Plates<span class="accent">AI</span></span>
        </div>
        <button class="icon-button" on:click={toggleStickyNotesPanel} aria-label="Toggle sticky notes">
          {@html createIcon('notes', 20)}
        </button>
      </div>
    {/if}
    
    <!-- Content Area -->
    <div class="content-area">
      <!-- Chat Section -->
      {#if activeSection === 'chat'}
        <ChatArea {user_id} />
      <!-- Recipes Section -->
      {:else if activeSection === 'recipes'}
        <div class="section-container">
          {#if showRecipeDetail && selectedRecipe}
            <RecipeDetail 
              recipe={selectedRecipe} 
              userId={user_id}
              onEdit={() => {
                editingRecipe = selectedRecipe;
                showRecipeEditor = true;
                showRecipeDetail = false;
              }}
              onBack={() => {
                showRecipeDetail = false;
                selectedRecipe = null;
              }}
              onDelete={async () => {
                if (confirm('Are you sure you want to delete this recipe?')) {
                  if (selectedRecipe) {
                    await recipeStore.deleteRecipe(selectedRecipe.id);
                    showRecipeDetail = false;
                    selectedRecipe = null;
                    alert('Recipe deleted successfully!');
                  }
                }
              }}
            />
          {:else if showRecipeEditor}
            <RecipeEditor 
              recipe={editingRecipe}
              userId={user_id}
              onCancel={() => {
                showRecipeEditor = false;
                if (selectedRecipe) {
                  showRecipeDetail = true;
                }
                editingRecipe = null;
              }}
              on:save={(event) => {
                // Save the recipe to the store
                const recipe = event.detail;
                if (recipe.id) {
                  // Update existing recipe
                  recipeStore.updateRecipe(recipe);
                } else {
                  // Add new recipe
                  recipeStore.addRecipe(recipe);
                }
                
                // Update UI state
                showRecipeEditor = false;
                selectedRecipe = recipe;
                showRecipeDetail = true;
                editingRecipe = null;
                
                // Show a success message
                alert('Recipe saved successfully!');
              }}
            />
          {:else if showRecipeParser}
            <RecipeParser 
              userId={user_id}
              onCancel={() => {
                showRecipeParser = false;
              }}
              on:save={(event) => {
                editingRecipe = event.detail;
                showRecipeParser = false;
                showRecipeEditor = true;
              }}
              on:edit={(event) => {
                editingRecipe = event.detail;
                showRecipeParser = false;
                showRecipeEditor = true;
              }}
            />
          {:else}
            <RecipeList 
              userId={user_id}
              onSelectRecipe={(recipe) => {
                selectedRecipe = recipe;
                showRecipeDetail = true;
              }}
              onNewRecipe={() => {
                editingRecipe = null;
                showRecipeEditor = true;
              }}
              onParseRecipe={() => {
                showRecipeParser = true;
              }}
            />
          {/if}
        </div>
      <!-- Inventory Section -->
      {:else if activeSection === 'inventory'}
        <div class="section-container">
          {#if showInventoryEditor}
            <InventoryEditor 
              item={editingInventoryItem}
              userId={user_id}
              isEditing={!!editingInventoryItem}
              onCancel={() => {
                showInventoryEditor = false;
                editingInventoryItem = null;
              }}
              on:save={(event) => {
                // Extract the edited item from event.detail
                const editedItem = event.detail;
                
                // Save the item to the inventory store
                inventoryStore.updateInventory([editedItem], user_id)
                  .then(() => {
                    console.log('Inventory item saved successfully');
                  })
                  .catch((error) => {
                    console.error('Error saving inventory item:', error);
                    alert('Failed to save inventory item. Please try again.');
                  });
                
                // Update UI state
                showInventoryEditor = false;
                editingInventoryItem = null;
              }}
              on:back={() => {
                showInventoryEditor = false;
                editingInventoryItem = null;
              }}
            />
          {:else}
            <InventoryList 
              userId={user_id}
              onAddItem={() => {
                editingInventoryItem = null;
                showInventoryEditor = true;
              }}
              onEditItem={(item) => {
                editingInventoryItem = item;
                showInventoryEditor = true;
              }}
            />
          {/if}
        </div>
      <!-- Grocery Section -->
      {:else if activeSection === 'grocery'}
        <div class="section-container">
          {#if showGroceryItemEditor}
            <GroceryItemEditor 
              item={editingGroceryItem}
              userId={user_id}
              initialDate={initialGroceryDate}
              isEditing={!!editingGroceryItem}
              onCancel={() => {
                showGroceryItemEditor = false;
                editingGroceryItem = null;
                initialGroceryDate = '';
              }}
              on:save={(event) => {
                // Extract the edited item from event.detail
                const editedItem = event.detail;
                
                // Save the item to the grocery store
                groceryStore.addItem(editedItem, user_id)
                  .then(() => {
                    console.log('Grocery item saved successfully');
                  })
                  .catch((error: Error) => {
                    console.error('Error saving grocery item:', error);
                    alert('Failed to save grocery item. Please try again.');
                  });
                
                // Update UI state
                showGroceryItemEditor = false;
                editingGroceryItem = null;
                initialGroceryDate = '';
              }}
              on:back={() => {
                showGroceryItemEditor = false;
                editingGroceryItem = null;
                initialGroceryDate = '';
              }}
            />
          {:else}
            <GroceryList 
              userId={user_id}
              onAddItem={(date) => {
                editingGroceryItem = null;
                initialGroceryDate = date || '';
                showGroceryItemEditor = true;
              }}
              onEditItem={(item) => {
                editingGroceryItem = item;
                showGroceryItemEditor = true;
              }}
              onGenerateFromRecipe={() => {
                // This would be implemented in a real app
                // For now, we'll just show a message
                alert('Generate grocery list from recipes feature would be implemented here.');
              }}
            />
          {/if}
        </div>
      <!-- Settings Section -->
      {:else if activeSection === 'settings'}
        <div class="section-container">
          <Settings />
        </div>
      {/if}
    </div>
    
    <!-- Slot for page content -->
    <slot />
  </main>
  
  <!-- Right Sidebar (Sticky Notes) -->
  <div class="sticky-notes-panel {stickyNotesPanelOpen ? 'open' : 'closed'}">
    <div class="panel-header">
      <h2>Sticky Notes</h2>
      <button class="icon-button" on:click={toggleStickyNotesPanel} aria-label="Toggle sticky notes">
        {@html createIcon('close', 16)}
      </button>
    </div>
    <StickyNotesPanel {user_id} />
  </div>
  
  <!-- Toggle Sticky Notes Button (Desktop) -->
  {#if !isMobile && !stickyNotesPanelOpen}
    <button class="toggle-notes-button" on:click={toggleStickyNotesPanel} aria-label="Show sticky notes">
      {@html createIcon('notes', 20)}
    </button>
  {/if}
  
  <!-- Mobile Sidebar Overlay -->
  {#if isMobile && mobileSidebarOpen}
    <div class="overlay" on:click={toggleMobileSidebar}></div>
  {/if}
  
  <!-- Mobile Sticky Notes Overlay -->
  {#if isMobile && stickyNotesPanelOpen}
    <div class="overlay" on:click={toggleStickyNotesPanel}></div>
  {/if}
</div>

<style>
  /* Main Layout */
  .app-container {
    display: grid;
    grid-template-columns: auto 1fr auto;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    position: relative;
  }
  
  /* Sidebar */
  .sidebar {
    width: 260px;
    height: 100%;
    background-color: var(--white);
    border-right: 1px solid var(--light-gray);
    overflow-y: auto;
    z-index: 10;
  }
  
  /* Main Content */
  .main-content {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--off-white);
  }
  
  /* Content Area */
  .content-area {
    flex: 1;
    overflow-y: auto;
    padding: 0;
    position: relative;
  }
  
  /* Sticky Notes Panel */
  .sticky-notes-panel {
    width: 300px;
    height: 100%;
    background-color: var(--white);
    border-left: 1px solid var(--light-gray);
    display: flex;
    flex-direction: column;
    transition: all 0.3s ease;
    overflow: hidden;
  }
  
  .sticky-notes-panel.closed {
    width: 0;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--light-gray);
  }
  
  .panel-header h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  
  /* Toggle Notes Button */
  .toggle-notes-button {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: var(--primary);
    color: var(--white);
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    z-index: 5;
    transition: all 0.2s ease;
  }
  
  .toggle-notes-button:hover {
    transform: scale(1.05);
    background-color: var(--primary-dark);
  }
  
  /* Mobile Styles */
  .mobile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: var(--white);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .mobile-logo {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .logo-text {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--primary);
    font-family: var(--font-display);
  }
  
  .logo-text .accent {
    color: var(--primary);
    font-weight: 800;
  }
  
  /* Overlay */
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 50;
    backdrop-filter: blur(2px);
  }
  
  /* Utility Classes */
  .icon-button {
    background: transparent;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--dark-gray);
    transition: all 0.2s ease;
  }
  
  .icon-button:hover {
    background-color: var(--light-gray);
    color: var(--dark);
  }
  
  /* Section Container Styles */
  .section-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .section-container h2 {
    margin-bottom: 1.5rem;
    color: var(--dark);
    font-size: 1.8rem;
  }
  
  .section-container h3 {
    margin-bottom: 1rem;
    color: var(--dark);
    font-size: 1.4rem;
  }
  
  /* Recipe Management */
  .recipe-management {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .recipe-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .recipe-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  /* Action Button */
  .action-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: var(--primary);
    color: var(--white);
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .action-button:hover {
    background-color: var(--primary-dark);
    transform: translateY(-2px);
  }
  
  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    background-color: var(--white);
    border-radius: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    text-align: center;
    margin-top: 2rem;
  }
  
  .empty-state p {
    margin-bottom: 1.5rem;
    color: var(--medium-gray);
  }
  
  /* Responsive Adjustments */
  @media (max-width: 768px) {
    .section-container {
      padding: 1rem;
    }
    
    .recipe-cards {
      grid-template-columns: 1fr;
    }
    
    .recipe-actions {
      flex-direction: column;
    }
  }
</style>
