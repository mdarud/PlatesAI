<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Recipe } from '../services/types';
  import { createIcon } from '../utils/icons';
  
  export let recipe: Recipe | null = null;
  export let userId: string = 'default-user';
  export let isEditing: boolean = false;
  export let onCancel: () => void = () => {};
  
  const dispatch = createEventDispatcher();
  
  // Create a default empty recipe if none is provided
  const defaultRecipe: Recipe = {
    id: 0,
    user_id: userId,
    title: '',
    description: '',
    servings: '',
    prep_time: '',
    cook_time: '',
    difficulty: 'medium',
    ingredients: [],
    steps: [],
    tools: [],
    methods: [],
    keywords: '',
    created_at: new Date().toISOString()
  };
  
  // Create a copy for editing
  let editedRecipe: Recipe = recipe ? JSON.parse(JSON.stringify(recipe)) : { ...defaultRecipe };
  
  // Function to add a new ingredient
  function addIngredient() {
    editedRecipe.ingredients = [
      ...editedRecipe.ingredients,
      { name: '', amount: '', unit: '' }
    ];
  }
  
  // Function to remove an ingredient
  function removeIngredient(index: number) {
    editedRecipe.ingredients = editedRecipe.ingredients.filter((_, i) => i !== index);
  }
  
  // Function to add a new step
  function addStep() {
    const newOrder = editedRecipe.steps.length + 1;
    editedRecipe.steps = [
      ...editedRecipe.steps,
      { order: newOrder, instruction: '' }
    ];
  }
  
  // Function to remove a step
  function removeStep(index: number) {
    editedRecipe.steps = editedRecipe.steps.filter((_, i) => i !== index);
    // Update order of remaining steps
    editedRecipe.steps = editedRecipe.steps.map((step, i) => ({
      ...step,
      order: i + 1
    }));
  }
  
  // Function to add a new tool
  function addTool() {
    if (!editedRecipe.tools) {
      editedRecipe.tools = [];
    }
    editedRecipe.tools = [...editedRecipe.tools, ''];
  }
  
  // Function to remove a tool
  function removeTool(index: number) {
    editedRecipe.tools = editedRecipe.tools.filter((_, i) => i !== index);
  }
  
  // Function to add a new method
  function addMethod() {
    if (!editedRecipe.methods) {
      editedRecipe.methods = [];
    }
    editedRecipe.methods = [...editedRecipe.methods, ''];
  }
  
  // Function to remove a method
  function removeMethod(index: number) {
    editedRecipe.methods = editedRecipe.methods.filter((_, i) => i !== index);
  }
  
  function saveChanges() {
    dispatch('save', editedRecipe);
    isEditing = false;
  }
  
  function cancelEdit() {
    editedRecipe = JSON.parse(JSON.stringify(recipe));
    isEditing = false;
    dispatch('cancel');
  }
</script>

