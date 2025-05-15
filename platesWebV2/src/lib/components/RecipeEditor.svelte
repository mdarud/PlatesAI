<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { createIcon } from '../utils/icons';
  import type { Recipe } from '../services/types';
  import RecipeParser from './RecipeParser.svelte';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let recipe: Recipe | null = null;
  export let userId: string = 'default-user';
  export let onCancel: () => void = () => {};
  
  // Create a new recipe if none is provided
  let editingRecipe: Recipe = recipe ? { ...recipe } : {
    id: 0,
    user_id: userId,
    title: '',
    description: '',
    servings: '',
    ingredients: [],
    steps: [],
    tools: [],
    methods: [],
    keywords: '',
    created_at: new Date().toISOString()
  };
  
  // State for form validation
  let errors: { [key: string]: string } = {};
  let activeTab = 'basic';
  let showParser = false;
  
  // Add a new ingredient
  function addIngredient() {
    editingRecipe.ingredients = [
      ...editingRecipe.ingredients,
      { name: '', amount: '', unit: '' }
    ];
  }
  
  // Remove an ingredient
  function removeIngredient(index: number) {
    editingRecipe.ingredients = editingRecipe.ingredients.filter((_, i) => i !== index);
  }
  
  // Add a new step
  function addStep() {
    const newOrder = editingRecipe.steps.length + 1;
    editingRecipe.steps = [
      ...editingRecipe.steps,
      { instruction: '', order: newOrder }
    ];
  }
  
  // Remove a step
  function removeStep(index: number) {
    editingRecipe.steps = editingRecipe.steps.filter((_, i) => i !== index);
    
    // Reorder remaining steps
    editingRecipe.steps = editingRecipe.steps.map((step, i) => ({
      ...step,
      order: i + 1
    }));
  }
  
  // Add a new tool
  function addTool() {
    editingRecipe.tools = [...editingRecipe.tools, ''];
  }
  
  // Remove a tool
  function removeTool(index: number) {
    editingRecipe.tools = editingRecipe.tools.filter((_, i) => i !== index);
  }
  
  // Add a new method
  function addMethod() {
    editingRecipe.methods = [...editingRecipe.methods, ''];
  }
  
  // Remove a method
  function removeMethod(index: number) {
    editingRecipe.methods = editingRecipe.methods.filter((_, i) => i !== index);
  }
  
  // Add duration to a step
  function addDuration(index: number) {
    const step = editingRecipe.steps[index];
    if (!step.duration) {
      editingRecipe.steps[index] = {
        ...step,
        duration: { minutes: 0, seconds: 0 }
      };
      editingRecipe.steps = [...editingRecipe.steps];
    }
  }
  
  // Remove duration from a step
  function removeDuration(index: number) {
    const step = editingRecipe.steps[index];
    if (step.duration) {
      const { duration, ...stepWithoutDuration } = step;
      editingRecipe.steps[index] = stepWithoutDuration;
      editingRecipe.steps = [...editingRecipe.steps];
    }
  }
  
  // Validate the recipe
  function validateRecipe(): boolean {
    errors = {};
    
    if (!editingRecipe.title.trim()) {
      errors.title = 'Title is required';
    }
    
    if (!editingRecipe.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!editingRecipe.servings.trim()) {
      errors.servings = 'Servings is required';
    }
    
    if (editingRecipe.ingredients.length === 0) {
      errors.ingredients = 'At least one ingredient is required';
    } else {
      editingRecipe.ingredients.forEach((ingredient, index) => {
        if (!ingredient.name.trim()) {
          errors[`ingredient_${index}`] = 'Ingredient name is required';
        }
        if (!ingredient.amount.trim()) {
          errors[`ingredient_amount_${index}`] = 'Amount is required';
        }
      });
    }
    
    if (editingRecipe.steps.length === 0) {
      errors.steps = 'At least one step is required';
    } else {
      editingRecipe.steps.forEach((step, index) => {
        if (!step.instruction.trim()) {
          errors[`step_${index}`] = 'Instruction is required';
        }
      });
    }
    
    return Object.keys(errors).length === 0;
  }
  
  // Save the recipe
  function saveRecipe() {
    if (validateRecipe()) {
      dispatch('save', editingRecipe);
    } else {
      // Switch to the tab with errors
      if (errors.title || errors.description || errors.servings) {
        activeTab = 'basic';
      } else if (errors.ingredients || Object.keys(errors).some(key => key.startsWith('ingredient'))) {
        activeTab = 'ingredients';
      } else if (errors.steps || Object.keys(errors).some(key => key.startsWith('step'))) {
        activeTab = 'steps';
      }
    }
  }
  
  // Show the recipe parser
  function parseRecipe() {
    showParser = true;
  }
  
  // Handle parsed recipe from parser
  function handleParsedRecipe(event: CustomEvent<Recipe>) {
    // Update the editing recipe with the parsed recipe
    const parsedRecipe = event.detail;
    
    // Preserve the user ID and created date
    parsedRecipe.user_id = userId;
    if (!parsedRecipe.created_at) {
      parsedRecipe.created_at = new Date().toISOString();
    }
    
    // Update the editing recipe
    editingRecipe = parsedRecipe;
    
    // Hide the parser
    showParser = false;
    
    // Switch to the basic tab to show the parsed recipe
    activeTab = 'basic';
  }
  
  // Handle edit request from parser
  function handleEditParsedRecipe(event: CustomEvent<Recipe>) {
    // Update the editing recipe with the parsed recipe
    handleParsedRecipe(event);
  }
  
  // Cancel parsing
  function cancelParsing() {
    showParser = false;
  }
