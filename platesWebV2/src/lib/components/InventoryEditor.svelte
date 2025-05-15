<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { createIcon } from '../utils/icons';
  import type { InventoryItem } from '../services/types';
  import { inventoryStore } from '../stores/inventoryStore';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let item: InventoryItem | null = null;
  export let userId: string = 'default-user';
  export let onCancel: () => void = () => {};
  
  // Create a new item if none is provided
  let editingItem: InventoryItem = item ? { ...item } : {
    id: undefined,
    user_id: userId,
    ingredient_name: '',
    amount: '',
    unit: '',
    category: '',
    location: '',
    expires_at: '',
    notes: ''
  };
  
  // State for form validation
  let errors: { [key: string]: string } = {};
  
  // Common categories for ingredients
  const commonCategories = [
    'Produce',
    'Meat',
    'Seafood',
    'Dairy',
    'Bakery',
    'Pantry',
    'Frozen',
    'Beverages',
    'Spices',
    'Condiments',
    'Snacks',
    'Other'
  ];
  
  // Common storage locations
  const commonLocations = [
    'Refrigerator',
    'Freezer',
    'Pantry',
    'Cupboard',
    'Spice Rack',
    'Counter',
    'Other'
  ];
  
  // Common units
  const commonUnits = [
    'g', 'kg', 'mg',
    'oz', 'lb',
    'ml', 'l', 'cl',
    'tsp', 'tbsp', 'cup',
    'pinch', 'dash',
    'piece', 'slice', 'whole',
    'can', 'bottle', 'box', 'package'
  ];
  
  // Format date for input field (YYYY-MM-DD)
  function formatDateForInput(dateString: string | undefined): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }
  
  // Bind the formatted date to the input field
  $: formattedExpiryDate = formatDateForInput(editingItem.expires_at);
  
  // Update the expiry date when the input changes
  function updateExpiryDate(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.value) {
      editingItem.expires_at = new Date(target.value).toISOString();
    } else {
      editingItem.expires_at = undefined;
    }
  }
  
  // Validate the item
  function validateItem(): boolean {
    errors = {};
    
    if (!editingItem.ingredient_name.trim()) {
      errors.ingredient_name = 'Ingredient name is required';
    }
    
    return Object.keys(errors).length === 0;
  }
  
  // Save the item
  function saveItem() {
    if (validateItem()) {
      // Save to inventory store
      inventoryStore.updateInventory([editingItem], userId);
      
      // Dispatch save event with the edited item
      dispatch('save', editingItem);
    }
  }
</script>

<div class="inventory-editor">
  <div class="editor-header">
    <h2>{item ? 'Edit Ingredient' : 'Add Ingredient'}</h2>
    <div class="header-actions">
      <button class="cancel-button" on:click={onCancel}>Cancel</button>
      <button class="save-button" on:click={saveItem}>Save</button>
    </div>
  </div>
  
  <div class="editor-content">
    <div class="form-group">
      <label for="ingredient-name">Ingredient Name</label>
      <input 
        type="text" 
        id="ingredient-name" 
        bind:value={editingItem.ingredient_name} 
        placeholder="e.g., Flour, Sugar, Chicken"
        class={errors.ingredient_name ? 'error' : ''}
      />
      {#if errors.ingredient_name}
        <div class="error-message">{errors.ingredient_name}</div>
      {/if}
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label for="amount">Amount</label>
        <input 
          type="text" 
          id="amount" 
          bind:value={editingItem.amount} 
          placeholder="e.g., 500, 2, 1/2"
        />
      </div>
      
      <div class="form-group">
        <label for="unit">Unit</label>
        <div class="select-with-options">
          <input 
            type="text" 
            id="unit" 
            bind:value={editingItem.unit} 
            placeholder="e.g., g, kg, cup"
            list="unit-options"
          />
          <datalist id="unit-options">
            {#each commonUnits as unit}
              <option value={unit} />
            {/each}
          </datalist>
        </div>
      </div>
    </div>
    
    <div class="form-row">
      <div class="form-group">
        <label for="category">Category</label>
        <div class="select-with-options">
          <input 
            type="text" 
            id="category" 
            bind:value={editingItem.category} 
            placeholder="e.g., Produce, Dairy, Meat"
            list="category-options"
          />
          <datalist id="category-options">
            {#each commonCategories as category}
              <option value={category} />
            {/each}
          </datalist>
        </div>
      </div>
      
      <div class="form-group">
        <label for="location">Storage Location</label>
        <div class="select-with-options">
          <input 
            type="text" 
            id="location" 
            bind:value={editingItem.location} 
            placeholder="e.g., Refrigerator, Pantry"
            list="location-options"
          />
          <datalist id="location-options">
            {#each commonLocations as location}
              <option value={location} />
            {/each}
          </datalist>
        </div>
      </div>
    </div>
    
    <div class="form-group">
      <label for="expiry-date">Expiry Date</label>
      <input 
        type="date" 
        id="expiry-date" 
        value={formattedExpiryDate}
        on:change={updateExpiryDate}
        placeholder="Select expiry date (optional)"
      />
    </div>
    
    <div class="form-group">
      <label for="notes">Notes</label>
      <textarea 
        id="notes" 
        bind:value={editingItem.notes} 
        placeholder="Add any additional notes about this ingredient"
        rows="3"
      ></textarea>
    </div>
  </div>
  
  <div class="editor-footer">
    <div class="footer-actions">
      <button class="cancel-button" on:click={onCancel}>Cancel</button>
      <button class="save-button" on:click={saveItem}>Save</button>
    </div>
  </div>
</div>

<style>
  .inventory-editor {
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
    background-color: var(--secondary-light);
    color: var(--white);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  
  .editor-header h2 {
    color: var(--white);
    margin: 0;
  }
  
  .editor-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg);
  }
  
  .editor-footer {
    display: flex;
    justify-content: flex-end;
    padding: var(--space-md);
    border-top: 1px solid var(--light-gray);
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
  
  input, textarea, select {
    width: 100%;
    padding: var(--space-sm);
    border: 2px solid var(--light-gray);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    transition: all var(--transition-fast);
  }
  
  input:focus, textarea:focus, select:focus {
    border-color: var(--secondary);
    box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.2);
    outline: none;
  }
  
  input.error, textarea.error, select.error {
    border-color: var(--error);
  }
  
  .error-message {
    color: var(--error);
    font-size: var(--text-xs);
    margin-top: var(--space-xs);
  }
  
  .select-with-options {
    position: relative;
  }
  
  .header-actions, .footer-actions {
    display: flex;
    gap: var(--space-sm);
  }
  
  .cancel-button, .save-button {
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  
  .cancel-button {
    background-color: transparent;
    color: var(--white);
    border: 1px solid var(--white);
  }
  
  .cancel-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
  
  .editor-footer .cancel-button {
    background-color: var(--light-gray);
    color: var(--dark-gray);
    border: none;
  }
  
  .editor-footer .cancel-button:hover {
    background-color: var(--medium-gray);
    color: var(--white);
  }
  
  .save-button {
    background-color: var(--secondary);
    color: var(--white);
    border: none;
  }
  
  .save-button:hover {
    background-color: var(--secondary-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  /* Food-inspired styling */
  .inventory-editor {
    background-image: linear-gradient(to bottom, rgba(255,255,255,0.97), rgba(255,255,255,0.97)), 
                      url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%232ecc71' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E");
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .form-row {
      flex-direction: column;
      gap: var(--space-sm);
    }
    
    .editor-content {
      padding: var(--space-md);
    }
  }
</style>
