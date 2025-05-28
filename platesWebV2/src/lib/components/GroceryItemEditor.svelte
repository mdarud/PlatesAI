<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { GroceryItem } from '../services/types';
  import { createIcon } from '../utils/icons';
  
  export let item: GroceryItem | null = null;
  export let userId: string = 'default-user';
  export let isEditing: boolean = false;
  export let initialDate: string = '';
  export let onCancel: () => void = () => {};
  export let onBack: () => void = () => {};
  
  const dispatch = createEventDispatcher();
  
  // Create a default empty grocery item if none is provided
  const defaultItem: GroceryItem = {
    id: 0,
    list_id: 0,
    user_id: userId,
    name: '',
    amount: '',
    unit: '',
    category: 'Other',
    scheduled_date: initialDate,
    notes: '',
    checked: false,
    is_checked: false
  };
  
  // Create a copy for editing
  let editedItem: GroceryItem = item ? { ...item } : { ...defaultItem };
  
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
    isEditing = false;
    dispatch('back');
  }
</script>

{#if isEditing}
  <div class="grocery-editor">
    <div class="editor-header">
      <button class="back-btn" on:click={goBack}>
        <span class="btn-icon">{@html createIcon('chevron-left', 16)}</span>
        <span>Back</span>
      </button>
      <h3>Edit Grocery Item</h3>
    </div>
    <div class="form-group">
      <label for="name">Name</label>
      <input type="text" id="name" bind:value={editedItem.name} />
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
    
    <div class="form-group">
      <label for="scheduled_date">Scheduled Date</label>
      <input type="date" id="scheduled_date" bind:value={editedItem.scheduled_date} />
    </div>
    
    <div class="form-group">
      <label for="notes">Notes</label>
      <textarea id="notes" bind:value={editedItem.notes}></textarea>
    </div>
    
    <div class="editor-actions">
      <button class="cancel-btn" on:click={cancelEdit}>Cancel</button>
      <button class="save-btn" on:click={saveChanges}>Save</button>
    </div>
  </div>
{:else if item}
  <div class="grocery-item">
    <div class="item-checkbox">
      <input 
        type="checkbox" 
        checked={item.is_checked || item.checked} 
        on:change={(e) => {
          const target = e.target as HTMLInputElement;
          const updatedItem = { 
            ...item, 
            is_checked: target.checked,
            checked: target.checked
          };
          dispatch('check', updatedItem);
        }}
      />
    </div>
    <div class="item-details">
      <span class="item-name">{item.name}</span>
      <span class="item-amount">{item.amount} {item.unit || ''}</span>
      {#if item.scheduled_date}
        <span class="item-date">
          {new Date(item.scheduled_date).toLocaleDateString()}
        </span>
      {/if}
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
  <div class="grocery-item">
    <div class="item-details">
      <span class="item-name">New Grocery Item</span>
      {#if initialDate}
        <span class="item-date">
          {new Date(initialDate).toLocaleDateString()}
        </span>
      {/if}
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
  .grocery-editor {
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
  .grocery-item {
    display: flex;
    align-items: center;
    padding: var(--space-sm);
    border-bottom: 1px solid var(--light-gray);
  }
  
  .item-checkbox {
    margin-right: var(--space-sm);
  }
  
  .item-checkbox input {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
  
  .item-details {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  
  .item-name {
    font-weight: 500;
    color: var(--dark);
  }
  
  .item-amount {
    color: var(--dark-gray);
  }
  
  .item-date {
    color: var(--primary);
    font-size: var(--text-sm);
    background-color: var(--primary-light);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    color: var(--white);
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