</script>

{#if showParser}
  <RecipeParser 
    userId={userId} 
    onCancel={cancelParsing}
    on:save={handleParsedRecipe}
    on:edit={handleEditParsedRecipe}
  />
{:else}
  <div class="recipe-editor">
    <div class="editor-header">
      <h2>{recipe ? 'Edit Recipe' : 'Create New Recipe'}</h2>
      <div class="header-actions">
        <button class="cancel-button" on:click={onCancel}>Cancel</button>
        <button class="save-button" on:click={saveRecipe}>Save Recipe</button>
      </div>
    </div>
  
  <div class="editor-tabs">
    <button 
      class="tab-button {activeTab === 'basic' ? 'active' : ''}" 
      on:click={() => activeTab = 'basic'}
    >
      Basic Info
    </button>
    
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
      class="tab-button {activeTab === 'additional' ? 'active' : ''}" 
      on:click={() => activeTab = 'additional'}
    >
      Additional Info
    </button>
  </div>
  
  <div class="editor-content">
    {#if activeTab === 'basic'}
      <div class="basic-info-section">
        <div class="form-group">
          <label for="title">Recipe Title</label>
          <input 
            type="text" 
            id="title" 
            bind:value={editingRecipe.title} 
            placeholder="Enter recipe title"
            class={errors.title ? 'error' : ''}
          />
          {#if errors.title}
            <div class="error-message">{errors.title}</div>
          {/if}
        </div>
        
        <div class="form-group">
          <label for="description">Description</label>
          <textarea 
            id="description" 
            bind:value={editingRecipe.description} 
            placeholder="Describe your recipe"
            rows="3"
            class={errors.description ? 'error' : ''}
          ></textarea>
          {#if errors.description}
            <div class="error-message">{errors.description}</div>
          {/if}
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="servings">Servings</label>
            <input 
              type="text" 
              id="servings" 
              bind:value={editingRecipe.servings} 
              placeholder="e.g., 4 servings"
              class={errors.servings ? 'error' : ''}
            />
            {#if errors.servings}
              <div class="error-message">{errors.servings}</div>
            {/if}
          </div>
          
          <div class="form-group">
            <label for="prep-time">Prep Time</label>
            <input 
              type="text" 
              id="prep-time" 
              bind:value={editingRecipe.prep_time} 
              placeholder="e.g., 15 minutes"
            />
          </div>
          
          <div class="form-group">
            <label for="cook-time">Cook Time</label>
            <input 
              type="text" 
              id="cook-time" 
              bind:value={editingRecipe.cook_time} 
              placeholder="e.g., 30 minutes"
            />
          </div>
        </div>
      </div>
    {:else if activeTab === 'ingredients'}
      <div class="ingredients-section">
        <div class="section-header">
          <h3>Ingredients</h3>
          <button class="add-button" on:click={addIngredient}>
            {@html createIcon('add', 16)}
            <span>Add Ingredient</span>
          </button>
        </div>
        
        {#if errors.ingredients}
          <div class="error-message section-error">{errors.ingredients}</div>
        {/if}
        
        {#if editingRecipe.ingredients.length === 0}
          <div class="empty-state">
            <p>No ingredients added yet. Click "Add Ingredient" to start.</p>
          </div>
        {:else}
          <div class="ingredients-list">
            {#each editingRecipe.ingredients as ingredient, index}
              <div class="ingredient-item">
                <div class="ingredient-form">
                  <div class="form-row">
                    <div class="form-group">
                      <label for={`ingredient-amount-${index}`}>Amount</label>
                      <input 
                        type="text" 
                        id={`ingredient-amount-${index}`} 
                        bind:value={ingredient.amount} 
                        placeholder="e.g., 2, 1/2, etc."
                        class={errors[`ingredient_amount_${index}`] ? 'error' : ''}
                      />
                      {#if errors[`ingredient_amount_${index}`]}
                        <div class="error-message">{errors[`ingredient_amount_${index}`]}</div>
                      {/if}
                    </div>
                    
                    <div class="form-group">
                      <label for={`ingredient-unit-${index}`}>Unit</label>
                      <input 
                        type="text" 
                        id={`ingredient-unit-${index}`} 
                        bind:value={ingredient.unit} 
                        placeholder="e.g., cup, tbsp, etc."
                      />
                    </div>
                    
                    <div class="form-group ingredient-name-group">
                      <label for={`ingredient-name-${index}`}>Ingredient</label>
                      <input 
                        type="text" 
                        id={`ingredient-name-${index}`} 
                        bind:value={ingredient.name} 
                        placeholder="e.g., flour, sugar, etc."
                        class={errors[`ingredient_${index}`] ? 'error' : ''}
                      />
                      {#if errors[`ingredient_${index}`]}
                        <div class="error-message">{errors[`ingredient_${index}`]}</div>
                      {/if}
                    </div>
                  </div>
                </div>
                
                <button class="remove-button" on:click={() => removeIngredient(index)}>
                  {@html createIcon('delete', 16)}
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if activeTab === 'steps'}
      <div class="steps-section">
        <div class="section-header">
          <h3>Instructions</h3>
          <button class="add-button" on:click={addStep}>
            {@html createIcon('add', 16)}
            <span>Add Step</span>
          </button>
        </div>
        
        {#if errors.steps}
          <div class="error-message section-error">{errors.steps}</div>
        {/if}
        
        {#if editingRecipe.steps.length === 0}
          <div class="empty-state">
            <p>No steps added yet. Click "Add Step" to start.</p>
          </div>
        {:else}
          <div class="steps-list">
            {#each editingRecipe.steps as step, index}
              <div class="step-item">
                <div class="step-number">{step.order}</div>
                
                <div class="step-form">
                  <div class="form-group">
                    <label for={`step-instruction-${index}`}>Instruction</label>
                    <textarea 
                      id={`step-instruction-${index}`} 
                      bind:value={step.instruction} 
                      placeholder="Describe this step"
                      rows="2"
                      class={errors[`step_${index}`] ? 'error' : ''}
                    ></textarea>
                    {#if errors[`step_${index}`]}
                      <div class="error-message">{errors[`step_${index}`]}</div>
                    {/if}
                  </div>
                </div>
                
                <button class="remove-button" on:click={() => removeStep(index)}>
                  {@html createIcon('delete', 16)}
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if activeTab === 'additional'}
      <div class="additional-section">
        <div class="form-group">
          <label for="source">Source</label>
          <input 
            type="text" 
            id="source" 
            bind:value={editingRecipe.source} 
            placeholder="Where did this recipe come from?"
          />
        </div>
        
        <div class="form-group">
          <label for="notes">Recipe Notes</label>
          <textarea 
            id="notes" 
            bind:value={editingRecipe.notes} 
            placeholder="Add any additional notes about this recipe"
            rows="4"
          ></textarea>
        </div>
      </div>
    {/if}
  </div>
  
    <div class="editor-footer">
      <button class="parse-button" on:click={parseRecipe}>
        {@html createIcon('recipe', 16)}
        <span>Parse Recipe from Text</span>
      </button>
      
      <div class="footer-actions">
        <button class="cancel-button" on:click={onCancel}>Cancel</button>
        <button class="save-button" on:click={saveRecipe}>Save Recipe</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .recipe-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background-color: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }
  
  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .editor-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg);
  }
  
  .editor-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    border-top: 1px solid var(--light-gray);
  }
  
  .editor-tabs {
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
  
  .form-group {
    margin-bottom: var(--space-md);
  }
  
  .form-row {
    display: flex;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .error-message {
    color: var(--error);
    font-size: var(--text-xs);
    margin-top: var(--space-xs);
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-md);
  }
  
  .empty-state {
    padding: var(--space-lg);
    text-align: center;
    color: var(--medium-gray);
    background-color: var(--light-gray);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
  }
  
  .ingredient-item, .step-item {
    display: flex;
    margin-bottom: var(--space-md);
    padding: var(--space-md);
    background-color: var(--light-gray);
    border-radius: var(--radius-md);
    position: relative;
  }
  
  .ingredient-form, .step-form {
    flex: 1;
  }
  
  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background-color: var(--primary);
    color: var(--white);
    border-radius: var(--radius-full);
    font-weight: 600;
    margin-right: var(--space-md);
  }
  
  .add-button, .parse-button, .cancel-button, .save-button {
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--text-sm);
    transition: all var(--transition-fast);
  }
  
  .add-button, .parse-button {
    background-color: var(--primary-light);
    color: var(--white);
    border: none;
  }
  
  .cancel-button {
    background-color: var(--light-gray);
    color: var(--dark-gray);
    border: none;
  }
  
  .save-button {
    background-color: var(--success);
    color: var(--white);
    border: none;
  }
  
  .remove-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background-color: var(--light-gray);
    color: var(--error);
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    margin-left: var(--space-sm);
  }
</style>
