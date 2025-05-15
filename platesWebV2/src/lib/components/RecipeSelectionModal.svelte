<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { createIcon } from '../utils/icons';
  import type { Recipe } from '../services/types';
  import { recipeStore } from '../stores/recipeStore';
  
  // Props
  export let userId: string = 'default-user';
  export let show: boolean = false;
  
  // State
  let recipes: Recipe[] = [];
  let selectedRecipeIds: number[] = [];
  let searchQuery: string = '';
  let filteredRecipes: Recipe[] = [];
  let isLoading: boolean = true;
  
  // Event dispatcher
  const dispatch = createEventDispatcher();
  
  // Filter recipes based on search query
  $: {
    if (recipes) {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredRecipes = recipes.filter(recipe => 
          recipe.title.toLowerCase().includes(query) || 
          recipe.description.toLowerCase().includes(query) ||
          recipe.keywords.toLowerCase().includes(query)
        );
      } else {
        filteredRecipes = [...recipes];
      }
    }
  }
  
  // Toggle recipe selection
  function toggleRecipeSelection(recipeId: number) {
    if (selectedRecipeIds.includes(recipeId)) {
      selectedRecipeIds = selectedRecipeIds.filter(id => id !== recipeId);
    } else {
      selectedRecipeIds = [...selectedRecipeIds, recipeId];
    }
  }
  
  // Select all recipes
  function selectAllRecipes() {
    selectedRecipeIds = filteredRecipes.map(recipe => recipe.id);
  }
  
  // Deselect all recipes
  function deselectAllRecipes() {
    selectedRecipeIds = [];
  }
  
  // Close modal
  function closeModal() {
    dispatch('close');
  }
  
  // Generate grocery list from selected recipes
  function generateGroceryList() {
    if (selectedRecipeIds.length > 0) {
      dispatch('generate', { recipeIds: selectedRecipeIds });
    }
  }
  
  // Load recipes on mount
  onMount(() => {
    isLoading = true;
    
    // Load recipes
    recipeStore.loadRecipes(userId)
      .then(loadedRecipes => {
        recipes = loadedRecipes || [];
      })
      .catch(error => {
        console.error('Error loading recipes:', error);
        recipes = [];
      })
      .finally(() => {
        isLoading = false;
      });
    
    // Subscribe to recipe store
    const unsubscribe = recipeStore.subscribe(value => {
      recipes = value;
    });
    
    // Return cleanup function
    return unsubscribe;
  });
</script>

