<script lang="ts">
  import { onMount } from 'svelte';
  import { createIcon } from '../utils/icons';
  import type { Recipe } from '../services/types';
  import { inventoryStore } from '../stores/inventoryStore';
  
  // Props
  export let recipe: Recipe;
  export let userId: string = 'default-user';
  export let onEdit: () => void = () => {};
  export let onBack: () => void = () => {};
  export let onDelete: () => void = () => {};
  
  // State
  let activeTab = 'ingredients';
  
  // Define the type for inventory check result
  type InventoryCheckResult = {
    hasAllIngredients: boolean;
    missingIngredients: { name: string; amount: string; unit?: string }[];
    availableIngredients: { name: string; amount: string; unit?: string }[];
  };
  
  let inventoryCheck: InventoryCheckResult = { 
    hasAllIngredients: false, 
    missingIngredients: [], 
    availableIngredients: [] 
  };
  
  // Computed properties
  $: difficulty = recipe.difficulty || 'medium';
  $: difficultyColor = {
    'easy': 'var(--success)',
    'medium': 'var(--warning)',
    'hard': 'var(--error)'
  }[difficulty] || 'var(--warning)';
  
  // Format time (e.g., "30 minutes")
  function formatTime(timeString: string | undefined): string {
    if (!timeString) return 'N/A';
    return timeString;
  }
  
  // Check if ingredients are in inventory
  async function checkInventory() {
    inventoryCheck = await inventoryStore.checkRecipeIngredients(recipe, userId);
  }
  
  // Mark recipe as cooked (subtract ingredients from inventory)
  async function markAsCooked() {
    await inventoryStore.subtractRecipeIngredients(recipe, userId);
    await checkInventory();
  }
  
  // Initialize
  onMount(() => {
    checkInventory();
  });
</script>

