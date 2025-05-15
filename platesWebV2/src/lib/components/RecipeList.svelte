<script lang="ts">
  import { onMount } from 'svelte';
  import { createIcon } from '../utils/icons';
  import type { Recipe } from '../services/types';
  import { recipeStore } from '../stores/recipeStore';
  import RecipeCard from './RecipeCard.svelte';
  
  // Props
  export let userId: string = 'default-user';
  export let onSelectRecipe: (recipe: Recipe) => void = () => {};
  export let onNewRecipe: () => void = () => {};
  export let onParseRecipe: () => void = () => {};
  
  // State
  let recipes: Recipe[] = [];
  let filteredRecipes: Recipe[] = [];
  let searchQuery: string = '';
  let selectedCategory: string = 'all';
  let sortBy: 'newest' | 'oldest' | 'a-z' | 'z-a' = 'newest';
  let isLoading: boolean = true;
  
  // Categories derived from recipes
  $: categories = getCategories(recipes);
  
  // Filter and sort recipes when any of these values change
  $: {
    filteredRecipes = filterRecipes(recipes, searchQuery, selectedCategory);
    filteredRecipes = sortRecipes(filteredRecipes, sortBy);
  }
  
  // Get unique categories from recipes
  function getCategories(recipeList: Recipe[]): string[] {
    const uniqueCategories = new Set<string>();
    
    // Add 'all' category
    uniqueCategories.add('all');
    
    // Add cuisine types
    recipeList.forEach(recipe => {
      if (recipe.cuisine_type) {
        uniqueCategories.add(recipe.cuisine_type);
      }
    });
    
    // Add meal types
    recipeList.forEach(recipe => {
      if (recipe.meal_type) {
        uniqueCategories.add(recipe.meal_type);
      }
    });
    
    return Array.from(uniqueCategories);
  }
  
  // Filter recipes by search query and category
  function filterRecipes(recipeList: Recipe[], query: string, category: string): Recipe[] {
    let filtered = [...recipeList];
    
    // Filter by search query
    if (query.trim()) {
      const searchTerms = query.toLowerCase().split(' ');
      filtered = filtered.filter(recipe => {
        const searchableText = [
          recipe.title,
          recipe.description,
          recipe.keywords,
          ...(recipe.ingredients?.map(i => i.name) || []),
          ...(recipe.methods || []),
          recipe.cuisine_type,
          recipe.meal_type
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchTerms.every(term => searchableText.includes(term));
      });
    }
    
    // Filter by category
    if (category && category !== 'all') {
      filtered = filtered.filter(recipe => 
        recipe.cuisine_type === category || recipe.meal_type === category
      );
    }
    
    return filtered;
  }
  
  // Sort recipes
  function sortRecipes(recipeList: Recipe[], sortOption: string): Recipe[] {
    const sorted = [...recipeList];
    
    switch (sortOption) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case 'a-z':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'z-a':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return sorted;
    }
  }
  
  // Handle recipe selection
  function handleSelectRecipe(recipe: Recipe) {
    onSelectRecipe(recipe);
  }
  
  // Load recipes on mount
  onMount(() => {
    isLoading = true;
    recipeStore.loadRecipes(userId);
    
    // Subscribe to recipe store
    const unsubscribe = recipeStore.subscribe(value => {
      recipes = value;
      isLoading = false;
    });
    
    return unsubscribe;
  });
</script>

<div class="recipe-list-container">
  <div class="recipe-list-header">
    <div class="search-filter-container">
      <div class="search-container">
        <span class="search-icon">
          {@html createIcon('search', 18)}
        </span>
        <input 
          type="text" 
          placeholder="Search recipes, ingredients, cuisine..." 
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
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
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
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="a-z">A to Z</option>
            <option value="z-a">Z to A</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="recipe-actions">
      <button class="action-button new-recipe" on:click={onNewRecipe}>
        <span class="action-icon">
          {@html createIcon('add', 16)}
        </span>
        <span>New Recipe</span>
      </button>
      
      <button class="action-button parse-recipe" on:click={onParseRecipe}>
        <span class="action-icon">
          {@html createIcon('parse', 16)}
        </span>
        <span>Parse Recipe</span>
      </button>
    </div>
  </div>
  
  <div class="recipe-list-content">
    {#if isLoading}
      <div class="loading-container">
        <div class="loading-spinner animate-stir">
          {@html createIcon('recipe', 40)}
        </div>
        <p>Loading your delicious recipes...</p>
      </div>
    {:else if filteredRecipes.length === 0}
      <div class="empty-state">
        {#if searchQuery || selectedCategory !== 'all'}
          <div class="empty-icon animate-bubble">
            {@html createIcon('search', 48)}
          </div>
          <h3>No matching recipes found</h3>
          <p>Try adjusting your search or filters</p>
          <button class="reset-button" on:click={() => { searchQuery = ''; selectedCategory = 'all'; }}>
            Reset Filters
          </button>
        {:else}
          <div class="empty-icon">
            {@html createIcon('recipe', 48)}
          </div>
          <h3>Your recipe collection is empty</h3>
          <p>Add your first recipe to get started!</p>
          <div class="empty-actions">
            <button class="action-button new-recipe" on:click={onNewRecipe}>
              <span class="action-icon">
                {@html createIcon('add', 16)}
              </span>
              <span>Create Recipe</span>
            </button>
            
            <button class="action-button parse-recipe" on:click={onParseRecipe}>
              <span class="action-icon">
                {@html createIcon('parse', 16)}
              </span>
              <span>Import Recipe</span>
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <div class="recipe-grid">
        {#each filteredRecipes as recipe (recipe.id)}
          <div class="recipe-card-wrapper animate-fadeIn">
            <RecipeCard {recipe} onClick={() => handleSelectRecipe(recipe)} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .recipe-list-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }
  
  .recipe-list-header {
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
  
  .recipe-actions {
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
  
  .action-button.new-recipe {
    background-color: var(--primary);
    color: var(--white);
  }
  
  .action-button.parse-recipe {
    background-color: var(--accent);
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
  
  .recipe-list-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-md);
    background-color: var(--off-white);
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  }
  
  .recipe-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-md);
  }
  
  .recipe-card-wrapper {
    height: 100%;
    transition: transform var(--transition-fast);
  }
  
  .recipe-card-wrapper:hover {
    transform: translateY(-4px);
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
    color: var(--primary);
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
    color: var(--primary-light);
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
  .recipe-list-header {
    background-image: linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,255,255,0.95)), 
                      url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f39c12' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    border-bottom: 2px dashed var(--butter);
  }
  
  .recipe-list-content {
    background-image: linear-gradient(to bottom, rgba(249,249,249,0.97), rgba(249,249,249,0.97)), 
                      url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e74c3c' fill-opacity='0.05'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
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
    
    .recipe-actions {
      flex-direction: column;
    }
    
    .recipe-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
