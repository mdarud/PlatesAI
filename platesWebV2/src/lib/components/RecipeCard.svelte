<script lang="ts">
  import { createIcon } from '../utils/icons';
  import type { Recipe } from '../services/types';
  
  // Props
  export let recipe: Recipe;
  export let onClick: () => void = () => {};
  
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
</script>

<div class="recipe-card" on:click={onClick}>
  <div class="recipe-image" style="background-color: var(--primary-light)">
    {#if recipe.image_url}
      <img src={recipe.image_url} alt={recipe.title} />
    {:else}
      <div class="recipe-icon">
        {@html createIcon('recipe', 40)}
      </div>
    {/if}
    
    {#if recipe.rating}
      <div class="recipe-rating">
        <span class="rating-value">{recipe.rating}</span>
        <span class="rating-icon">★</span>
      </div>
    {/if}
  </div>
  
  <div class="recipe-content">
    <h3 class="recipe-title">{recipe.title}</h3>
    
    <p class="recipe-description">
      {recipe.description.length > 80 
        ? recipe.description.substring(0, 80) + '...' 
        : recipe.description}
    </p>
    
    <div class="recipe-meta">
      <div class="meta-item">
        <span class="meta-icon">
          {@html createIcon('clock', 16)}
        </span>
        <span class="meta-text">{formatTime(recipe.total_time || recipe.cook_time)}</span>
      </div>
      
      <div class="meta-item">
        <span class="meta-icon">
          {@html createIcon('users', 16)}
        </span>
        <span class="meta-text">{recipe.servings}</span>
      </div>
      
      <div class="meta-item">
        <span class="meta-icon" style="color: {difficultyColor}">
          {@html createIcon('difficulty', 16)}
        </span>
        <span class="meta-text" style="color: {difficultyColor}">
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </span>
      </div>
    </div>
    
    {#if recipe.cuisine_type || recipe.meal_type}
      <div class="recipe-tags">
        {#if recipe.cuisine_type}
          <span class="tag cuisine-tag">{recipe.cuisine_type}</span>
        {/if}
        
        {#if recipe.meal_type}
          <span class="tag meal-tag">{recipe.meal_type}</span>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .recipe-card {
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    transition: all var(--transition-normal);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .recipe-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }
  
  .recipe-image {
    height: 160px;
    position: relative;
    overflow: hidden;
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
  
  .recipe-rating {
    position: absolute;
    top: var(--space-sm);
    right: var(--space-sm);
    background-color: rgba(0, 0, 0, 0.6);
    color: var(--white);
    border-radius: var(--radius-full);
    padding: 2px 8px;
    font-size: var(--text-sm);
    display: flex;
    align-items: center;
    gap: 2px;
  }
  
  .rating-icon {
    color: var(--accent);
  }
  
  .recipe-content {
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    flex: 1;
  }
  
  .recipe-title {
    margin-top: 0;
    margin-bottom: var(--space-xs);
    font-size: var(--text-lg);
    color: var(--dark);
    line-height: 1.3;
  }
  
  .recipe-description {
    color: var(--dark-gray);
    font-size: var(--text-sm);
    margin-bottom: var(--space-sm);
    line-height: 1.5;
    flex-grow: 1;
  }
  
  .recipe-meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-sm);
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: var(--text-xs);
    color: var(--dark-gray);
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
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .recipe-image {
      height: 140px;
    }
    
    .recipe-content {
      padding: var(--space-sm);
    }
    
    .recipe-title {
      font-size: var(--text-base);
    }
  }
</style>
