<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { InventoryItem } from '../services/types';
  import { createIcon } from '../utils/icons';
  
  export let item: InventoryItem | null = null;
  export let userId: string = 'default-user';
  export let isEditing: boolean = false;
  export let onCancel: () => void = () => {};
  export let onBack: () => void = () => {};
  
  const dispatch = createEventDispatcher();
  
  // Create a default empty inventory item if none is provided
  const defaultItem: InventoryItem = {
    id: 0,
    user_id: userId,
    ingredient_name: '',
    amount: '',
    unit: '',
    category: 'Other',
    location: '',
    expires_at: '',
    notes: ''
  };
  
  // Create a copy for editing
  let editedItem: InventoryItem = item ? { ...item } : { ...defaultItem };
  
  function saveChanges() {
    dispatch('save', editedItem);
    isEditing = false;
  }
  
  function cancelEdit() {
    editedItem = item ? { ...item } : { ...defaultItem };
    isEditing = false;
    dispatch('cancel');
    onCancel();
  }
  
  function goBack() {
    dispatch('back');
  }
</script>

{#if isEditing}
  <div class="inventory-editor">
    <div class="editor-header">
      <button class="back-btn" on:click={goBack}>
        <span class="btn-icon">{@html createIcon('chevron-left', 16)}</span>
        <span>Back</span>
      </button>
      <h3>Edit Inventory Item</h3>
    </div>
    <div class="form-group">
      <label for="name">Name</label>
      <input type="text" id="name" bind:value={editedItem.ingredient_name} />
    </div>
    
    <div class="form-group">
      <label for="amount">Amount</label>
      <input type="text" id="amount" bind:value={editedItem.amount} />
    </div>
    
    <div class="form-group">
      <label for="unit">Unit</label>
      <input type="text" id="unit" bind:value={editedItem.unit} />
    </div>
    
    <div class="form-group">
      <label for="category">Category</label>
      <select id="category" bind:value={editedItem.category}>
        <option value="Produce">Produce</option>
        <option value="Meat">Meat</option>
        <option value="Dairy">Dairy</option>
        <option value="Bakery">Bakery</option>
        <option value="Pantry">Pantry</option>
        <option value="Frozen">Frozen</option>
        <option value="Other">Other</option>
      </select>
    </div>
    
    <div class="editor-actions">
      <button class="cancel-btn" on:click={cancelEdit}>Cancel</button>
      <button class="save-btn" on:click={saveChanges}>Save</button>
    </div>
  </div>
{:else if item}
  <div class="inventory-item">
    <div class="item-details">
      <span class="item-name">{item.ingredient_name}</span>
      <span class="item-amount">{item.amount} {item.unit || ''}</span>
    </div>
    <div class="item-actions">
      <button class="edit-btn" on:click={() => isEditing = true}>
        <span class="btn-icon">{@html createIcon('edit', 16)}</span>
        <span>Edit</span>
      </button>
      <button class="delete-btn" on:click={() => dispatch('delete', item)}>
        <span class="btn-icon">{@html createIcon('delete', 16)}</span>
        <span>Delete</span>
      </button>
    </div>
  </div>
{:else}
  <div class="inventory-item">
    <div class="item-details">
      <span class="item-name">New Inventory Item</span>
    </div>
    <div class="item-actions">
      <button class="edit-btn" on:click={() => isEditing = true}>
        <span class="btn-icon">{@html createIcon('edit', 16)}</span>
        <span>Create</span>
      </button>
    </div>
  </div>
{/if}

<style>
  /* Styling for the editor */
  .inventory-editor {
    background-color: var(--white);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    box-shadow: var(--shadow-md);
    margin-bottom: var(--space-md);
  }
  
  .editor-header {
    display: flex;
    align-items: center;
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .editor-header h3 {
    margin: 0;
    flex: 1;
    text-align: center;
    color: var(--primary);
  }
  
  .back-btn {
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    background-color: var(--light-gray);
    color: var(--dark-gray);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    transition: all var(--transition-fast);
  }
  
  .back-btn:hover {
    background-color: var(--medium-gray);
    color: var(--white);
  }
  
  .form-group {
    margin-bottom: var(--space-sm);
  }
  
  label {
    display: block;
    margin-bottom: var(--space-xs);
    font-weight: 500;
    color: var(--dark);
  }
  
  input, select {
    width: 100%;
    padding: var(--space-sm);
    border: 1px solid var(--light-gray);
    border-radius: var(--radius-sm);
    font-size: var(--text-base);
  }
  
  .editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
    margin-top: var(--space-md);
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
  
  /* Styling for the item display */
  .inventory-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .item-name {
    font-weight: 500;
    color: var(--dark);
  }
  
  .item-amount {
    color: var(--dark-gray);
    margin-left: var(--space-sm);
  }
  
  .item-actions {
    display: flex;
    gap: var(--space-xs);
  }
  
  .edit-btn, .delete-btn {
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    border: none;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }
  
  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
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
</style>
