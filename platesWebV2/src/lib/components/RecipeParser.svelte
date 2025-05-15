<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { aiService } from '../services/aiService';
  import { aiModelStore } from '../stores/aiModelStore';
  import { createIcon } from '../utils/icons';
  import type { Recipe, RecipeParserResult, AIModelConfig } from '../services/types';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let userId: string = 'default-user';
  export let onCancel: () => void = () => {};
  
  // State
  let recipeText: string = '';
  let isLoading: boolean = false;
  let error: string | null = null;
  let parsingResult: RecipeParserResult | null = null;
  let parsedRecipe: Recipe | null = null;
  let confidenceLevel: 'low' | 'medium' | 'high' = 'medium';
  
  // Get the current AI model config
  let aiModelConfig: AIModelConfig;
  const unsubscribe = aiModelStore.subscribe(config => {
    aiModelConfig = config;
  });
  
  // Unsubscribe when component is destroyed
  import { onDestroy } from 'svelte';
  onDestroy(unsubscribe);
  
  // Parse the recipe text
  async function parseRecipe() {
    if (!recipeText.trim()) {
      error = 'Please enter some recipe text to parse';
      return;
    }
    
    isLoading = true;
    error = null;
    
    try {
      // Use the AI service to parse the recipe
      parsingResult = await aiService.parseRecipeText(recipeText, userId, aiModelConfig);
      
      if (parsingResult.success && parsingResult.recipe) {
        parsedRecipe = parsingResult.recipe;
        
        // Set confidence level based on the confidence score
        if (parsingResult.confidence < 0.6) {
          confidenceLevel = 'low';
        } else if (parsingResult.confidence < 0.8) {
          confidenceLevel = 'medium';
        } else {
          confidenceLevel = 'high';
        }
      } else {
        error = parsingResult.error || 'Failed to parse recipe. Please check the text and try again.';
        parsedRecipe = null;
      }
    } catch (err) {
      console.error('Error parsing recipe:', err);
      error = 'An unexpected error occurred while parsing the recipe.';
      parsedRecipe = null;
    } finally {
      isLoading = false;
    }
  }
  
  // Save the parsed recipe
  function saveRecipe() {
    if (parsedRecipe) {
      dispatch('save', parsedRecipe);
    }
  }
  
  // Edit the parsed recipe
  function editRecipe() {
    if (parsedRecipe) {
      dispatch('edit', parsedRecipe);
    }
  }
  
  // Get confidence level color
  function getConfidenceColor(level: 'low' | 'medium' | 'high'): string {
    switch (level) {
      case 'low':
        return 'var(--error)';
      case 'medium':
        return 'var(--warning)';
      case 'high':
        return 'var(--success)';
      default:
        return 'var(--medium-gray)';
    }
  }
  
  // Format confidence percentage
  function formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }
  
  // Clear the form
  function clearForm() {
    recipeText = '';
    error = null;
    parsingResult = null;
    parsedRecipe = null;
  }
  
  // Example recipe text for demonstration
  function loadExampleRecipe() {
    recipeText = `Classic Chocolate Chip Cookies

A delicious recipe for soft and chewy chocolate chip cookies that are perfect for any occasion.

Prep time: 15 minutes
Cook time: 10-12 minutes
Total time: 25 minutes
Servings: 24 cookies

Ingredients:
- 2 1/4 cups all-purpose flour
- 1 teaspoon baking soda
- 1 teaspoon salt
- 1 cup (2 sticks) unsalted butter, softened
- 3/4 cup granulated sugar
- 3/4 cup packed brown sugar
- 2 large eggs
- 2 teaspoons vanilla extract
- 2 cups semi-sweet chocolate chips
- 1 cup chopped nuts (optional)

Instructions:
1. Preheat oven to 375°F (190°C).
2. In a small bowl, combine flour, baking soda, and salt.
3. In a large bowl, cream together the butter, granulated sugar, and brown sugar until light and fluffy, about 2-3 minutes.
4. Beat in the eggs one at a time, then stir in the vanilla.
5. Gradually blend in the dry ingredients.
6. Fold in the chocolate chips and nuts if using.
7. Drop by rounded tablespoons onto ungreased baking sheets.
8. Bake for 10-12 minutes or until golden brown.
9. Allow cookies to cool on baking sheet for 2 minutes before removing to wire racks to cool completely.

Store in an airtight container for up to 1 week.`;
  }
</script>