<div class="recipe-detail">
  <div class="recipe-header">
    <button class="back-button" on:click={onBack}>
      {@html createIcon('menu', 20)}
      <span>Back</span>
    </button>
    
    <div class="recipe-actions">
      <button class="action-button" on:click={onEdit}>
        {@html createIcon('edit', 16)}
        <span>Edit</span>
      </button>
      
      <button class="action-button" on:click={markAsCooked}>
        {@html createIcon('recipe', 16)}
        <span>Mark as Cooked</span>
      </button>

      <button class="action-button delete-button" on:click={onDelete}>
        {@html createIcon('delete', 16)}
        <span>Delete</span>
      </button>
    </div>
  </div>
  
  <div class="recipe-hero">
    <div class="recipe-image">
      {#if recipe.image_url}
        <img src={recipe.image_url} alt={recipe.title} />
      {:else}
        <div class="recipe-icon">
          {@html createIcon('recipe', 60)}
        </div>
      {/if}
    </div>
    
    <div class="recipe-info">
      <h1 class="recipe-title">{recipe.title}</h1>
      
      <p class="recipe-description">{recipe.description}</p>
      
      <div class="recipe-meta">
        <div class="meta-item">
          <span class="meta-icon">
            {@html createIcon('clock', 16)}
          </span>
          <span class="meta-label">Prep:</span>
          <span class="meta-text">{formatTime(recipe.prep_time)}</span>
        </div>
        
        <div class="meta-item">
          <span class="meta-icon">
            {@html createIcon('clock', 16)}
          </span>
          <span class="meta-label">Cook:</span>
          <span class="meta-text">{formatTime(recipe.cook_time)}</span>
        </div>
        
        <div class="meta-item">
          <span class="meta-icon">
            {@html createIcon('users', 16)}
          </span>
          <span class="meta-label">Serves:</span>
          <span class="meta-text">{recipe.servings}</span>
        </div>
        
        <div class="meta-item">
          <span class="meta-icon" style="color: {difficultyColor}">
            {@html createIcon('difficulty', 16)}
          </span>
          <span class="meta-label">Difficulty:</span>
          <span class="meta-text" style="color: {difficultyColor}">
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </span>
        </div>
        
        {#if recipe.calories_per_serving}
          <div class="meta-item">
            <span class="meta-icon">
              {@html createIcon('recipe', 16)}
            </span>
            <span class="meta-label">Calories:</span>
            <span class="meta-text">{recipe.calories_per_serving} per serving</span>
          </div>
        {/if}
      </div>
      
      <div class="recipe-tags">
        {#if recipe.cuisine_type}
          <span class="tag cuisine-tag">{recipe.cuisine_type}</span>
        {/if}
        
        {#if recipe.meal_type}
          <span class="tag meal-tag">{recipe.meal_type}</span>
        {/if}
        
        {#each recipe.keywords.split(',') as keyword}
          {#if keyword.trim()}
            <span class="tag keyword-tag">{keyword.trim()}</span>
          {/if}
        {/each}
      </div>
    </div>
  </div>
  
  <div class="recipe-tabs">
    <button 
      class="tab-button {activeTab === 'ingredients' ? 'active' : ''}" 
      on:click={() => activeTab = 'ingredients'}
    >
      Ingredients
    </button>
    
    <button 
      class="tab-button {activeTab === 'steps' ? 'active' : ''}" 
      on:click={() => activeTab = 'steps'}
    >
      Steps
    </button>
    
    <button 
      class="tab-button {activeTab === 'notes' ? 'active' : ''}" 
      on:click={() => activeTab = 'notes'}
    >
      Notes
    </button>
  </div>
  
  <div class="recipe-content">
    {#if activeTab === 'ingredients'}
      <div class="ingredients-section">
        <div class="inventory-check">
          <h3>Inventory Check</h3>
          {#if inventoryCheck.hasAllIngredients}
            <div class="inventory-status success">
              <span class="status-icon">✓</span>
              <span>You have all ingredients needed!</span>
            </div>
          {:else}
            <div class="inventory-status warning">
              <span class="status-icon">!</span>
              <span>You're missing {inventoryCheck.missingIngredients.length} ingredient{inventoryCheck.missingIngredients.length !== 1 ? 's' : ''}.</span>
            </div>
          {/if}
        </div>
        
        <h3>Ingredients</h3>
        <ul class="ingredients-list">
          {#each recipe.ingredients as ingredient}
            {@const isMissing = inventoryCheck.missingIngredients.some(
              item => item.name.toLowerCase() === ingredient.name.toLowerCase()
            )}
            <li class="ingredient-item {isMissing ? 'missing' : ''}">
              <div class="ingredient-amount">
                {ingredient.amount} {ingredient.unit || ''}
              </div>
              <div class="ingredient-name">
                {ingredient.name}
                {#if ingredient.preparation}
                  <span class="ingredient-prep">, {ingredient.preparation}</span>
                {/if}
              </div>
              {#if isMissing}
                <div class="missing-badge">Missing</div>
              {/if}
            </li>
          {/each}
        </ul>
        
        {#if recipe.tools && recipe.tools.length > 0}
          <h3>Tools Needed</h3>
          <ul class="tools-list">
            {#each recipe.tools as tool}
              <li>{tool}</li>
            {/each}
          </ul>
        {/if}
      </div>
    {:else if activeTab === 'steps'}
      <div class="steps-section">
        <h3>Instructions</h3>
        <ol class="steps-list">
          {#each recipe.steps as step}
            <li class="step-item">
              <div class="step-content">
                <p>{step.instruction}</p>
                
                {#if step.tip}
                  <div class="step-tip">
                    <span class="tip-icon">💡</span>
                    <span>{step.tip}</span>
                  </div>
                {/if}
              </div>
              
              {#if step.duration}
                <div class="step-timer">
                  <span class="timer-icon">
                    {@html createIcon('clock', 16)}
                  </span>
                  <span class="timer-text">
                    {step.duration.minutes} min {step.duration.seconds > 0 ? `${step.duration.seconds} sec` : ''}
                  </span>
                  <button class="timer-button">
                    Start Timer
                  </button>
                </div>
              {/if}
            </li>
          {/each}
        </ol>
      </div>
    {:else if activeTab === 'notes'}
      <div class="notes-section">
        <h3>Recipe Notes</h3>
        {#if recipe.notes}
          <div class="recipe-notes">
            <p>{recipe.notes}</p>
          </div>
        {:else}
          <p class="empty-notes">No notes for this recipe yet.</p>
        {/if}
        
        {#if recipe.source}
          <h3>Source</h3>
          <p class="recipe-source">{recipe.source}</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .recipe-detail {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }
  
  .recipe-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .back-button {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    background: transparent;
    border: none;
    color: var(--dark-gray);
    cursor: pointer;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }
  
  .back-button:hover {
    background-color: var(--light-gray);
    color: var(--dark);
  }
  
  .recipe-actions {
    display: flex;
    gap: var(--space-sm);
  }
  
  .action-button {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-md);
    background-color: var(--primary-light);
    color: var(--white);
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .action-button:hover {
    background-color: var(--primary);
    transform: translateY(-2px);
  }

  .delete-button {
    background-color: var(--error-light);
  }

  .delete-button:hover {
    background-color: var(--error);
  }
  
  .recipe-hero {
    display: flex;
    padding: var(--space-lg);
    gap: var(--space-lg);
    background-color: var(--off-white);
  }
  
  .recipe-image {
    width: 300px;
    height: 300px;
    border-radius: var(--radius-lg);
    overflow: hidden;
    background-color: var(--primary-light);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .recipe-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .recipe-icon {
    color: rgba(255, 255, 255, 0.8);
  }
  
  .recipe-info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .recipe-title {
    margin-top: 0;
    margin-bottom: var(--space-sm);
    font-size: var(--text-3xl);
    color: var(--dark);
    line-height: 1.2;
  }
  
  .recipe-description {
    color: var(--dark-gray);
    font-size: var(--text-base);
    margin-bottom: var(--space-md);
    line-height: 1.6;
  }
  
  .recipe-meta {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-sm);
    color: var(--dark-gray);
  }
  
  .meta-label {
    font-weight: 600;
    color: var(--dark);
  }
  
  .recipe-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-top: auto;
  }
  
  .tag {
    font-size: var(--text-xs);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    background-color: var(--light-gray);
    color: var(--dark-gray);
  }
  
  .cuisine-tag {
    background-color: var(--primary-light);
    color: var(--white);
  }
  
  .meal-tag {
    background-color: var(--secondary-light);
    color: var(--white);
  }
  
  .keyword-tag {
    background-color: var(--light-gray);
    color: var(--dark-gray);
  }
  
  .recipe-tabs {
    display: flex;
    border-bottom: 1px solid var(--light-gray);
    padding: 0 var(--space-md);
  }
  
  .tab-button {
    padding: var(--space-sm) var(--space-md);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--dark-gray);
    cursor: pointer;
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .tab-button.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }
  
  .tab-button:hover:not(.active) {
    color: var(--dark);
    background-color: var(--light-gray);
  }
  
  .recipe-content {
    padding: var(--space-lg);
    flex: 1;
    overflow-y: auto;
  }
  
  .inventory-check {
    margin-bottom: var(--space-md);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    background-color: var(--light-gray);
  }
  
  .inventory-status {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-weight: 500;
    margin-top: var(--space-xs);
  }
  
  .inventory-status.success {
    color: var(--success);
  }
  
  .inventory-status.warning {
    color: var(--warning);
  }
  
  .status-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    font-weight: bold;
  }
  
  .inventory-status.success .status-icon {
    background-color: var(--success);
    color: var(--white);
  }
  
  .inventory-status.warning .status-icon {
    background-color: var(--warning);
    color: var(--white);
  }
  
  .ingredients-list, .tools-list {
    list-style: none;
    padding: 0;
    margin-bottom: var(--space-lg);
  }
  
  .ingredient-item {
    display: flex;
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--light-gray);
    position: relative;
  }
  
  .ingredient-item.missing {
    background-color: rgba(var(--warning-rgb, 243, 156, 18), 0.1);
  }
  
  .ingredient-amount {
    width: 100px;
    font-weight: 500;
    color: var(--dark);
  }
  
  .ingredient-name {
    flex: 1;
  }
  
  .ingredient-prep {
    font-style: italic;
    color: var(--dark-gray);
  }
  
  .missing-badge {
    background-color: var(--warning);
    color: var(--white);
    font-size: var(--text-xs);
    padding: 2px 6px;
    border-radius: var(--radius-full);
    margin-left: var(--space-sm);
  }
  
  .tools-list li {
    padding: var(--space-xs) 0;
  }
  
  .steps-list {
    padding-left: var(--space-lg);
    margin-bottom: var(--space-lg);
  }
  
  .step-item {
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .step-content p {
    margin-bottom: var(--space-sm);
  }
  
  .step-tip {
    background-color: var(--light-gray);
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
  }
  
  .tip-icon {
    font-size: var(--text-lg);
  }
  
  .step-timer {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    background-color: var(--primary-light);
    color: var(--white);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-md);
    width: fit-content;
  }
  
  .timer-button {
    background-color: var(--white);
    color: var(--primary);
    border: none;
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: var(--text-xs);
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  
  .timer-button:hover {
    background-color: var(--primary-dark);
    color: var(--white);
  }
  
  .notes-section {
    max-width: 800px;
  }
  
  .recipe-notes {
    background-color: var(--light-gray);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-lg);
  }
  
  .empty-notes {
    color: var(--medium-gray);
    font-style: italic;
  }
  
  .recipe-source {
    color: var(--dark-gray);
  }
  
  /* Responsive styles */
  @media (max-width: 992px) {
    .recipe-hero {
      flex-direction: column;
      padding: var(--space-md);
      gap: var(--space-md);
    }
    
    .recipe-image {
      width: 100%;
      height: 250px;
    }
  }
  
  @media (max-width: 768px) {
    .recipe-meta {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .recipe-content {
      padding: var(--space-md);
    }
    
    .recipe-title {
      font-size: var(--text-2xl);
    }
  }
  
  @media (max-width: 576px) {
    .recipe-header {
      padding: var(--space-sm);
    }
    
    .recipe-actions {
      gap: var(--space-xs);
    }
    
    .action-button span {
      display: none;
    }
    
    .recipe-tabs {
      padding: 0;
    }
    
    .tab-button {
      flex: 1;
      padding: var(--space-xs) var(--space-sm);
      font-size: var(--text-sm);
    }
    
    .ingredient-amount {
      width: 80px;
      font-size: var(--text-sm);
    }
  }
</style>