{#if show}
  <div class="modal-backdrop" on:click={closeModal}>
    <div class="modal-container" on:click|stopPropagation>
      <div class="modal-header">
        <h2>Select Recipes</h2>
        <button class="close-button" on:click={closeModal}>
          {@html createIcon('close', 24)}
        </button>
      </div>
      
      <div class="modal-content">
        <div class="search-container">
          <span class="search-icon">
            {@html createIcon('search', 18)}
          </span>
          <input 
            type="text" 
            placeholder="Search recipes..." 
            bind:value={searchQuery}
            class="search-input"
          />
          {#if searchQuery}
            <button class="clear-search" on:click={() => searchQuery = ''}>
              {@html createIcon('close', 16)}
            </button>
          {/if}
        </div>
        
        <div class="selection-actions">
          <button class="action-button" on:click={selectAllRecipes}>Select All</button>
          <button class="action-button" on:click={deselectAllRecipes}>Deselect All</button>
        </div>
        
        {#if isLoading}
          <div class="loading-container">
            <div class="loading-spinner animate-stir">
              {@html createIcon('recipe', 40)}
            </div>
            <p>Loading recipes...</p>
          </div>
        {:else if filteredRecipes.length === 0}
          <div class="empty-state">
            {#if searchQuery}
              <div class="empty-icon">
                {@html createIcon('search', 48)}
              </div>
              <h3>No matching recipes found</h3>
              <p>Try adjusting your search query</p>
              <button class="reset-button" on:click={() => searchQuery = ''}>
                Clear Search
              </button>
            {:else}
              <div class="empty-icon">
                {@html createIcon('recipe', 48)}
              </div>
              <h3>No recipes available</h3>
              <p>Add some recipes first to generate a grocery list</p>
            {/if}
          </div>
        {:else}
          <div class="recipe-list">
            {#each filteredRecipes as recipe (recipe.id)}
              <div class="recipe-item" class:selected={selectedRecipeIds.includes(recipe.id)}>
                <div class="recipe-checkbox">
                  <input 
                    type="checkbox" 
                    id={`recipe-${recipe.id}`} 
                    checked={selectedRecipeIds.includes(recipe.id)}
                    on:change={() => toggleRecipeSelection(recipe.id)}
                  />
                  <label for={`recipe-${recipe.id}`} class="checkbox-label"></label>
                </div>
                
                <div class="recipe-details" on:click={() => toggleRecipeSelection(recipe.id)}>
                  <h3 class="recipe-title">{recipe.title}</h3>
                  
                  <div class="recipe-meta">
                    {#if recipe.servings}
                      <span class="recipe-servings">
                        <span class="meta-icon">{@html createIcon('recipe', 14)}</span>
                        {recipe.servings}
                      </span>
                    {/if}
                    
                    {#if recipe.prep_time}
                      <span class="recipe-time">
                        <span class="meta-icon">{@html createIcon('clock', 14)}</span>
                        {recipe.prep_time}
                      </span>
                    {/if}
                    
                    {#if recipe.cuisine_type}
                      <span class="recipe-cuisine">
                        <span class="meta-icon">{@html createIcon('filter', 14)}</span>
                        {recipe.cuisine_type}
                      </span>
                    {/if}
                  </div>
                  
                  <div class="recipe-ingredients">
                    <span class="ingredients-count">
                      {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <button class="cancel-button" on:click={closeModal}>Cancel</button>
        <button 
          class="generate-button" 
          on:click={generateGroceryList}
          disabled={selectedRecipeIds.length === 0}
        >
          Generate List ({selectedRecipeIds.length} recipe{selectedRecipeIds.length !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.7); /* Darker, more opaque background */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    animation: fadeIn 0.2s ease-out;
    overflow: hidden;
  }
  
  .modal-container {
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); /* Stronger shadow for better definition */
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease-out;
    z-index: 2001;
    overflow: hidden;
    border: 1px solid var(--light-gray);
  }
  
  .modal-header {
    padding: var(--space-md);
    border-bottom: 1px solid var(--light-gray);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .modal-header h2 {
    margin: 0;
    font-size: var(--text-xl);
    color: var(--dark);
  }
  
  .close-button {
    background: transparent;
    border: none;
    color: var(--dark-gray);
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }
  
  .close-button:hover {
    background-color: var(--light-gray);
    color: var(--dark);
  }
  
  .modal-content {
    padding: var(--space-md);
    overflow-y: auto;
    flex: 1;
  }
  
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
  
  .selection-actions {
    display: flex;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .action-button {
    background-color: var(--light-gray);
    color: var(--dark-gray);
    border: none;
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .action-button:hover {
    background-color: var(--medium-gray);
    color: var(--white);
  }
  
  .recipe-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .recipe-item {
    display: flex;
    align-items: flex-start;
    padding: var(--space-md);
    border-radius: var(--radius-md);
    background-color: var(--off-white);
    transition: all var(--transition-fast);
    border: 2px solid transparent;
  }
  
  .recipe-item:hover {
    background-color: var(--light-gray);
  }
  
  .recipe-item.selected {
    border-color: var(--accent);
    background-color: rgba(var(--accent-rgb), 0.05);
  }
  
  .recipe-checkbox {
    margin-right: var(--space-md);
    margin-top: var(--space-xs);
  }
  
  .recipe-checkbox input[type="checkbox"] {
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
  
  .recipe-checkbox input[type="checkbox"]:checked + .checkbox-label {
    background-color: var(--accent);
  }
  
  .recipe-checkbox input[type="checkbox"]:checked + .checkbox-label::after {
    display: block;
  }
  
  .recipe-details {
    flex: 1;
    cursor: pointer;
  }
  
  .recipe-title {
    margin: 0 0 var(--space-xs) 0;
    font-size: var(--text-lg);
    color: var(--dark);
  }
  
  .recipe-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    margin-bottom: var(--space-xs);
    font-size: var(--text-sm);
    color: var(--dark-gray);
  }
  
  .meta-icon {
    display: inline-flex;
    align-items: center;
    margin-right: var(--space-xs);
    color: var(--accent);
  }
  
  .recipe-ingredients {
    font-size: var(--text-sm);
    color: var(--medium-gray);
  }
  
  .ingredients-count {
    font-style: italic;
  }
  
  .modal-footer {
    padding: var(--space-md);
    border-top: 1px solid var(--light-gray);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-md);
  }
  
  .cancel-button {
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-md);
    background-color: var(--light-gray);
    color: var(--dark-gray);
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .cancel-button:hover {
    background-color: var(--medium-gray);
    color: var(--white);
  }
  
  .generate-button {
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-md);
    background-color: var(--primary);
    color: var(--white);
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .generate-button:hover:not(:disabled) {
    background-color: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  .generate-button:disabled {
    background-color: var(--light-gray);
    color: var(--medium-gray);
    cursor: not-allowed;
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
  
  /* Animations */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideIn {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  .animate-stir {
    animation: stir 2s infinite;
  }
  
  @keyframes stir {
    0% { transform: rotate(0deg); }
    25% { transform: rotate(10deg); }
    50% { transform: rotate(0deg); }
    75% { transform: rotate(-10deg); }
    100% { transform: rotate(0deg); }
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .modal-container {
      width: 95%;
      max-height: 90vh;
    }
    
    .selection-actions {
      flex-direction: column;
      gap: var(--space-sm);
    }
    
    .recipe-meta {
      flex-direction: column;
      gap: var(--space-xs);
    }
  }
</style>