<div class="recipe-parser">
  <div class="parser-header">
    <h2>Recipe Parser</h2>
    <div class="header-actions">
      <button class="cancel-button" on:click={onCancel}>Cancel</button>
    </div>
  </div>
  
  <div class="parser-content">
    {#if !parsedRecipe}
      <div class="input-section">
        <div class="form-group">
          <label for="recipe-text">Paste Recipe Text</label>
          <textarea 
            id="recipe-text" 
            bind:value={recipeText} 
            placeholder="Paste your recipe text here..."
            rows="15"
            class={error ? 'error' : ''}
          ></textarea>
          {#if error}
            <div class="error-message">{error}</div>
          {/if}
        </div>
        
        <div class="form-actions">
          <button class="secondary-button" on:click={loadExampleRecipe}>
            {@html createIcon('recipe', 16)}
            <span>Load Example</span>
          </button>
          <button class="primary-button" on:click={parseRecipe} disabled={isLoading || !recipeText.trim()}>
            {#if isLoading}
              <span class="loading-spinner"></span>
              <span>Parsing...</span>
            {:else}
              {@html createIcon('recipe', 16)}
              <span>Parse Recipe</span>
            {/if}
          </button>
        </div>
      </div>
    {:else}
      <div class="result-section">
        <div class="confidence-indicator">
          <div class="confidence-label">
            Parsing Confidence: 
            <span style="color: {getConfidenceColor(confidenceLevel)}">
              {confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)}
              ({formatConfidence(parsingResult?.confidence || 0)})
            </span>
          </div>
          <div class="confidence-bar">
            <div 
              class="confidence-fill" 
              style="width: {formatConfidence(parsingResult?.confidence || 0)}; background-color: {getConfidenceColor(confidenceLevel)}"
            ></div>
          </div>
        </div>
        
        <div class="recipe-preview">
          <h3>{parsedRecipe.title}</h3>
          
          <div class="recipe-description">
            <p>{parsedRecipe.description}</p>
          </div>
          
          <div class="recipe-meta">
            <div class="meta-item">
              <span class="meta-label">Servings:</span>
              <span class="meta-value">{parsedRecipe.servings}</span>
            </div>
            
            {#if parsedRecipe.prep_time}
              <div class="meta-item">
                <span class="meta-label">Prep Time:</span>
                <span class="meta-value">{parsedRecipe.prep_time}</span>
              </div>
            {/if}
            
            {#if parsedRecipe.cook_time}
              <div class="meta-item">
                <span class="meta-label">Cook Time:</span>
                <span class="meta-value">{parsedRecipe.cook_time}</span>
              </div>
            {/if}
            
            {#if parsedRecipe.total_time}
              <div class="meta-item">
                <span class="meta-label">Total Time:</span>
                <span class="meta-value">{parsedRecipe.total_time}</span>
              </div>
            {/if}
            
            <div class="meta-item">
              <span class="meta-label">Difficulty:</span>
              <span class="meta-value">{parsedRecipe.difficulty}</span>
            </div>
          </div>
          
          <div class="recipe-sections">
            <div class="ingredients-section">
              <h4>Ingredients</h4>
              <ul>
                {#each parsedRecipe.ingredients as ingredient}
                  <li>
                    <span class="ingredient-amount">{ingredient.amount}</span>
                    {#if ingredient.unit}
                      <span class="ingredient-unit">{ingredient.unit}</span>
                    {/if}
                    <span class="ingredient-name">{ingredient.name}</span>
                    {#if ingredient.preparation}
                      <span class="ingredient-prep">, {ingredient.preparation}</span>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
            
            <div class="steps-section">
              <h4>Instructions</h4>
              <ol>
                {#each parsedRecipe.steps as step}
                  <li>
                    <div class="step-instruction">{step.instruction}</div>
                    {#if step.duration}
                      <div class="step-duration">
                        <span class="duration-icon">{@html createIcon('clock', 14)}</span>
                        <span class="duration-text">
                          {step.duration.minutes} min
                          {#if step.duration.seconds > 0}
                            {step.duration.seconds} sec
                          {/if}
                        </span>
                      </div>
                    {/if}
                  </li>
                {/each}
              </ol>
            </div>
          </div>
          
          {#if parsedRecipe.tools && parsedRecipe.tools.length > 0}
            <div class="tools-section">
              <h4>Tools</h4>
              <div class="tag-list">
                {#each parsedRecipe.tools as tool}
                  <span class="tag">{tool}</span>
                {/each}
              </div>
            </div>
          {/if}
          
          {#if parsedRecipe.methods && parsedRecipe.methods.length > 0}
            <div class="methods-section">
              <h4>Methods</h4>
              <div class="tag-list">
                {#each parsedRecipe.methods as method}
                  <span class="tag">{method}</span>
                {/each}
              </div>
            </div>
          {/if}
          
          {#if parsedRecipe.keywords}
            <div class="keywords-section">
              <h4>Keywords</h4>
              <div class="tag-list">
                {#each parsedRecipe.keywords.split(',') as keyword}
                  <span class="tag">{keyword.trim()}</span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
        
        <div class="result-actions">
          <button class="secondary-button" on:click={() => { parsedRecipe = null; }}>
            {@html createIcon('menu', 16)}
            <span>Back to Editor</span>
          </button>
          <button class="primary-button" on:click={editRecipe}>
            {@html createIcon('recipe', 16)}
            <span>Edit Recipe</span>
          </button>
          <button class="success-button" on:click={saveRecipe}>
            {@html createIcon('submit', 16)}
            <span>Save Recipe</span>
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .recipe-parser {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }
  
  .parser-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .parser-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg);
  }
  
  .input-section, .result-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  
  .form-group {
    margin-bottom: var(--space-md);
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }
  
  textarea {
    width: 100%;
    padding: var(--space-md);
    border: 1px solid var(--light-gray);
    border-radius: var(--radius-md);
    font-family: inherit;
    font-size: var(--text-md);
    resize: vertical;
  }
  
  textarea.error {
    border-color: var(--error);
  }
  
  .error-message {
    color: var(--error);
    font-size: var(--text-sm);
    margin-top: var(--space-xs);
  }
  
  .primary-button, .secondary-button, .success-button, .cancel-button {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .primary-button {
    background-color: var(--primary);
    color: var(--white);
    border: none;
  }
  
  .primary-button:hover {
    background-color: var(--primary-dark);
  }
  
  .primary-button:disabled {
    background-color: var(--medium-gray);
    cursor: not-allowed;
  }
  
  .secondary-button {
    background-color: var(--light-gray);
    color: var(--dark-gray);
    border: none;
  }
  
  .secondary-button:hover {
    background-color: var(--medium-gray);
    color: var(--white);
  }
  
  .success-button {
    background-color: var(--success);
    color: var(--white);
    border: none;
  }
  
  .success-button:hover {
    background-color: var(--success-dark);
  }
  
  .cancel-button {
    background-color: transparent;
    color: var(--dark-gray);
    border: 1px solid var(--light-gray);
  }
  
  .cancel-button:hover {
    background-color: var(--light-gray);
  }
  
  .loading-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: var(--white);
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .confidence-indicator {
    margin-bottom: var(--space-md);
    padding: var(--space-md);
    background-color: var(--light-gray);
    border-radius: var(--radius-md);
  }
  
  .confidence-label {
    font-weight: 500;
    margin-bottom: var(--space-xs);
  }
  
  .confidence-bar {
    height: 8px;
    background-color: var(--medium-gray);
    border-radius: var(--radius-full);
    overflow: hidden;
  }
  
  .confidence-fill {
    height: 100%;
    border-radius: var(--radius-full);
  }
  
  .recipe-preview {
    padding: var(--space-md);
    background-color: var(--white);
    border: 1px solid var(--light-gray);
    border-radius: var(--radius-md);
  }
  
  .recipe-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    margin: var(--space-md) 0;
    padding: var(--space-md);
    background-color: var(--light-gray);
    border-radius: var(--radius-md);
  }
  
  .meta-item {
    display: flex;
    flex-direction: column;
  }
  
  .meta-label {
    font-size: var(--text-xs);
    color: var(--dark-gray);
  }
  
  .meta-value {
    font-weight: 500;
  }
  
  .recipe-sections {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
    margin: var(--space-md) 0;
  }
  
  @media (max-width: 768px) {
    .recipe-sections {
      grid-template-columns: 1fr;
    }
  }
  
  .ingredients-section, .steps-section {
    padding: var(--space-md);
    background-color: var(--light-gray);
    border-radius: var(--radius-md);
  }
  
  .ingredients-section h4, .steps-section h4 {
    margin-top: 0;
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-xs);
    border-bottom: 1px solid var(--medium-gray);
  }
  
  .ingredients-section ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }
  
  .ingredients-section li {
    margin-bottom: var(--space-sm);
  }
  
  .ingredient-amount {
    font-weight: 500;
    margin-right: var(--space-xs);
  }
  
  .ingredient-unit {
    margin-right: var(--space-xs);
  }
  
  .steps-section ol {
    padding-left: var(--space-lg);
    margin: 0;
  }
  
  .steps-section li {
    margin-bottom: var(--space-md);
  }
  
  .step-duration {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-top: var(--space-xs);
    font-size: var(--text-sm);
    color: var(--primary);
  }
  
  .tools-section, .methods-section, .keywords-section {
    margin-top: var(--space-md);
  }
  
  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  
  .tag {
    display: inline-block;
    padding: var(--space-xs) var(--space-sm);
    background-color: var(--light-gray);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
  }
  
  .result-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }
</style>