{#if isEditing}
  <div class="recipe-editor">
    <h3>Edit Recipe</h3>
    
    <div class="form-group">
      <label for="title">Title</label>
      <input type="text" id="title" bind:value={editedRecipe.title} />
    </div>
    
    <div class="form-group">
      <label for="description">Description</label>
      <textarea id="description" bind:value={editedRecipe.description}></textarea>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label for="servings">Servings</label>
        <input type="text" id="servings" bind:value={editedRecipe.servings} />
      </div>
      
      <div class="form-group">
        <label for="prep_time">Prep Time</label>
        <input type="text" id="prep_time" bind:value={editedRecipe.prep_time} />
      </div>
      
      <div class="form-group">
        <label for="cook_time">Cook Time</label>
        <input type="text" id="cook_time" bind:value={editedRecipe.cook_time} />
      </div>
    </div>
    
    <div class="form-group">
      <label for="difficulty">Difficulty</label>
      <select id="difficulty" bind:value={editedRecipe.difficulty}>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </div>
    
    <div class="section-header">
      <h4>Ingredients</h4>
      <button class="add-btn" on:click={addIngredient}>
        {@html createIcon('add', 16)}
        Add Ingredient
      </button>
    </div>
    
    {#each editedRecipe.ingredients as ingredient, index}
      <div class="ingredient-row">
        <div class="form-group">
          <label for={`ingredient-name-${index}`}>Name</label>
          <input type="text" id={`ingredient-name-${index}`} bind:value={ingredient.name} />
        </div>
        
        <div class="form-group">
          <label for={`ingredient-amount-${index}`}>Amount</label>
          <input type="text" id={`ingredient-amount-${index}`} bind:value={ingredient.amount} />
        </div>
        
        <div class="form-group">
          <label for={`ingredient-unit-${index}`}>Unit</label>
          <input type="text" id={`ingredient-unit-${index}`} bind:value={ingredient.unit} />
        </div>
        
        <div class="form-group">
          <label for={`ingredient-prep-${index}`}>Preparation</label>
          <input type="text" id={`ingredient-prep-${index}`} bind:value={ingredient.preparation} />
        </div>
        
        <button class="remove-btn" on:click={() => removeIngredient(index)}>
          {@html createIcon('delete', 16)}
        </button>
      </div>
    {/each}
    
    <div class="section-header">
      <h4>Steps</h4>
      <button class="add-btn" on:click={addStep}>
        {@html createIcon('add', 16)}
        Add Step
      </button>
    </div>
    
    {#each editedRecipe.steps as step, index}
      <div class="step-row">
        <div class="step-number">{index + 1}</div>
        
        <div class="form-group step-instruction">
          <label for={`step-instruction-${index}`}>Instruction</label>
          <textarea id={`step-instruction-${index}`} bind:value={step.instruction}></textarea>
        </div>
        
        <button class="remove-btn" on:click={() => removeStep(index)}>
          {@html createIcon('delete', 16)}
        </button>
      </div>
    {/each}
    
    <div class="section-header">
      <h4>Tools</h4>
      <button class="add-btn" on:click={addTool}>
        {@html createIcon('add', 16)}
        Add Tool
      </button>
    </div>
    
    {#if editedRecipe.tools}
      {#each editedRecipe.tools as tool, index}
        <div class="tool-row">
          <div class="form-group">
            <input type="text" bind:value={editedRecipe.tools[index]} />
          </div>
          
          <button class="remove-btn" on:click={() => removeTool(index)}>
            {@html createIcon('delete', 16)}
          </button>
        </div>
      {/each}
    {/if}
    
    <div class="section-header">
      <h4>Methods</h4>
      <button class="add-btn" on:click={addMethod}>
        {@html createIcon('add', 16)}
        Add Method
      </button>
    </div>
    
    {#if editedRecipe.methods}
      {#each editedRecipe.methods as method, index}
        <div class="method-row">
          <div class="form-group">
            <input type="text" bind:value={editedRecipe.methods[index]} />
          </div>
          
          <button class="remove-btn" on:click={() => removeMethod(index)}>
            {@html createIcon('delete', 16)}
          </button>
        </div>
      {/each}
    {/if}
    
    <div class="form-group">
      <label for="keywords">Keywords (comma separated)</label>
      <input type="text" id="keywords" bind:value={editedRecipe.keywords} />
    </div>
    
    <div class="editor-actions">
      <button class="cancel-btn" on:click={cancelEdit}>Cancel</button>
      <button class="save-btn" on:click={saveChanges}>Save Recipe</button>
    </div>
  </div>
{:else if recipe}
  <div class="recipe-card">
    <div class="recipe-header">
      <h3>{recipe.title}</h3>
      <div class="recipe-actions">
        <button class="edit-btn" on:click={() => isEditing = true}>
          {@html createIcon('edit', 16)}
          Edit
        </button>
        <button class="delete-btn" on:click={() => dispatch('delete', recipe)}>
          {@html createIcon('delete', 16)}
          Delete
        </button>
      </div>
    </div>
    
    <p class="recipe-description">{recipe.description}</p>
    
    <div class="recipe-meta">
      {#if recipe.servings}
        <span class="meta-item">
          {@html createIcon('inventory', 16)}
          {recipe.servings}
        </span>
      {/if}
      
      {#if recipe.prep_time}
        <span class="meta-item">
          {@html createIcon('clock', 16)}
          Prep: {recipe.prep_time}
        </span>
      {/if}
      
      {#if recipe.cook_time}
        <span class="meta-item">
          {@html createIcon('clock', 16)}
          Cook: {recipe.cook_time}
        </span>
      {/if}
      
      {#if recipe.difficulty}
        <span class="meta-item difficulty {recipe.difficulty}">
          {@html createIcon('difficulty', 16)}
          {recipe.difficulty}
        </span>
      {/if}
    </div>
    
    <div class="recipe-section">
      <h4>Ingredients</h4>
      <ul>
        {#each recipe.ingredients as ingredient}
          <li>
            <strong>{ingredient.name}:</strong> {ingredient.amount} {ingredient.unit || ''}
            {#if ingredient.preparation}
              <span class="preparation">({ingredient.preparation})</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
    
    <div class="recipe-section">
      <h4>Steps</h4>
      <ol>
        {#each recipe.steps as step}
          <li>{typeof step === 'string' ? step : step.instruction}</li>
        {/each}
      </ol>
    </div>
    
    {#if recipe.tools && recipe.tools.length > 0}
      <div class="recipe-section">
        <h4>Tools</h4>
        <ul>
          {#each recipe.tools as tool}
            <li>{tool}</li>
          {/each}
        </ul>
      </div>
    {/if}
    
    {#if recipe.methods && recipe.methods.length > 0}
      <div class="recipe-section">
        <h4>Methods</h4>
        <ul>
          {#each recipe.methods as method}
            <li>{method}</li>
          {/each}
        </ul>
      </div>
    {/if}
    
    {#if recipe.keywords}
      <div class="recipe-section">
        <h4>Keywords</h4>
        <div class="keyword-tags">
          {#each recipe.keywords.split(',') as keyword}
            <span class="keyword-tag">{keyword.trim()}</span>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{:else}
  <div class="recipe-card">
    <div class="recipe-header">
      <h3>New Recipe</h3>
      <div class="recipe-actions">
        <button class="edit-btn" on:click={() => isEditing = true}>
          {@html createIcon('edit', 16)}
          Create
        </button>
      </div>
    </div>
    <p class="recipe-description">Click 'Create' to add a new recipe.</p>
  </div>
{/if}

<style>
  .recipe-editor {
    background-color: var(--white);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    box-shadow: var(--shadow-md);
    margin-bottom: var(--space-md);
  }
  
  h3 {
    margin-top: 0;
    margin-bottom: var(--space-md);
    color: var(--primary);
    font-size: 1.5rem;
  }
  
  .form-group {
    margin-bottom: var(--space-md);
  }
  
  .form-row {
    display: flex;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
  }
  
  .form-row .form-group {
    flex: 1;
    margin-bottom: 0;
  }
  
  label {
    display: block;
    margin-bottom: var(--space-xs);
    font-weight: 500;
    color: var(--dark);
  }
  
  input, select, textarea {
    width: 100%;
    padding: var(--space-sm);
    border: 1px solid var(--light-gray);
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
  }
  
  textarea {
    min-height: 80px;
    resize: vertical;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-sm);
    padding-bottom: var(--space-xs);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .section-header h4 {
    margin: 0;
    color: var(--primary);
    font-size: 1.2rem;
  }
  
  .add-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background-color: var(--accent-light);
    color: var(--accent-dark);
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .add-btn:hover {
    background-color: var(--accent);
    color: var(--white);
  }
  
  .ingredient-row, .step-row, .tool-row, .method-row {
    display: flex;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
    align-items: flex-end;
  }
  
  .ingredient-row .form-group {
    flex: 1;
    margin-bottom: 0;
  }
  
  .step-row {
    align-items: flex-start;
  }
  
  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    background-color: var(--primary);
    color: var(--white);
    border-radius: var(--radius-full);
    font-weight: 600;
    margin-top: 24px;
  }
  
  .step-instruction {
    flex: 1;
  }
  
  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background-color: var(--error-light);
    color: var(--error-dark);
    border: none;
    border-radius: var(--radius-full);
    cursor: pointer;
    transition: all var(--transition-fast);
    margin-bottom: var(--space-md);
  }
  
  .remove-btn:hover {
    background-color: var(--error);
    color: var(--white);
  }
  
  .editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-lg);
  }
  
  .cancel-btn, .save-btn {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .cancel-btn {
    background-color: var(--light-gray);
    color: var(--dark);
    border: none;
  }
  
  .save-btn {
    background-color: var(--primary);
    color: var(--white);
    border: none;
  }
  
  .cancel-btn:hover {
    background-color: var(--medium-gray);
  }
  
  .save-btn:hover {
    background-color: var(--primary-dark);
  }
  
  /* Recipe Card Styles */
  .recipe-card {
    background-color: var(--white);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    box-shadow: var(--shadow-md);
    margin-bottom: var(--space-md);
  }
  
  .recipe-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--space-md);
  }
  
  .recipe-header h3 {
    margin: 0;
    color: var(--dark);
    font-size: 1.4rem;
  }
  
  .recipe-actions {
    display: flex;
    gap: var(--space-xs);
  }
  
  .edit-btn, .delete-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    border: none;
  }
  
  .edit-btn {
    background-color: var(--accent-light);
    color: var(--accent-dark);
  }
  
  .delete-btn {
    background-color: var(--error-light);
    color: var(--error-dark);
  }
  
  .edit-btn:hover {
    background-color: var(--accent);
    color: var(--white);
  }
  
  .delete-btn:hover {
    background-color: var(--error);
    color: var(--white);
  }
  
  .recipe-description {
    font-style: italic;
    color: var(--dark-gray);
    margin-bottom: var(--space-md);
  }
  
  .recipe-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background-color: var(--light-gray);
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
    color: var(--dark);
  }
  
  .difficulty.easy {
    background-color: var(--success-light);
    color: var(--success-dark);
  }
  
  .difficulty.medium {
    background-color: var(--warning-light);
    color: var(--warning-dark);
  }
  
  .difficulty.hard {
    background-color: var(--error-light);
    color: var(--error-dark);
  }
  
  .recipe-section {
    margin-bottom: var(--space-md);
  }
  
  .recipe-section h4 {
    margin-top: 0;
    margin-bottom: var(--space-sm);
    color: var(--primary);
    font-size: 1.1rem;
    border-bottom: 1px solid var(--light-gray);
    padding-bottom: var(--space-xs);
  }
  
  .recipe-section ul, .recipe-section ol {
    padding-left: var(--space-lg);
    margin: 0;
  }
  
  .recipe-section li {
    margin-bottom: var(--space-xs);
  }
  
  .preparation {
    font-style: italic;
    color: var(--dark-gray);
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
    border-radius: var(--radius-full);
    font-size: var(--text-sm);
  }
  
  /* Responsive Styles */
  @media (max-width: 768px) {
    .form-row {
      flex-direction: column;
      gap: var(--space-sm);
    }
    
    .ingredient-row, .step-row {
      flex-direction: column;
      gap: var(--space-xs);
    }
    
    .step-number {
      margin-top: 0;
      margin-bottom: var(--space-xs);
    }
    
    .remove-btn {
      align-self: flex-end;
    }
  }
</style>
