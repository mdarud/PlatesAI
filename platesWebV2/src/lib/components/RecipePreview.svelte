<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Recipe } from '../services/types';
  import { createIcon } from '../utils/icons';

  export let recipe: Recipe;
  
  const dispatch = createEventDispatcher();

  function addToNotes() {
    dispatch('addToNotes', recipe);
  }

  function addToRecipes() {
    dispatch('addToRecipes', recipe);
  }
</script>

<div class="recipe-preview">
  <div class="recipe-header">
    <h3>{recipe.title}</h3>
    <div class="recipe-servings">{recipe.servings}</div>
  </div>
  
  <p class="recipe-description">{recipe.description}</p>
  
  {#if recipe.prep_time || recipe.cook_time || recipe.total_time}
    <div class="recipe-times">
      {#if recipe.prep_time}<span><strong>Prep:</strong> {recipe.prep_time}</span>{/if}
      {#if recipe.cook_time}<span><strong>Cook:</strong> {recipe.cook_time}</span>{/if}
      {#if recipe.total_time}<span><strong>Total:</strong> {recipe.total_time}</span>{/if}
    </div>
  {/if}
  
  <div class="recipe-section">
    <div class="section-header">
      {@html createIcon('recipe', 16)}
      <h4>Ingredients</h4>
    </div>
    <ul class="recipe-ingredients">
      {#each recipe.ingredients as ingredient}
        <li>
          <strong>{ingredient.name}:</strong> 
          {ingredient.amount} 
          {ingredient.unit || ''} 
          {ingredient.preparation ? `, ${ingredient.preparation}` : ''}
        </li>
      {/each}
    </ul>
  </div>
  
  <div class="recipe-section">
    <div class="section-header">
      {@html createIcon('list', 16)}
      <h4>Steps</h4>
    </div>
    <ol class="recipe-steps">
      {#each recipe.steps as step}
        <li>
          {step.instruction}
          {#if step.duration}
            <span class="step-duration">
              ({step.duration.minutes} min
              {#if step.duration.seconds > 0} {step.duration.seconds} sec{/if})
            </span>
          {/if}
        </li>
      {/each}
    </ol>
  </div>
  
  {#if recipe.tools && recipe.tools.length > 0}
    <div class="recipe-section">
      <div class="section-header">
        {@html createIcon('settings', 16)}
        <h4>Tools</h4>
      </div>
      <ul class="recipe-tools">
        {#each recipe.tools as tool}
          <li>{tool}</li>
        {/each}
      </ul>
    </div>
  {/if}
  
  {#if recipe.methods && recipe.methods.length > 0}
    <div class="recipe-section">
      <div class="section-header">
        {@html createIcon('notes', 16)}
        <h4>Methods</h4>
      </div>
      <ul class="recipe-methods">
        {#each recipe.methods as method}
          <li>{method}</li>
        {/each}
      </ul>
    </div>
  {/if}
  
  {#if recipe.keywords}
    <div class="recipe-section">
      <div class="section-header">
        {@html createIcon('search', 16)}
        <h4>Keywords</h4>
      </div>
      <div class="recipe-keywords">
        <div class="keyword-tags">
          {#each recipe.keywords.split(',') as keyword}
            <span class="keyword-tag">{keyword.trim()}</span>
          {/each}
        </div>
      </div>
    </div>
  {/if}
  
  <div class="recipe-actions">
    <button class="recipe-action-btn save-note-btn" on:click={addToNotes}>
      {@html createIcon('notes', 16)}
      <span>Add to Sticky Notes</span>
    </button>
    
    <button class="recipe-action-btn save-recipe-btn" on:click={addToRecipes}>
      {@html createIcon('recipe', 16)}
      <span>Add to Recipes</span>
    </button>
  </div>
</div>

<style>
  .recipe-preview {
    background-color: var(--white);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    margin: var(--space-md) 0;
    box-shadow: var(--shadow-md);
    border-left: 4px solid var(--primary);
  }
  
  .recipe-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .recipe-header h3 {
    margin: 0;
    color: var(--dark);
    font-size: 1.4rem;
    font-weight: 700;
    font-family: var(--font-secondary);
  }
  
  .recipe-servings {
    background-color: var(--primary-light);
    color: var(--white);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-xl);
    font-size: 0.9rem;
    font-weight: 600;
  }
  
  .recipe-description {
    font-style: italic;
    color: var(--dark-gray);
    margin-bottom: var(--space-md);
    line-height: 1.6;
  }
  
  .recipe-times {
    display: flex;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
    padding: var(--space-sm);
    background-color: var(--light-gray);
    border-radius: var(--radius-md);
  }
  
  .recipe-times span {
    font-size: 0.9rem;
  }
  
  .recipe-section {
    margin-bottom: var(--space-lg);
  }
  
  .section-header {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-bottom: var(--space-sm);
  }
  
  .section-header :global(svg) {
    color: var(--primary);
  }
  
  .section-header h4 {
    margin: 0;
    color: var(--primary);
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .recipe-ingredients {
    padding-left: var(--space-lg);
    margin-bottom: var(--space-md);
  }
  
  .recipe-ingredients li {
    margin-bottom: var(--space-xs);
    line-height: 1.5;
  }
  
  .recipe-steps {
    padding-left: var(--space-lg);
    margin-bottom: var(--space-md);
  }
  
  .recipe-steps li {
    margin-bottom: var(--space-sm);
    line-height: 1.6;
    position: relative;
  }
  
  .step-duration {
    font-size: 0.85rem;
    color: var(--primary);
    font-weight: 500;
    margin-left: var(--space-xs);
  }
  
  .recipe-tools,
  .recipe-methods {
    padding-left: var(--space-lg);
    margin-bottom: var(--space-md);
  }
  
  .recipe-tools li,
  .recipe-methods li {
    margin-bottom: var(--space-xs);
    line-height: 1.5;
  }
  
  .recipe-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  
  .keyword-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  
  .keyword-tag {
    background-color: var(--accent-light);
    color: var(--accent-dark);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-xl);
    font-size: 0.8rem;
    font-weight: 500;
  }
  
  .recipe-actions {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }
  
  .recipe-action-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    border: none;
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .save-note-btn {
    background-color: var(--accent-light);
    color: var(--accent-dark);
  }
  
  .save-note-btn:hover {
    background-color: var(--accent);
    color: var(--white);
    transform: translateY(-2px);
  }
  
  .save-recipe-btn {
    background-color: var(--primary-light);
    color: var(--white);
  }
  
  .save-recipe-btn:hover {
    background-color: var(--primary);
    transform: translateY(-2px);
  }
  
  @media (max-width: 768px) {
    .recipe-preview {
      padding: var(--space-md);
    }
    
    .recipe-header h3 {
      font-size: 1.2rem;
    }
    
    .recipe-actions {
      flex-direction: column;
    }
    
    .recipe-action-btn {
      width: 100%;
    }
  }
</style>
